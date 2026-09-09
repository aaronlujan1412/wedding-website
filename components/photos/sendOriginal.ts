import { ORIGINALS_ENDPOINT } from "@/lib/photo-config";

/**
 * Pushes one untouched file straight from the browser to the home server.
 *
 * Raw body rather than multipart: there is exactly one file and the receiver
 * is ours, so parsing form boundaries on the other end buys nothing.
 */

/** Give up rather than hang a background task on a home server that is asleep. */
const TIMEOUT_MS = 90_000;

export async function sendOriginalHome(file: File, ticket: string) {
  if (!ORIGINALS_ENDPOINT) return false;

  try {
    const response = await fetch(
      `${ORIGINALS_ENDPOINT.replace(/\/+$/, "")}/upload`,
      {
        method: "POST",
        headers: {
          "content-type": file.type || "application/octet-stream",
          "x-upload-ticket": ticket,
          "x-original-name": encodeURIComponent(file.name),
        },
        body: file,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    return response.ok;
  } catch {
    // Asleep, paused before a gaming session, mid-reboot, or the guest's
    // network dropped. Every one of those means "use the fallback".
    return false;
  }
}
