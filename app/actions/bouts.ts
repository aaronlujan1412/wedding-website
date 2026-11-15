"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { HOST_COOKIE, isValidSessionToken } from "@/lib/admin-session";
import { FINISHERS, WISHES } from "@/components/honeymoon/bouts";
import type { BoutOutcome, Planner } from "@/components/honeymoon/types";

/**
 * The Ring's writes. The fighters are the wedding playlist (`wedding_songs`)
 * and the log is `song_bouts`; neither belongs to a trip, so nothing here
 * resolves one.
 */

async function isHost() {
  const store = await cookies();
  return isValidSessionToken(store.get(HOST_COOKIE)?.value);
}

const DENIED = { data: null, error: "Not authorised." };

function refresh() {
  revalidatePath("/honeymoon/ring");
}

/**
 * One verdict.
 *
 * The bout row is the history and `cut_at` is the state it left behind, so a
 * "cut both" writes both: the log says what happened in the ring, the column
 * says where the song stands now. Deriving the second from the first would
 * make bringing back one of the two a history edit.
 */
export async function settleBout(
  eastId: string,
  westId: string,
  outcome: BoutOutcome,
) {
  if (!(await isHost())) return DENIED;
  if (eastId === westId) return { data: null, error: "That's one song." };

  const { data, error } = await supabase
    .from("song_bouts")
    .insert({ east_id: eastId, west_id: westId, outcome })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  if (outcome === "neither") {
    const { error: cut } = await supabase
      .from("wedding_songs")
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
 * be put back by hand is a cut, since that lives on the song.
 */
export async function undoLastBout() {
  if (!(await isHost())) return DENIED;

  const { data: last } = await supabase
    .from("song_bouts")
    .select()
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!last) return { data: null, error: "Nothing to take back." };

  const { error } = await supabase.from("song_bouts").delete().eq("id", last.id);
  if (error) return { data: null, error: error.message };

  if (last.outcome === "neither") {
    // Only the cut is reversed. A song that a finisher took out was never cut
    // by this bout, and `vetoed_by` is not this command's to refund.
    await supabase
      .from("wedding_songs")
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
 * Counted on the server rather than trusted from the button: the budget is
 * the whole mechanic, and a mechanic enforced only in the component is one
 * request away from not existing.
 */
async function spent(planner: Planner, column: "saved_by" | "vetoed_by") {
  const { count } = await supabase
    .from("wedding_songs")
    .select("id", { count: "exact", head: true })
    .eq(column, planner);
  return count ?? 0;
}

/**
 * 願い — a wish.
 *
 * The song leaves the tournament upward: out of the ring for good, and onto
 * the setlist ahead of everything that had to fight for it. Three each, and
 * the refusal says how many are left rather than just "no", because running
 * out is a thing that happens mid-argument.
 */
export async function wishSong(id: string, planner: Planner) {
  if (!(await isHost())) return DENIED;

  const used = await spent(planner, "saved_by");
  if (used >= WISHES) {
    return { data: null, error: `No wishes left — all ${WISHES} are spent.` };
  }

  const { error } = await supabase
    .from("wedding_songs")
    .update({ saved_by: planner, cut_at: null, vetoed_by: null })
    .eq("id", id);

  if (error) return { data: null, error: error.message };

  refresh();
  return { data: WISHES - used - 1, error: null };
}

/**
 * 必殺 — a finisher.
 *
 * The song leaves downward, with no bout and nothing owed to the other side.
 * It lands in the same eliminated list as any cut song, because it is one;
 * `vetoed_by` only records whose move it was, so a comeback refunds the right
 * person.
 */
export async function finishSong(id: string, planner: Planner) {
  if (!(await isHost())) return DENIED;

  const used = await spent(planner, "vetoed_by");
  if (used >= FINISHERS) {
    return {
      data: null,
      error: `No finishers left — all ${FINISHERS} are spent.`,
    };
  }

  const { error } = await supabase
    .from("wedding_songs")
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
export async function releaseSong(id: string) {
  if (!(await isHost())) return DENIED;

  const { error } = await supabase
    .from("wedding_songs")
    .update({ saved_by: null })
    .eq("id", id);

  if (error) return { data: null, error: error.message };

  refresh();
  return { data: true, error: null };
}

/** Back into the ring. The bout that cut it stays on the record. */
export async function reviveSong(id: string) {
  if (!(await isHost())) return DENIED;

  const { error } = await supabase
    .from("wedding_songs")
    .update({ cut_at: null, vetoed_by: null })
    .eq("id", id);

  if (error) return { data: null, error: error.message };

  refresh();
  return { data: true, error: null };
}
