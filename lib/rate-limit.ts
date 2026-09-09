import "server-only";

import { headers } from "next/headers";
import { supabase } from "./supabase";
import { sign } from "./hmac";

/**
 * Throttle for the last-four-of-phone check.
 *
 * Group names and ids are public — the RSVP picker needs them — and four
 * digits is 10,000 combinations, so without this the gate is grindable by
 * anyone patient. At these settings a full sweep would take about ten days of
 * sustained requests instead of a few minutes.
 *
 * Only failures count. Getting it right costs a caller nothing, so a household
 * re-opening the RSVP dialog five times never trips it.
 */

const WINDOW_MINUTES = 15;
const MAX_FAILURES = 10;

/** Rows older than this are swept opportunistically on the next failure. */
const RETENTION_MINUTES = WINDOW_MINUTES * 4;

/**
 * An HMAC of the caller's IP rather than the IP itself: enough to count
 * against, not enough to be a log of who visited the site.
 */
async function fingerprint() {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || list.get("x-real-ip") || "unknown";
  return sign(`rate-limit:${ip}`);
}

export type LimitCheck =
  | { ok: true; caller: string }
  | { ok: false; retryAfterMinutes: number };

export async function checkVerificationLimit(): Promise<LimitCheck> {
  const caller = await fingerprint();
  const windowStart = new Date(
    Date.now() - WINDOW_MINUTES * 60_000,
  ).toISOString();

  const { data, error } = await supabase
    .from("verification_attempts")
    .select("created_at")
    .eq("fingerprint", caller)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: true });

  // Fail open on purpose. A throttle that breaks must not lock every guest out
  // of their own RSVP — the last-four check is still there behind it, and a
  // wedding site losing Supabase has bigger problems than brute force.
  if (error || !data) return { ok: true, caller };
  if (data.length < MAX_FAILURES) return { ok: true, caller };

  const oldest = new Date(data[0].created_at).getTime();
  const clearsAt = oldest + WINDOW_MINUTES * 60_000;
  return {
    ok: false,
    retryAfterMinutes: Math.max(1, Math.ceil((clearsAt - Date.now()) / 60_000)),
  };
}

export async function recordVerificationFailure(caller: string) {
  await supabase.from("verification_attempts").insert({ fingerprint: caller });

  // Sweep here rather than on a schedule: this only runs on a failed attempt,
  // which is rare, and it keeps the table from growing without bound.
  await supabase
    .from("verification_attempts")
    .delete()
    .lt(
      "created_at",
      new Date(Date.now() - RETENTION_MINUTES * 60_000).toISOString(),
    );
}
