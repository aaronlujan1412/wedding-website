/**
 * Stateless host session: an expiry timestamp plus an HMAC of that timestamp.
 * Nothing is stored server-side, and the cookie can't be forged without the
 * secret — which is the whole point, since a plain `host=true` cookie would be
 * trivial for anyone to set by hand.
 *
 * Signing lives in `lib/hmac.ts` (Web Crypto only, so the same code runs inside
 * `proxy.ts` as well as in server actions). See `guest-session.ts` for the
 * other holder of that secret and why the two can't be confused.
 */

import { sign, verify } from "./hmac";

export const HOST_COOKIE = "wedding_host";

/** Seconds. Long enough that they aren't re-entering it every visit. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export async function createSessionToken() {
  const expiresAt = String(Date.now() + SESSION_MAX_AGE * 1000);
  return `${expiresAt}.${await sign(expiresAt)}`;
}

export async function isValidSessionToken(token: string | undefined) {
  if (!token) return false;

  const [expiresAt, signature] = token.split(".");
  if (!expiresAt || !signature) return false;

  if (!(await verify(expiresAt, signature))) return false;

  const expiry = Number(expiresAt);
  return Number.isFinite(expiry) && Date.now() < expiry;
}
