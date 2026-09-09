/**
 * Shared signing for the site's stateless cookies.
 *
 * Web Crypto only (never `node:crypto`) so the exact same code runs inside
 * `proxy.ts`, in server actions, and in route handlers.
 *
 * The host session and the guest photo session both sign with
 * ADMIN_SESSION_SECRET. They stay distinguishable because each prefixes its
 * payload with its own scope string, so a token minted for one scope is never
 * a valid signature for the other.
 */

const encoder = new TextEncoder();

async function hmacKey() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "ADMIN_SESSION_SECRET is not set — sessions cannot be signed or verified.",
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

export function toBase64Url(bytes: ArrayBuffer) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

export async function sign(message: string) {
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(),
    encoder.encode(message),
  );
  return toBase64Url(signature);
}

export async function verify(message: string, signature: string) {
  // Fetched outside the try so a missing secret fails loudly rather than
  // silently reading as "not signed in".
  const key = await hmacKey();

  try {
    // `subtle.verify` does the comparison in constant time.
    return await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signature),
      encoder.encode(message),
    );
  } catch {
    // Malformed base64 from a hand-crafted cookie.
    return false;
  }
}
