import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Json } from "./database.types";
import { supabase } from "./supabase";

/**
 * The API behind Aaronpardy and Bride Quest (`public/aaronpardy/`,
 * `public/bride-quest/`).
 *
 * The games were written as claude.ai artifacts. `public/games/shim.js` stands
 * in for that runtime and talks to `/api/<game>/…`, which lands here. They came
 * with a small Node server of their own; this is its contract on Supabase
 * instead of on a disk, so the games run on the site rather than on a box that
 * has to be awake:
 *
 *   GET    whoami           -> { role }
 *   GET    db?since=&c=     -> { version, docs, content } or { version, unchanged, content }
 *   PUT    db/<path>        -> { version }       body: a JSON object
 *   DELETE db/<path>        -> { version }
 *   GET    content          -> the saved content, or 404 (the page holds the original)
 *   POST   content          -> { ok }            owner only
 *   POST   assets           -> { id, uploadUrl } body: { type, size }
 *   GET    assets/<id>      -> 302 to the file in the public bucket
 *
 * Two departures from that server, both because this runs on Vercel:
 *
 * **No long-poll.** The server held a `db` read open until something changed.
 * A function has no way to hear about a write made on another instance, so
 * every read answers at once and the shim, seeing an immediate answer, polls
 * every 1.5 s instead. An unchanged poll is two numbers, not the whole state.
 *
 * **Uploads skip the function.** Vercel caps a request body at 4.5 MB and a
 * groom's video is up to 20. `POST assets` hands back a one-time upload URL and
 * the shim PUTs the bytes straight to Storage; the bucket enforces the size and
 * the types. Reads redirect to the public bucket for the same reason, and
 * because Storage already answers the byte ranges iOS needs to play video.
 *
 * No per-IP rate limits, which the server had. Everything that writes needs a
 * key, and the limits that bound the damage a key holder can do (document
 * count and size, content size, file size) are all enforced.
 */

export const PARTY_GAMES = {
  // Aaronpardy plays on one laptop with no key; only the groom's edits and
  // videos need one.
  aaronpardy: { db: "owner", upload: "owner" },
  "bride-quest": { db: "party", upload: "party" },
} as const satisfies Record<string, { db: Role; upload: Role }>;

export type PartyGame = keyof typeof PARTY_GAMES;
type Role = "none" | "party" | "owner";

const RANK: Record<Role, number> = { none: 0, party: 1, owner: 2 };

export const PARTY_GAME_BUCKET = "party-game-assets";

const LIMITS = {
  docBytes: 64 * 1024,
  docs: 2000,
  contentBytes: 2 * 1024 * 1024,
  assetBytes: 25 * 1024 * 1024,
  history: 50,
};

/** Mirrored by the bucket's allowed types in `scripts/provision-buckets.mjs`. */
export const PARTY_GAME_ASSET_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

const SEGMENT = /^[A-Za-z0-9_.~:@+-]{1,200}$/;

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

const digest = (value: string) => createHash("sha256").update(value).digest();

/**
 * Read per request, not at import, so a missing key fails the request that
 * needed it rather than the build.
 */
function keys() {
  const owner = process.env.PARTY_GAMES_OWNER_KEY ?? "";
  const party = process.env.PARTY_GAMES_PARTY_KEY ?? "";
  if (owner.length < 16) throw new Error("PARTY_GAMES_OWNER_KEY must be 16+ random characters.");
  if (party && (party.length < 12 || party === owner)) {
    throw new Error("PARTY_GAMES_PARTY_KEY must be 12+ characters and differ from the owner key.");
  }
  return { owner: digest(owner), party: party ? digest(party) : null };
}

/** Hashed first so the comparison is constant-time whatever the lengths. */
function roleOf(request: Request): Role {
  const key = request.headers.get("x-game-key");
  if (!key) return "none";
  const { owner, party } = keys();
  const given = digest(key);
  if (timingSafeEqual(given, owner)) return "owner";
  if (party && timingSafeEqual(given, party)) return "party";
  return "none";
}

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

const NO_STORE = { "Cache-Control": "no-store" };

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: NO_STORE });

/** The shim turns the status into the error code the pages handle; the text is for people. */
const fail = (status: number, error: string) => json({ error }, status);

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function readObject(request: Request, limit: number): Promise<Record<string, unknown>> {
  const declared = Number(request.headers.get("content-length"));
  if (declared > limit) throw new HttpError(413, "too large");
  const body = await request.arrayBuffer();
  if (body.byteLength > limit) throw new HttpError(413, "too large");

  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(body));
  } catch {
    throw new HttpError(400, "invalid JSON");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "expected a JSON object");
  }
  return value as Record<string, unknown>;
}

/** 2 to 8 segments, an even count (collection/doc pairs), same rule as the shim. */
function docPath(segments: string[]): string | null {
  if (segments.length < 2 || segments.length > 8 || segments.length % 2) return null;
  if (!segments.every((s) => SEGMENT.test(s) && s !== "." && s !== "..")) return null;
  return segments.join("/");
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function readState(game: PartyGame, since: string | null, seenContent: string | null) {
  const { data: head, error } = await supabase
    .from("party_game_state")
    .select("version, content_stamp")
    .eq("game", game)
    .single();
  if (error) throw error;

  const unchanged =
    since !== null &&
    Number(since) === head.version &&
    (seenContent === null || Number(seenContent) === head.content_stamp);
  if (unchanged) {
    return { version: head.version, unchanged: true, content: head.content_stamp };
  }

  const { data, error: docsError } = await supabase
    .from("party_game_state")
    .select("version, docs, content_stamp")
    .eq("game", game)
    .single();
  if (docsError) throw docsError;
  return { version: data.version, docs: data.docs, content: data.content_stamp };
}

async function handle(game: PartyGame, request: Request, path: string[]): Promise<Response> {
  const config = PARTY_GAMES[game];
  const role = roleOf(request);
  const can = (needed: Role) => RANK[role] >= RANK[needed];
  const url = new URL(request.url);
  const method = request.method;
  const [head, ...rest] = path;

  if (head === "whoami" && !rest.length && method === "GET") {
    return json({ role });
  }

  if (head === "db") {
    if (!can(config.db)) return fail(401, "key required");

    if (!rest.length && method === "GET") {
      return json(await readState(game, url.searchParams.get("since"), url.searchParams.get("c")));
    }

    const doc = docPath(rest);
    if (!doc) return fail(400, "bad document path");

    if (method === "PUT") {
      const data = await readObject(request, LIMITS.docBytes);
      const { data: version, error } = await supabase.rpc("party_game_put_doc", {
        p_game: game,
        p_path: doc,
        p_data: data as Json,
        p_max_docs: LIMITS.docs,
      });
      if (error) throw error;
      if (version === null) return fail(507, "too many documents");
      return json({ version });
    }
    if (method === "DELETE") {
      const { data: version, error } = await supabase.rpc("party_game_delete_doc", {
        p_game: game,
        p_path: doc,
      });
      if (error) throw error;
      return json({ version });
    }
  }

  if (head === "content" && !rest.length) {
    if (method === "GET") {
      const { data, error } = await supabase
        .from("party_game_state")
        .select("content")
        .eq("game", game)
        .single();
      if (error) throw error;
      return data.content === null
        ? fail(404, "no saved content; the page holds the original")
        : json(data.content);
    }
    if (method === "POST") {
      if (!can("owner")) return fail(401, "owner key required");
      const content = await readObject(request, LIMITS.contentBytes);
      const { error } = await supabase.rpc("party_game_save_content", {
        p_game: game,
        p_content: content as Json,
        p_keep: LIMITS.history,
      });
      if (error) throw error;
      return json({ ok: true });
    }
  }

  if (head === "assets" && !rest.length && method === "POST") {
    if (!can(config.upload)) return fail(401, "key required");
    // Anything that isn't the shim asking for an upload URL is someone trying
    // to post bytes here directly, which the server answered with 415 for any
    // type it wouldn't store.
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      return fail(415, "unsupported type");
    }
    const { type, size } = await readObject(request, 1024);
    if (typeof type !== "string" || !PARTY_GAME_ASSET_TYPES.includes(type)) {
      return fail(415, "unsupported type");
    }
    if (typeof size !== "number" || size <= 0) return fail(400, "size required");
    if (size > LIMITS.assetBytes) return fail(413, "too large");

    // 128 random bits: the files are public to anyone holding the id, because
    // an <img> or <video> can't send a key.
    const id = randomBytes(16).toString("hex");
    const { data, error } = await supabase.storage
      .from(PARTY_GAME_BUCKET)
      .createSignedUploadUrl(`${game}/${id}`);
    if (error) throw error;
    return json({ id, uploadUrl: data.signedUrl }, 201);
  }

  if (head === "assets" && rest.length === 1 && (method === "GET" || method === "HEAD")) {
    const [id] = rest;
    if (!/^[a-f0-9]{32}$/.test(id)) return fail(404, "not found");
    const { data } = supabase.storage.from(PARTY_GAME_BUCKET).getPublicUrl(`${game}/${id}`);
    return new Response(null, {
      status: 302,
      // An id never points at different bytes, so the redirect can be kept forever.
      headers: { Location: data.publicUrl, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  }

  return fail(404, "not found");
}

type RouteContext = { params: Promise<{ path: string[] }> };

/** Every method a game's route file exports, bound to that game. */
export function partyGameRoutes(game: PartyGame) {
  const route = async (request: Request, { params }: RouteContext) => {
    try {
      return await handle(game, request, (await params).path);
    } catch (error) {
      if (error instanceof HttpError) return fail(error.status, error.message);
      // 5xx reads as "unavailable" to the shim, which keeps the write queued
      // on the phone and retries.
      console.error(`party games (${game}):`, error);
      return fail(500, "server error");
    }
  };
  return { GET: route, HEAD: route, PUT: route, POST: route, DELETE: route };
}
