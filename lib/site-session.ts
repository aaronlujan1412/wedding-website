/**
 * Stateless session for /me — the whole site, not one tool on it.
 *
 * Mirrors `guest-session.ts`: an id, an expiry, and an HMAC over both, so the
 * cookie carries who you are without a session table to keep in step.
 *
 * Two things make it its own module rather than a third caller of the shared
 * signer:
 *
 * 1. **A separate secret.** `hmac.ts` binds signers to a named env var because
 *    the secrets have different blast radii. `ADMIN_SESSION_SECRET` signs the
 *    wedding host cookie; anyone holding it could otherwise mint a session
 *    here, and what is behind this gate is the whole vault, Personal/
 *    included. Different key material is the only way to guarantee one can
 *    never forge the other.
 *
 *    Two names are accepted while `BRAIN_SESSION_SECRET` is retired in favour
 *    of `SITE_SESSION_SECRET` — the login stopped being the brain's when /me
 *    became the hub for everything. Drop the old name from the host once it is
 *    no longer set anywhere.
 *
 * 2. **A version.** The token carries the user's `token_version`, so bumping
 *    that column signs every one of their sessions out at once. The wedding
 *    cookies have no equivalent — with a shared passphrase there is nobody in
 *    particular to revoke.
 *
 * Web Crypto only, like the rest of the session code, so this runs inside
 * `proxy.ts`. It proves the cookie is genuine and unexpired, which is what a
 * gate needs. Whether the version is still current takes a database read, and
 * that lives in `site-user.ts`.
 */

import { createSigner } from "./hmac";

const { sign, verify } = createSigner([
  "SITE_SESSION_SECRET",
  "BRAIN_SESSION_SECRET",
]);

export const SITE_COOKIE = "me_session";

/**
 * Seconds. Two weeks: short enough that a forgotten laptop stops being a way
 * in fairly soon, long enough not to be signing in every visit. Deliberately
 * far shorter than the wedding's 30 and 180 days — those gate a guest list and
 * a photo album.
 */
export const SITE_SESSION_MAX_AGE = 60 * 60 * 24 * 14;

/**
 * Domain separator, so no other signed value can be replayed as a session.
 *
 * Still `brain:` rather than `me:`. The prefix is baked into every cookie that
 * has already been issued, and changing it would sign everyone out for no gain
 * — it only has to be unique among the things this key signs, not descriptive.
 */
const scope = (userId: string, version: number, expiresAt: string) =>
  `brain:${userId}:${version}:${expiresAt}`;

export type SessionToken = { userId: string; version: number };

export async function createSiteToken(userId: string, version: number) {
  const expiresAt = String(Date.now() + SITE_SESSION_MAX_AGE * 1000);
  const signature = await sign(scope(userId, version, expiresAt));
  return `${userId}.${version}.${expiresAt}.${signature}`;
}

/**
 * The signed-in user id and token version, or null for a missing, forged or
 * expired cookie.
 *
 * Says nothing about whether that user still exists or whether the version is
 * current — `site-user.ts` answers both, against the database.
 */
export async function readSiteToken(
  token: string | undefined,
): Promise<SessionToken | null> {
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
