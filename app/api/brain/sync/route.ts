import { supabase } from "@/lib/supabase";

/**
 * Where the homelab box publishes the SecondBrain vault.
 *
 * The RAG service is bound to the tailnet on purpose, so this site cannot call
 * it. The traffic runs the other way, the same shape as the lodging finder
 * pushing to /api/lodging-proposals — and for the same reason: a token that can
 * only write notes is a far smaller thing to lose than SUPABASE_SECRET_KEY,
 * which reads the guest list too.
 *
 * Two modes, because two things happen:
 *
 *   upsert     A note changed. The watcher on the box sees it and sends that
 *              one note. Small, immediate, the common case.
 *
 *   check      One hash standing for the whole mirror. Matching means there is
 *              nothing to do, and the exchange is two small JSON objects. This
 *              is what makes a frequent timer affordable: without it every
 *              check ships a 300KB manifest to be told nothing changed.
 *
 *   reconcile  A manifest of every path and its hash. The answer says which
 *              bodies this side is missing or holds a stale copy of, and
 *              deletes anything the vault no longer has. This is how a first
 *              load works, and how the mirror recovers from the box being
 *              asleep — an inotify watcher cannot tell you about an edit it
 *              was not running for.
 *
 * Reconcile is deliberately two round trips. Sending every body every time
 * would be 4.2MB against a 4.5MB request ceiling, which is both wasteful and
 * one good note away from breaking.
 */

export const dynamic = "force-dynamic";

/** Caps, so a runaway publisher can't fill the table or the request body. */
const MAX_NOTES_PER_BATCH = 250;
const MAX_MANIFEST = 20_000;
const MAX_BODY_CHARS = 200_000;
const MAX_TAGS = 32;

type IncomingNote = {
  path: string;
  title: string | null;
  body: string;
  tags: string[];
  source: string | null;
  confidence: string | null;
  content_hash: string;
  file_mtime: string | null;
};

const isString = (v: unknown): v is string => typeof v === "string";

/**
 * Checked here rather than trusted. This endpoint is reachable by anything
 * holding the token, and the error a bad row causes otherwise is a Postgres
 * failure with no clue which of 250 notes caused it.
 *
 * Note what is NOT checked: whether a note has frontmatter, a title, tags or a
 * plausible confidence. Those are all nullable by design — the vault is edited
 * by hand and a mirror that rejects a typo is a mirror that silently stops
 * mirroring. Only the things the schema genuinely requires are enforced.
 */
function problemWithNotes(value: unknown): string | null {
  if (!Array.isArray(value)) return "notes must be an array";
  if (value.length === 0) return "notes is empty";
  if (value.length > MAX_NOTES_PER_BATCH) {
    return `too many notes in one batch (max ${MAX_NOTES_PER_BATCH})`;
  }

  for (const [i, note] of value.entries()) {
    if (typeof note !== "object" || note === null) return `note ${i} is not an object`;
    const n = note as Record<string, unknown>;
    const where = `note ${i}${isString(n.path) ? ` (${n.path})` : ""}`;

    const badPath = pathProblem(n.path);
    if (badPath) return `${where}: ${badPath}`;
    if (!isString(n.body)) return `${where} needs a body`;
    if (n.body.length > MAX_BODY_CHARS) return `${where} body is too long`;
    if (!isString(n.content_hash) || !n.content_hash) {
      return `${where} needs a content_hash`;
    }
    if (n.tags !== undefined && n.tags !== null) {
      if (!Array.isArray(n.tags) || !n.tags.every(isString)) {
        return `${where} tags must be strings`;
      }
      if (n.tags.length > MAX_TAGS) return `${where} has too many tags`;
    }
  }
  return null;
}

/**
 * Paths are used as the natural key and rendered in the UI, so they are held to
 * the same shape the table's check constraint enforces — rejected here with a
 * sentence rather than there with a constraint name.
 */
function pathProblem(value: unknown): string | null {
  if (!isString(value) || !value) return "needs a path";
  if (value.startsWith("/")) return "path must be vault-relative";
  if (value.includes("..")) return "path must not climb out of the vault";
  if (value.length > 1024) return "path is too long";
  return null;
}

/** First path segment, or '' for a note at the vault root. */
function bucketOf(path: string): string {
  const cut = path.indexOf("/");
  return cut === -1 ? "" : path.slice(0, cut);
}

async function upsert(notes: IncomingNote[]) {
  const rows = notes.map((n) => ({
    path: n.path,
    bucket: bucketOf(n.path),
    title: n.title ?? null,
    body: n.body,
    tags: n.tags ?? [],
    source: n.source ?? null,
    confidence: n.confidence ?? null,
    content_hash: n.content_hash,
    file_mtime: n.file_mtime ?? null,
    synced_at: new Date().toISOString(),
  }));

  // On path, not id: the box knows a note by where it sits in the vault and has
  // never heard of our uuid.
  const { error } = await supabase
    .from("brain_notes")
    .upsert(rows, { onConflict: "path" });

  if (error) throw new Error(error.message);
  return rows.length;
}

/**
 * Compare the vault against the mirror: which bodies this side needs, and
 * remove what the vault no longer has.
 *
 * One RPC rather than a select and a diff in here, because PostgREST caps a
 * select at 1,000 rows. Diffing in TypeScript meant this saw 1,000 of 3,430
 * notes and asked for the other 2,430 every single tick — a sync that never
 * converged, with no error to notice. The comparison belongs where all the
 * rows are, and going through Postgres also makes the compare and the delete
 * one transaction.
 */
async function reconcile(manifest: { path: string; hash: string }[]) {
  const { data, error } = await supabase.rpc("brain_reconcile", {
    p_manifest: manifest,
  });
  if (error) throw new Error(error.message);

  const result = (data ?? {}) as {
    want?: string[];
    removed?: number;
    held?: number;
  };
  return {
    want: result.want ?? [],
    removed: result.removed ?? 0,
    held: result.held ?? 0,
  };
}

export async function POST(request: Request) {
  const secret = process.env.BRAIN_SYNC_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "body is not JSON" }, { status: 400 });
  }

  const payload = (body ?? {}) as {
    mode?: unknown;
    notes?: unknown;
    manifest?: unknown;
    fingerprint?: unknown;
  };

  try {
    if (payload.mode === "upsert") {
      const problem = problemWithNotes(payload.notes);
      if (problem) return Response.json({ ok: false, error: problem }, { status: 400 });
      const count = await upsert(payload.notes as IncomingNote[]);
      return Response.json({ ok: true, upserted: count });
    }

    if (payload.mode === "check") {
      const { data, error } = await supabase.rpc("brain_fingerprint");
      if (error) throw new Error(error.message);
      return Response.json({
        ok: true,
        fingerprint: data,
        match: isString(payload.fingerprint) && payload.fingerprint === data,
      });
    }

    if (payload.mode === "reconcile") {
      const manifest = payload.manifest;
      if (!Array.isArray(manifest)) {
        return Response.json({ ok: false, error: "manifest must be an array" }, { status: 400 });
      }
      if (manifest.length > MAX_MANIFEST) {
        return Response.json({ ok: false, error: "manifest is too large" }, { status: 400 });
      }
      for (const [i, entry] of manifest.entries()) {
        const e = entry as Record<string, unknown>;
        const badPath = pathProblem(e?.path);
        if (badPath) return Response.json({ ok: false, error: `entry ${i}: ${badPath}` }, { status: 400 });
        if (!isString(e?.hash)) {
          return Response.json({ ok: false, error: `entry ${i} needs a hash` }, { status: 400 });
        }
      }
      const result = await reconcile(manifest as { path: string; hash: string }[]);
      return Response.json({ ok: true, ...result });
    }

    return Response.json(
      { ok: false, error: 'mode must be "check", "upsert" or "reconcile"' },
      { status: 400 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "sync failed";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
