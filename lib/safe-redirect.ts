/** The wedding's hub. Signing in with no explicit target lands there. */
const FALLBACK = "/hosts";
const PROBE_ORIGIN = "http://internal.invalid";

/**
 * Reduces an untrusted `?next=` value to a same-origin path, or falls back.
 *
 * A `startsWith("/")` check is not enough: browsers normalise backslashes, so
 * `/\evil.com` resolves to a different host entirely. Resolving against a
 * throwaway origin catches that and every related trick, since any of them
 * change the origin.
 *
 * `fallback` is where an unusable value lands. It defaults to the wedding's
 * hub; the SecondBrain login passes its own, since dropping someone from a
 * brain sign-in onto the wedding's host page would be a confusing answer to a
 * mangled URL.
 */
export function safeRedirectPath(next: unknown, fallback = FALLBACK): string {
  const value = typeof next === "string" ? next : "";
  if (!value.startsWith("/")) return fallback;

  let path: string;
  try {
    const resolved = new URL(value, PROBE_ORIGIN);
    if (resolved.origin !== PROBE_ORIGIN) return fallback;
    path = resolved.pathname + resolved.search;
  } catch {
    return fallback;
  }

  // "/..//evil.com" stays same-origin but leaves a "//" path, which a browser
  // reads as protocol-relative once it lands in a Location header.
  return path.startsWith("//") ? fallback : path;
}
