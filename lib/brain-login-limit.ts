import "server-only";

import { supabase } from "./supabase";
import { fingerprint } from "./rate-limit";

/**
 * Throttle for SecondBrain sign-ins.
 *
 * Callers are identified the same way the RSVP throttle identifies them — an
 * HMAC of the IP, never the IP — so this is something to count against rather
 * than a log of who visited.
 *
 * Two deliberate differences from `rate-limit.ts`, both because of what is
 * behind this gate rather than that one:
 *
 * **It fails closed.** The RSVP throttle fails open on purpose: a broken
 * throttle must not lock a household out of their own RSVP, and there is still
 * a last-four check behind it. Here a database that will not answer means the
 * counter is not counting, and a gate with no counter in front of the whole
 * vault is worse than a sign-in that says try again shortly.
 *
 * **Five attempts, not ten.** The RSVP gate is four digits — 10,000
 * combinations, so it has to be grindable-but-slow. A password has no such
 * ceiling, so the only job here is to make online guessing pointless. Somebody
 * typing their own password gets five tries, which is plenty.
 */

const WINDOW_MINUTES = 15;
const MAX_FAILURES = 5;

/** Rows older than this are swept opportunistically on the next failure. */
const RETENTION_MINUTES = WINDOW_MINUTES * 4;

export type LoginLimit =
  | { ok: true; caller: string }
  | { ok: false; retryAfterMinutes: number };

export async function checkLoginLimit(): Promise<LoginLimit> {
  const caller = await fingerprint();
  const windowStart = new Date(
    Date.now() - WINDOW_MINUTES * 60_000,
  ).toISOString();

  const { data, error } = await supabase
    .from("brain_login_attempts")
    .select("created_at")
    .eq("fingerprint", caller)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: true });

  // Closed, not open. See the note above.
  if (error || !data) return { ok: false, retryAfterMinutes: 1 };
  if (data.length < MAX_FAILURES) return { ok: true, caller };

  const oldest = new Date(data[0].created_at).getTime();
  const clearsAt = oldest + WINDOW_MINUTES * 60_000;
  return {
    ok: false,
    retryAfterMinutes: Math.max(1, Math.ceil((clearsAt - Date.now()) / 60_000)),
  };
}

export async function recordLoginFailure(caller: string) {
  await supabase.from("brain_login_attempts").insert({ fingerprint: caller });

  // Swept here rather than on a schedule: this only runs on a failed attempt,
  // which should be rare, and it keeps the table from growing without bound.
  await supabase
    .from("brain_login_attempts")
    .delete()
    .lt(
      "created_at",
      new Date(Date.now() - RETENTION_MINUTES * 60_000).toISOString(),
    );
}

/**
 * Clears a caller's failures after a successful sign-in, so a few typos
 * followed by the right password doesn't leave the next visit half-throttled.
 */
export async function clearLoginFailures(caller: string) {
  await supabase
    .from("brain_login_attempts")
    .delete()
    .eq("fingerprint", caller);
}
