"use server";

import { cookies } from "next/headers";
import {
  HELPER_COOKIE,
  HELPER_SESSION_MAX_AGE,
  createHelperToken,
} from "@/lib/helper-session";
import {
  checkLoginLimit,
  clearLoginFailures,
  recordLoginFailure,
} from "@/lib/login-limit";
import { passcodeMatches } from "@/lib/passcode";

export type UnlockState = { error: string | null };

/**
 * Checks the helpers' code and, if it's right, sets the cookie that shows
 * who's who. Setting a cookie in an action re-renders the page it came from,
 * so the album replaces the form in place, with no redirect.
 *
 * Four digits is 10,000 guesses, so this goes through the same throttle as
 * the /me sign-in, which fails closed: a counter that can't count is no
 * gate in front of photos of people's kids.
 */
export async function unlockFaces(
  _previous: UnlockState,
  formData: FormData,
): Promise<UnlockState> {
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  const expected = process.env.HELPERS_PASSCODE;

  if (!expected) {
    return { error: "The helpers’ code isn’t set up on the server yet." };
  }

  const limit = await checkLoginLimit();
  if (!limit.ok) {
    return {
      error: `Too many tries. Try again in ${limit.retryAfterMinutes} minute${
        limit.retryAfterMinutes === 1 ? "" : "s"
      }.`,
    };
  }

  if (!code || !passcodeMatches(code, expected)) {
    await recordLoginFailure(limit.caller);
    return { error: "That code doesn’t match. Try again." };
  }

  await clearLoginFailures(limit.caller);

  const store = await cookies();
  store.set(HELPER_COOKIE, await createHelperToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: HELPER_SESSION_MAX_AGE,
  });

  return { error: null };
}
