/**
 * Stateless helper session, issued for the helpers' four-digit code. It
 * proves "this browser was given the code", which is what unlocks who's who:
 * the photos of family and friends on the photographers' and coordinator's
 * helper pages.
 *
 * Mirrors `admin-session.ts`, and is signed with the same secret, so the
 * signed message carries a scope. Without one a helper's token would BE a
 * host token under a different cookie name — the host session signs the bare
 * expiry — and four digits would open the guest ledger.
 */

import { sign, verify } from "./hmac";

export const HELPER_COOKIE = "wedding_helper";

/**
 * Seconds. Long enough that whoever enters it now still has it on the day:
 * someone unlocking in early November shouldn't be asked again on December 1.
 */
export const HELPER_SESSION_MAX_AGE = 60 * 60 * 24 * 60;

const scope = (expiresAt: string) => `helper:${expiresAt}`;

export async function createHelperToken() {
  const expiresAt = String(Date.now() + HELPER_SESSION_MAX_AGE * 1000);
  return `${expiresAt}.${await sign(scope(expiresAt))}`;
}

export async function isValidHelperToken(token: string | undefined) {
  if (!token) return false;

  const [expiresAt, signature] = token.split(".");
  if (!expiresAt || !signature) return false;

  if (!(await verify(scope(expiresAt), signature))) return false;

  const expiry = Number(expiresAt);
  return Number.isFinite(expiry) && Date.now() < expiry;
}
