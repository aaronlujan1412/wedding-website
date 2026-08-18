/**
 * Stateless host session: an expiry timestamp plus an HMAC of that timestamp.
 * Nothing is stored server-side, and the cookie can't be forged without the
 * secret — which is the whole point, since a plain `host=true` cookie would be
 * trivial for anyone to set by hand.
 *
 * Deliberately uses Web Crypto only (never `node:crypto`) so the exact same
 * code runs inside `proxy.ts` as well as in server actions.
 */

export const HOST_COOKIE = "wedding_host";

/** Seconds. Long enough that they aren't re-entering it every visit. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

const encoder = new TextEncoder();

async function hmacKey() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "ADMIN_SESSION_SECRET is not set — host sessions cannot be signed or verified.",
    );
  }
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toBase64Url(bytes: ArrayBuffer) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

export async function createSessionToken() {
  const expiresAt = String(Date.now() + SESSION_MAX_AGE * 1000);
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(),
    encoder.encode(expiresAt),
  );
  return `${expiresAt}.${toBase64Url(signature)}`;
}

export async function isValidSessionToken(token: string | undefined) {
  if (!token) return false;

  const [expiresAt, signature] = token.split(".");
  if (!expiresAt || !signature) return false;

  // Fetched outside the try so a missing secret fails loudly rather than
  // silently reading as "not signed in".
  const key = await hmacKey();

  let signed: boolean;
  try {
    // `subtle.verify` does the comparison in constant time.
    signed = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signature),
      encoder.encode(expiresAt),
    );
  } catch {
    // Malformed base64 from a hand-crafted cookie.
    return false;
  }
  if (!signed) return false;

  const expiry = Number(expiresAt);
  return Number.isFinite(expiry) && Date.now() < expiry;
}
