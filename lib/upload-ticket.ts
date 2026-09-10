import { createSigner } from "./hmac";

/**
 * A short-lived, single-photo permission to push one original to the home
 * server.
 *
 * The receiver sits on the public internet (behind Tailscale Funnel) and has
 * no view of guest sessions, so it needs something it can check on its own.
 * A static token would have to ship to the browser and would then be a
 * permanent write credential for anyone who read the page source; this is
 * bound to one photo id and expires, so the worst a leaked one buys is the
 * ability to store a single file that we were already expecting.
 *
 * ORIGINALS_UPLOAD_SECRET is shared with that container and nothing else.
 * ADMIN_SESSION_SECRET deliberately is not — see `hmac.ts`.
 */

const tickets = createSigner("ORIGINALS_UPLOAD_SECRET");

/** Long enough to survive a slow upload on venue wifi, short enough to matter. */
export const TICKET_TTL_SECONDS = 30 * 60;

const payload = (photoId: string, expiresAt: string) =>
  `original:${photoId}:${expiresAt}`;

export async function createUploadTicket(photoId: string) {
  const expiresAt = String(Date.now() + TICKET_TTL_SECONDS * 1000);
  const signature = await tickets.sign(payload(photoId, expiresAt));
  return `${photoId}.${expiresAt}.${signature}`;
}

/**
 * The photo id a ticket authorises, or null.
 *
 * The receiver has its own copy of this check, in the homelab repo at
 * `stacks/wedding-photo-receiver/server.mjs`. Different repos on different
 * machines, so the two cannot share a file: if this format ever changes, both
 * sides change together or uploads start failing with nothing useful in either
 * log.
 */
export async function readUploadTicket(
  ticket: string | undefined,
): Promise<string | null> {
  if (!ticket) return null;

  const [photoId, expiresAt, signature] = ticket.split(".");
  if (!photoId || !expiresAt || !signature) return null;

  if (!(await tickets.verify(payload(photoId, expiresAt), signature))) {
    return null;
  }

  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || Date.now() >= expiry) return null;

  return photoId;
}
