"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { HOST_COOKIE, isValidSessionToken } from "@/lib/admin-session";
import { TRIP_COOKIE } from "@/lib/trip-cookie";
import type { Trip } from "@/components/honeymoon/types";

async function isHost() {
  const store = await cookies();
  return isValidSessionToken(store.get(HOST_COOKIE)?.value);
}

const DENIED = { data: null, error: "Not authorised." };

function refresh() {
  revalidatePath("/honeymoon", "layout");
}

function blankToNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export type TripInput = {
  name: string;
  name_ja?: string | null;
  starts_on: string;
  ends_on: string;
  note?: string | null;
};

function validate(input: TripInput) {
  const name = input.name.trim();
  if (!name) return "Give it a name.";
  if (!input.starts_on || !input.ends_on) return "Add the dates.";
  if (input.ends_on < input.starts_on) {
    return "It can't end before it starts.";
  }
  return null;
}

export async function saveTrip(id: string | null, input: TripInput) {
  if (!(await isHost())) return DENIED;

  const problem = validate(input);
  if (problem) return { data: null, error: problem };

  const row = {
    name: input.name.trim(),
    name_ja: blankToNull(input.name_ja),
    starts_on: input.starts_on,
    ends_on: input.ends_on,
    note: blankToNull(input.note),
  };

  const { data, error } = id
    ? await supabase
        .from("trips")
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()
    : await supabase.from("trips").insert(row).select().single();

  if (error) return { data: null, error: error.message };

  // Shortening a trip is the one thing that can strand a card on a day the
  // board no longer has a column for. Legs can't: a day inside the trip with
  // no leg on it is an ordinary empty column now.
  if (id) await supabase.rpc("sweep_orphaned_trip_items", { p_trip: id });

  // A trip you just made is the one you want to be looking at.
  if (!id) await select(data.id);

  refresh();
  return { data: data as Trip, error: null };
}

/**
 * Which trip the planner is on.
 *
 * A cookie rather than a URL parameter, so every tab stays on the same trip
 * without threading an id through six routes, and so a bookmarked link keeps
 * working when the trip it was made on is over.
 */
async function select(id: string) {
  const store = await cookies();
  store.set(TRIP_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}

export async function selectTrip(id: string) {
  if (!(await isHost())) return DENIED;

  const { data, error } = await supabase
    .from("trips")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "That trip no longer exists." };

  await select(id);
  refresh();
  return { data: true, error: null };
}

/**
 * Deleting a trip takes everything in it — every card, leg, stay, flight and
 * ride cascades. The dialog says so in as many words before this is reached.
 */
export async function deleteTrip(id: string) {
  if (!(await isHost())) return DENIED;

  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) return { data: null, error: error.message };

  const store = await cookies();
  if (store.get(TRIP_COOKIE)?.value === id) store.delete(TRIP_COOKIE);

  refresh();
  return { data: true, error: null };
}
