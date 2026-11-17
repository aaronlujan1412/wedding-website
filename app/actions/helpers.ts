"use server";

import { cookies } from "next/headers";
import { hasHelperAccess } from "@/components/helpers/access";
import {
  hasTicks,
  isOpenCard,
  isTickItem,
  loadTicks,
} from "@/components/helpers/ticks";
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
import { supabase } from "@/lib/supabase";

export type UnlockState = { error: string | null };

/**
 * Checks the helpers' code and, if it's right, sets the cookie that opens
 * the staff helper pages. Setting a cookie in an action re-renders the page
 * it came from, so the page's tabs replace the form in place, with no
 * redirect.
 *
 * Four digits is 10,000 guesses, so this goes through the same throttle as
 * the /me sign-in, which fails closed: a counter that can't count is no
 * gate in front of photos of people's kids.
 */
export async function unlockHelpers(
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

type TicksResult = { data: string[] | null; error: string | null };

/** Which card's ticks a caller may touch: a real card with boxes, and for
    anything off the open page, someone with the code. */
async function tickCard(card: string) {
  if (!hasTicks(card)) return null;
  if (!isOpenCard(card) && !(await hasHelperAccess())) return null;
  return card;
}

/** What's ticked on a card now: the boxes' poll. */
export async function readTicks(card: string): Promise<TicksResult> {
  const allowed = await tickCard(card);
  if (!allowed) return { data: null, error: "That isn’t a list you can see." };
  return { data: await loadTicks(allowed), error: null };
}

/**
 * Ticks or unticks one box, and answers with everything ticked on the card,
 * so the write doubles as a refresh. Both directions are idempotent: two
 * people ticking the same box at once is one row.
 */
export async function setTick(
  card: string,
  item: string,
  ticked: boolean,
): Promise<TicksResult> {
  const allowed = await tickCard(card);
  if (!allowed) return { data: null, error: "That isn’t a list you can tick." };
  if (!isTickItem(allowed, item)) {
    return { data: null, error: "That isn’t on the list any more. Reload the page." };
  }

  const { error } = ticked
    ? await supabase
        .from("helper_ticks")
        .upsert({ card: allowed, item }, { onConflict: "card,item", ignoreDuplicates: true })
    : await supabase.from("helper_ticks").delete().eq("card", allowed).eq("item", item);

  if (error) return { data: null, error: "That didn’t save. Try again in a moment." };
  return { data: await loadTicks(allowed), error: null };
}
