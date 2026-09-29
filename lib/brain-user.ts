import "server-only";

import { cookies } from "next/headers";
import { supabase } from "./supabase";
import { BRAIN_COOKIE, readBrainToken } from "./brain-session";

/**
 * Who is signed in to the SecondBrain, according to the database.
 *
 * Deliberately NOT in a `"use server"` module. Every export of one of those
 * becomes a callable POST endpoint, and this one answers "who is signed in" —
 * exactly the shape of thing that should not be reachable from outside. It is
 * called from server components and from the top of server actions, so a plain
 * module keeps it off the action manifest entirely.
 *
 * The split from `brain-session.ts` is the same one the wedding makes between
 * `proxy.ts` and its actions: the proxy verifies a signature and nothing else,
 * because it runs on every matched request and cannot reach the database. This
 * is the layer that knows whether the account still exists and whether the
 * session has been revoked since.
 */

export type BrainUser = {
  id: string;
  username: string;
};

/**
 * The signed-in user, or null.
 *
 * Returns null rather than throwing for every failure — no cookie, a forged
 * one, a deleted account, a revoked session. A page renders the signed-out
 * view; an action returns its denial. Neither wants an exception.
 */
export async function currentBrainUser(): Promise<BrainUser | null> {
  const store = await cookies();
  const token = await readBrainToken(store.get(BRAIN_COOKIE)?.value);
  if (!token) return null;

  const { data, error } = await supabase
    .from("brain_users")
    .select("id, username, token_version")
    .eq("id", token.userId)
    .maybeSingle();

  if (error || !data) return null;

  // The revocation check. A cookie signed before the version was bumped is
  // still cryptographically valid — this is what makes it stop working.
  if (data.token_version !== token.version) return null;

  return { id: data.id, username: data.username };
}

/** Sugar for the guard at the top of a server action. */
export async function requireBrainUser(): Promise<BrainUser | null> {
  return currentBrainUser();
}

/**
 * Best-effort "last seen" stamp. Never awaited by a page render and never
 * allowed to fail a request: it exists so an unexpected sign-in is visible
 * afterwards, which is worth nothing if it can take the page down.
 */
export async function touchBrainUser(userId: string) {
  await supabase
    .from("brain_users")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", userId);
}
