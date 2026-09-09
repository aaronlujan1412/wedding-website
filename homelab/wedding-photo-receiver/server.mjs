#!/usr/bin/env node
/**
 * Receives full-resolution wedding photo originals straight from guests'
 * browsers and writes them to disk.
 *
 * The website only ever stores 2048px copies in Supabase; the untouched file
 * comes here instead, so a hosted storage tier is never the limit on keeping
 * full-resolution photographs of a day that happens once.
 *
 * Deliberately dependency-free — node: builtins only. Nothing to install,
 * nothing to audit, nothing to keep patched on a box that gets paused for
 * weeks at a time.
 */

import { createServer } from "node:http";
import { createWriteStream } from "node:fs";
import { access, mkdir, rename, unlink } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";

const PORT = Number(process.env.PORT ?? 8080);
const DIRECTORY = process.env.ORIGINALS_DIR ?? "/originals";
const SECRET = process.env.ORIGINALS_UPLOAD_SECRET;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN;
const MAX_BYTES = Number(process.env.MAX_BYTES ?? 25 * 1024 * 1024);

for (const [name, value] of Object.entries({
  ORIGINALS_UPLOAD_SECRET: SECRET,
  ALLOWED_ORIGIN,
})) {
  if (!value) {
    console.error(`${name} is not set. Refusing to start.`);
    process.exit(1);
  }
}

/* ---------------------------------------------------------------- tickets */

/**
 * Must stay byte-identical to `lib/upload-ticket.ts` in the website repo.
 * Web Crypto rather than node:crypto specifically so the two are the same
 * code, since a silent divergence here looks like "uploads stopped working"
 * with nothing in either log to explain it.
 */
const encoder = new TextEncoder();
let cachedKey;

function hmacKey() {
  cachedKey ??= crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return cachedKey;
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="), "base64");
}

async function readTicket(ticket) {
  if (!ticket) return null;

  const [photoId, expiresAt, signature] = String(ticket).split(".");
  if (!photoId || !expiresAt || !signature) return null;

  let valid;
  try {
    valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      fromBase64Url(signature),
      encoder.encode(`original:${photoId}:${expiresAt}`),
    );
  } catch {
    return null;
  }
  if (!valid) return null;

  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || Date.now() >= expiry) return null;

  return photoId;
}

/* ------------------------------------------------------------------ paths */

/**
 * The id already comes from a signature we just verified, so this is belt and
 * braces — but the filename is derived from it, and "the input was signed" is
 * a bad reason to skip the check that stops it being `../../etc/something`.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/tiff": "tiff",
};

function extensionFor(contentType, originalName) {
  const fromType = EXTENSIONS[String(contentType).split(";")[0].trim()];
  if (fromType) return fromType;

  let decoded = "";
  try {
    decoded = decodeURIComponent(originalName ?? "");
  } catch {
    decoded = "";
  }
  const fromName = decoded.split(".").pop()?.toLowerCase() ?? "";
  return /^[a-z0-9]{2,5}$/.test(fromName) ? fromName : "bin";
}

/* --------------------------------------------------------------- handlers */

function cors(response) {
  response.setHeader("access-control-allow-origin", ALLOWED_ORIGIN);
  response.setHeader("vary", "origin");
}

function send(response, status, body) {
  cors(response);
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(body));
  response.statusCode = status;
}

async function handleUpload(request, response) {
  const photoId = await readTicket(request.headers["x-upload-ticket"]);
  if (!photoId || !UUID.test(photoId)) {
    response.statusCode = 403;
    return send(response, 403, { ok: false, error: "bad ticket" });
  }

  const declared = Number(request.headers["content-length"] ?? 0);
  if (declared > MAX_BYTES) {
    response.statusCode = 413;
    return send(response, 413, { ok: false, error: "too large" });
  }

  const extension = extensionFor(
    request.headers["content-type"],
    request.headers["x-original-name"],
  );
  const destination = join(DIRECTORY, `${photoId}.${extension}`);
  const partial = `${destination}.part`;

  // One ticket, one file. A retry that already succeeded is not an error.
  try {
    await access(destination);
    response.statusCode = 200;
    return send(response, 200, { ok: true, already: true });
  } catch {
    // Not there yet, which is the normal path.
  }

  await mkdir(DIRECTORY, { recursive: true });

  let written = 0;
  request.on("data", (chunk) => {
    written += chunk.length;
    if (written > MAX_BYTES) request.destroy(new Error("too large"));
  });

  try {
    // Written aside and renamed, so an interrupted upload never leaves a
    // truncated file sitting where a complete one is supposed to be.
    await pipeline(request, createWriteStream(partial));
    await rename(partial, destination);
  } catch (error) {
    await unlink(partial).catch(() => {});
    response.statusCode = 400;
    return send(response, 400, { ok: false, error: String(error?.message ?? error) });
  }

  console.log(`stored ${photoId}.${extension} (${written} bytes)`);
  response.statusCode = 201;
  return send(response, 201, { ok: true, bytes: written });
}

createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? "/", "http://receiver.invalid");

  if (request.method === "OPTIONS") {
    cors(response);
    response.setHeader("access-control-allow-methods", "POST, OPTIONS");
    response.setHeader(
      "access-control-allow-headers",
      "content-type, x-upload-ticket, x-original-name",
    );
    response.setHeader("access-control-max-age", "86400");
    response.statusCode = 204;
    return response.end();
  }

  if (request.method === "GET" && pathname === "/health") {
    response.statusCode = 200;
    return send(response, 200, { ok: true });
  }

  if (request.method === "POST" && pathname === "/upload") {
    try {
      return await handleUpload(request, response);
    } catch (error) {
      console.error("upload failed:", error);
      response.statusCode = 500;
      return send(response, 500, { ok: false });
    }
  }

  response.statusCode = 404;
  return send(response, 404, { ok: false });
}).listen(PORT, () => {
  console.log(`receiver on :${PORT}, writing to ${DIRECTORY}`);
  console.log(`accepting cross-origin uploads from ${ALLOWED_ORIGIN}`);
});
