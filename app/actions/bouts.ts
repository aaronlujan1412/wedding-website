"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { HOST_COOKIE, isValidSessionToken } from "@/lib/admin-session";
import { currentTripId } from "@/lib/honeymoon-queries";
import { FINISHERS, WISHES } from "@/components/honeymoon/bouts";
import type { BoutOutcome, Planner } from "@/components/honeymoon/types";

async function isHost() {
  const store = await cookies();
  return isValidSessionToken(store.get(HOST_COOKIE)?.value);
}

const DENIED = { data: null, error: "Not authorised." };

function refresh() {
  revalidatePath("/honeymoon/ring");
  revalidatePath("/honeymoon");
}

/**
 * One verdict.
 *
 * The bout row is the history and `cut_at` is the state it left behind, so a
 * "cut both" writes both: the log says what happened in the ring, the column
 * says where the card stands now. Deriving the second from the first would
 * make bringing back one of the two a history edit.
 */
export async function settleBout(
  eastId: string,
  westId: string,
  outcome: BoutOutcome,
) {
  if (!(await isHost())) return DENIED;
  if (eastId === westId) return { data: null, error: "That's one card." };

  const trip = await currentTripId();
  if (!trip) return { data: null, error: "There's no trip yet." };

  const { data, error } = await supabase
    .from("trip_bouts")
    .insert({ trip_id: trip, east_id: eastId, west_id: westId, outcome })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  if (outcome === "neither") {
    const { error: cut } = await supabase
      .from("trip_items")
      .update({ cut_at: new Date().toISOString() })
      .in("id", [eastId, westId]);
    if (cut) return { data: null, error: cut.message };
  }

  refresh();
  return { data, error: null };
}

/**
 * Take the last one back.
 *
 * Every rating on the banzuke is replayed from the log, so deleting the row
 * is the whole undo — there is no score to unwind. The only thing that has to
 * be put back by hand is a cut, since that lives on the card.
 */
export async function undoLastBout() {
  if (!(await isHost())) return DENIED;

  const trip = await currentTripId();
  if (!trip) return { data: null, error: "There's no trip yet." };

  const { data: last } = await supabase
    .from("trip_bouts")
    .select()
    .eq("trip_id", trip)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!last) return { data: null, error: "Nothing to take back." };

  const { error } = await supabase.from("trip_bouts").delete().eq("id", last.id);
  if (error) return { data: null, error: error.message };

  if (last.outcome === "neither") {
    // Only the cut is reversed. A card that a finisher took out was never cut
    // by this bout, and `vetoed_by` is not this command's to refund.
    await supabase
      .from("trip_items")
      .update({ cut_at: null })
      .in("id", [last.east_id, last.west_id])
      .is("vetoed_by", null);
  }

  refresh();
  return { data: last, error: null };
}

/**
 * Whether that person has a move of that kind left.
 *
 * Counted on the server rather than trusted from the button, for the same
 * reason the trip id is: the budget is the whole mechanic, and a mechanic
 * enforced only in the component is one request away from not existing.
 */
async function spent(trip: string, planner: Planner, column: "saved_by" | "vetoed_by") {
  const { count } = await supabase
    .from("trip_items")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", trip)
    .eq(column, planner);
  return count ?? 0;
}

/**
 * 願い — a wish.
 *
 * The card leaves the tournament upward: out of the ring for good, and into
 * the trip with its hours counted first. Three each, and the refusal says how
 * many are left rather than just "no", because running out is a thing that
 * happens mid-argument.
 */
export async function wishItem(id: string, planner: Planner) {
  if (!(await isHost())) return DENIED;

  const trip = await currentTripId();
  if (!trip) return { data: null, error: "There's no trip yet." };

  const used = await spent(trip, planner, "saved_by");
  if (used >= WISHES) {
    return { data: null, error: `No wishes left — all ${WISHES} are spent.` };
  }

  const { error } = await supabase
    .from("trip_items")
    .update({ saved_by: planner, cut_at: null, vetoed_by: null })
    .eq("id", id);

  if (error) return { data: null, error: error.message };

  refresh();
  return { data: WISHES - used - 1, error: null };
}

/**
 * 必殺 — a finisher.
 *
 * The card leaves downward, with no bout and nothing owed to the other side.
 * It lands in the same eliminated list as any cut card, because it is one;
 * `vetoed_by` only records whose move it was, so a comeback refunds the right
 * person.
 */
export async function finishItem(id: string, planner: Planner) {
  if (!(await isHost())) return DENIED;

  const trip = await currentTripId();
  if (!trip) return { data: null, error: "There's no trip yet." };

  const used = await spent(trip, planner, "vetoed_by");
  if (used >= FINISHERS) {
    return {
      data: null,
      error: `No finishers left — all ${FINISHERS} are spent.`,
    };
  }

  const { error } = await supabase
    .from("trip_items")
    .update({
      vetoed_by: planner,
      cut_at: new Date().toISOString(),
      saved_by: null,
    })
    .eq("id", id);

  if (error) return { data: null, error: error.message };

  refresh();
  return { data: FINISHERS - used - 1, error: null };
}

/** Back into the ring, and the wish back into its owner's hand. */
export async function releaseItem(id: string) {
  if (!(await isHost())) return DENIED;

  const { error } = await supabase
    .from("trip_items")
    .update({ saved_by: null })
    .eq("id", id);

  if (error) return { data: null, error: error.message };

  refresh();
  return { data: true, error: null };
}

/** Back into the ring. The bout that cut it stays on the record. */
export async function reviveItem(id: string) {
  if (!(await isHost())) return DENIED;

  const { error } = await supabase
    .from("trip_items")
    .update({ cut_at: null, vetoed_by: null })
    .eq("id", id);

  if (error) return { data: null, error: error.message };

  refresh();
  return { data: true, error: null };
}

/**
 * The payoff: everything above the line, into Decided.
 *
 * They land in Decided's pile with no day on them — agreed, not scheduled.
 * Picking the day is the Board's job and the reason the Compare view exists.
 * `added_by` is untouched, so the banzuke still knows whose idea it was.
 */
export async function agreeToItems(ids: string[]) {
  if (!(await isHost())) return DENIED;
  if (ids.length === 0) return { data: 0, error: null };

  const { data: top } = await supabase
    .from("trip_items")
    .select("position")
    .eq("lane", "decided")
    .is("on_date", null)
    .order("position", { ascending: false })
    .limit(1);

  let position = (top?.[0]?.position ?? 0) + 1;
  const now = new Date().toISOString();

  // One at a time, because each needs its own position: a single .in() update
  // would stack every card on one number and the pile's order would be
  // whatever Postgres felt like.
  for (const id of ids) {
    const { error } = await supabase
      .from("trip_items")
      .update({ lane: "decided", on_date: null, position, updated_at: now })
      .eq("id", id);
    if (error) return { data: null, error: error.message };
    position += 1;
  }

  refresh();
  return { data: ids.length, error: null };
}
