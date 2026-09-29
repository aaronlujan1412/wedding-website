/**
 * Stateless session for the SecondBrain section of /me.
 *
 * Mirrors `guest-session.ts`: an id, an expiry, and an HMAC over both, so the
 * cookie carries who you are without a session table to keep in step.
 *
 * Two things make it its own module rather than a third caller of the shared
 * signer:
 *
 * 1. **A separate secret.** `hmac.ts` binds signers to a named env var because
 *    the secrets have different blast radii. `ADMIN_SESSION_SECRET` signs the
 *    wedding host cookie; anyone holding it could otherwise mint a brain
 *    session, and what is behind this gate is the whole vault, Personal/
 *    included. Different key material is the only way to guarantee one can
 *    never forge the other.
 *
 * 2. **A version.** The token carries the user's `token_version`, so bumping
 *    that column signs every one of their sessions out at once. The wedding
 *    cookies have no equivalent — with a shared passphrase there is nobody in
 *    particular to revoke.
 *
 * Web Crypto only, like the rest of the session code, so this runs inside
 * `proxy.ts`. It proves the cookie is genuine and unexpired, which is what a
 * gate needs. Whether the version is still current takes a database read, and
 * that lives in `brain-user.ts`.
 */

import { createSigner } from "./hmac";

const { sign, verify } = createSigner("BRAIN_SESSION_SECRET");

export const BRAIN_COOKIE = "brain_session";

/**
 * Seconds. Two weeks: short enough that a forgotten laptop stops being a way
 * in fairly soon, long enough not to be signing in every visit. Deliberately
 * far shorter than the wedding's 30 and 180 days — those gate a guest list and
 * a photo album.
 */
export const BRAIN_SESSION_MAX_AGE = 60 * 60 * 24 * 14;

/** Domain separator, so no other signed value can be replayed as a session. */
const scope = (userId: string, version: number, expiresAt: string) =>
  `brain:${userId}:${version}:${expiresAt}`;

export type BrainToken = { userId: string; version: number };

export async function createBrainToken(userId: string, version: number) {
  const expiresAt = String(Date.now() + BRAIN_SESSION_MAX_AGE * 1000);
  const signature = await sign(scope(userId, version, expiresAt));
  return `${userId}.${version}.${expiresAt}.${signature}`;
}

/**
 * The signed-in user id and token version, or null for a missing, forged or
 * expired cookie.
 *
 * Says nothing about whether that user still exists or whether the version is
 * current — `brain-user.ts` answers both, against the database.
 */
export async function readBrainToken(
  token: string | undefined,
): Promise<BrainToken | null> {
  if (!token) return null;

  const [userId, rawVersion, expiresAt, signature] = token.split(".");
  if (!userId || !rawVersion || !expiresAt || !signature) return null;

  const version = Number(rawVersion);
  if (!Number.isInteger(version) || version < 1) return null;

  if (!(await verify(scope(userId, version, expiresAt), signature))) {
    return null;
  }

  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || Date.now() >= expiry) return null;

  return { userId, version };
}
