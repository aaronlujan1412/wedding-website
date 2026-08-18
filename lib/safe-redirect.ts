const FALLBACK = "/rsvp-list";
const PROBE_ORIGIN = "http://internal.invalid";

/**
 * Reduces an untrusted `?next=` value to a same-origin path, or falls back.
 *
 * A `startsWith("/")` check is not enough: browsers normalise backslashes, so
 * `/\evil.com` resolves to a different host entirely. Resolving against a
 * throwaway origin catches that and every related trick, since any of them
 * change the origin.
 */
export function safeRedirectPath(next: unknown): string {
  const value = typeof next === "string" ? next : "";
  if (!value.startsWith("/")) return FALLBACK;

  let path: string;
  try {
    const resolved = new URL(value, PROBE_ORIGIN);
    if (resolved.origin !== PROBE_ORIGIN) return FALLBACK;
    path = resolved.pathname + resolved.search;
  } catch {
    return FALLBACK;
  }

  // "/..//evil.com" stays same-origin but leaves a "//" path, which a browser
  // reads as protocol-relative once it lands in a Location header.
  return path.startsWith("//") ? FALLBACK : path;
}
