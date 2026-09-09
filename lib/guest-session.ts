/**
 * Stateless guest session, issued after the same last-four-of-phone check the
 * RSVP flow uses. Proves "this browser belongs to guest group N" so photo
 * uploads can be limited to people actually on the guest list without asking
 * anyone to make an account.
 *
 * Mirrors `admin-session.ts`, but carries the group id rather than being a
 * bare yes/no — the upload needs to know who is posting.
 */

import { sign, verify } from "./hmac";

export const GUEST_COOKIE = "wedding_guest";

/**
 * Seconds. Deliberately long: a guest who verifies while RSVPing in August
 * should not be re-verifying at the reception, and photos keep trickling in
 * for weeks afterwards. Six months covers both sides of the day.
 */
export const GUEST_SESSION_MAX_AGE = 60 * 60 * 24 * 180;

/** Domain separator, so a host token can never be replayed as a guest one. */
const scope = (groupId: number, expiresAt: string) =>
  `guest:${groupId}:${expiresAt}`;

export async function createGuestToken(groupId: number) {
  const expiresAt = String(Date.now() + GUEST_SESSION_MAX_AGE * 1000);
  const signature = await sign(scope(groupId, expiresAt));
  return `${groupId}.${expiresAt}.${signature}`;
}

/** The signed-in group id, or null for a missing, forged or expired cookie. */
export async function readGuestToken(
  token: string | undefined,
): Promise<number | null> {
  if (!token) return null;

  const [rawGroupId, expiresAt, signature] = token.split(".");
  if (!rawGroupId || !expiresAt || !signature) return null;

  const groupId = Number(rawGroupId);
  if (!Number.isInteger(groupId)) return null;

  if (!(await verify(scope(groupId, expiresAt), signature))) return null;

  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || Date.now() >= expiry) return null;

  return groupId;
}
