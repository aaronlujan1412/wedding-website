"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { HOST_COOKIE, isValidSessionToken } from "@/lib/admin-session";
import { currentTripId } from "@/lib/honeymoon-queries";
import type { BoutOutcome } from "@/components/honeymoon/types";

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
    await supabase
      .from("trip_items")
      .update({ cut_at: null })
      .in("id", [last.east_id, last.west_id]);
  }

  refresh();
  return { data: last, error: null };
}

/** Back into the ring. The bout that cut it stays on the record. */
export async function reviveItem(id: string) {
  if (!(await isHost())) return DENIED;

  const { error } = await supabase
    .from("trip_items")
    .update({ cut_at: null })
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
