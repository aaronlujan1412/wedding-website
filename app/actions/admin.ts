"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  HOST_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
} from "@/lib/admin-session";
import { safeRedirectPath } from "@/lib/safe-redirect";

export type SignInState = { error: string | null };

/**
 * Hashing first gives both sides a fixed length, so the comparison can't leak
 * the passphrase one character at a time through response timing.
 */
function matches(input: string, expected: string) {
  return timingSafeEqual(
    createHash("sha256").update(input).digest(),
    createHash("sha256").update(expected).digest(),
  );
}

export async function signInAsHost(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const passcode = String(formData.get("passcode") ?? "");
  const expected = process.env.RSVP_ADMIN_PASSCODE;

  if (!expected) {
    return { error: "The host passphrase isn't configured on the server." };
  }
  if (!passcode || !matches(passcode, expected)) {
    return { error: "That passphrase doesn't match. Try again." };
  }

  const store = await cookies();
  store.set(HOST_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect(safeRedirectPath(formData.get("next")));
}

export async function signOutAsHost() {
  const store = await cookies();
  store.delete(HOST_COOKIE);
  redirect("/");
}
