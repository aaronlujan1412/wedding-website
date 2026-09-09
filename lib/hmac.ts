/**
 * Shared signing for the site's stateless cookies and tickets.
 *
 * Web Crypto only (never `node:crypto`) so the exact same code runs inside
 * `proxy.ts`, in server actions, and in route handlers.
 *
 * Signers are bound to a named secret rather than reading one global, because
 * the secrets have genuinely different blast radii: ADMIN_SESSION_SECRET stays
 * on Vercel and signs the host session, while the upload-ticket secret is also
 * held by a container on the home server. One must never be able to mint the
 * other's tokens, and the cleanest way to guarantee that is to never give the
 * two signers the same key material.
 */

const encoder = new TextEncoder();

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

export function createSigner(variable: string) {
  async function key() {
    const secret = process.env[variable];
    if (!secret) {
      throw new Error(
        `${variable} is not set — those tokens cannot be signed or verified.`,
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

  return {
    async sign(message: string) {
      const signature = await crypto.subtle.sign(
        "HMAC",
        await key(),
        encoder.encode(message),
      );
      return toBase64Url(signature);
    },

    async verify(message: string, signature: string) {
      // Fetched outside the try so a missing secret fails loudly rather than
      // silently reading as "not signed in".
      const hmac = await key();
      try {
        // `subtle.verify` does the comparison in constant time.
        return await crypto.subtle.verify(
          "HMAC",
          hmac,
          fromBase64Url(signature),
          encoder.encode(message),
        );
      } catch {
        // Malformed base64 from a hand-crafted cookie.
        return false;
      }
    },
  };
}

/** The host session and the guest photo session. See `admin-session.ts`. */
const sessions = createSigner("ADMIN_SESSION_SECRET");

export const sign = sessions.sign;
export const verify = sessions.verify;
