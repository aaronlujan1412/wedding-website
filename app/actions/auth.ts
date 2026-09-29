"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  BRAIN_COOKIE,
  BRAIN_SESSION_MAX_AGE,
  createBrainToken,
} from "@/lib/brain-session";
import {
  checkLoginLimit,
  clearLoginFailures,
  recordLoginFailure,
} from "@/lib/brain-login-limit";
import { hashPassword, needsRehash, verifyPassword } from "@/lib/password";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { supabase } from "@/lib/supabase";

export type BrainSignInState = { error: string | null };

/** Where a sign-in with no usable `next` lands. */
const HOME = "/me/brain";

/**
 * One message for every failure.
 *
 * Not politeness — an unknown username and a wrong password have to be
 * indistinguishable, or this form becomes a way to find out which accounts
 * exist.
 */
const REJECTED = "That username and password don't match.";

export async function signInToBrain(
  _previous: BrainSignInState,
  formData: FormData,
): Promise<BrainSignInState> {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  const limit = await checkLoginLimit();
  if (!limit.ok) {
    return {
      error: `Too many attempts. Try again in ${limit.retryAfterMinutes} minute${
        limit.retryAfterMinutes === 1 ? "" : "s"
      }.`,
    };
  }

  if (!username || !password) {
    return { error: REJECTED };
  }

  const { data: user } = await supabase
    .from("brain_users")
    .select("id, password_hash, token_version")
    .eq("username", username)
    .maybeSingle();

  /*
   * Verify even when there is no such user, against a hash that cannot match.
   * Returning early would make a missing account measurably faster than a
   * wrong password, which is the same disclosure the shared error message is
   * there to prevent.
   */
  const stored = user?.password_hash ?? DUMMY_HASH;
  const ok = await verifyPassword(password, stored);

  if (!user || !ok) {
    await recordLoginFailure(limit.caller);
    return { error: REJECTED };
  }

  // Cost raised since this hash was written? Rewrite it now, while the
  // plaintext is in hand. Nobody has to be told to change their password.
  if (needsRehash(stored)) {
    await supabase
      .from("brain_users")
      .update({ password_hash: await hashPassword(password) })
      .eq("id", user.id);
  }

  await clearLoginFailures(limit.caller);
  await supabase
    .from("brain_users")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", user.id);

  const store = await cookies();
  store.set(BRAIN_COOKIE, await createBrainToken(user.id, user.token_version), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: BRAIN_SESSION_MAX_AGE,
  });

  redirect(safeRedirectPath(formData.get("next"), HOME));
}

export async function signOutOfBrain() {
  const store = await cookies();
  store.delete(BRAIN_COOKIE);
  redirect("/me");
}

/**
 * A real hash of a value nobody knows, so the no-such-user path costs the same
 * as the wrong-password path. Written out rather than generated at import so
 * the parameters here can't silently drift from the ones in `password.ts`.
 */
const DUMMY_HASH =
  "scrypt$65536$8$1$" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=$" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
