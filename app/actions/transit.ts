"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { HOST_COOKIE, isValidSessionToken } from "@/lib/admin-session";
import { currentTripId } from "@/lib/honeymoon-queries";
import { zonedToUtc } from "@/components/honeymoon/flights";
import { TRANSIT_TZ } from "@/components/honeymoon/transit";
import type {
  Currency,
  Lane,
  Planner,
  TransitMode,
  TripTransit,
} from "@/components/honeymoon/types";

async function isHost() {
  const store = await cookies();
  return isValidSessionToken(store.get(HOST_COOKIE)?.value);
}

const DENIED = { data: null, error: "Not authorised." };

function refresh() {
  // Rides show on the Transit tab, in the board's day columns and in the
  // itinerary, on screen and printed.
  revalidatePath("/honeymoon", "layout");
}

function blankToNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function wholeOrNull(value: number | null | undefined) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

/**
 * The form hands over dates and clock times exactly as the ticket prints them.
 * Everything on this tab is in Japan, so both ends convert through the one
 * zone — nobody is ever asked to do the arithmetic by hand.
 */
export type TransitInput = {
  lane: Lane;
  added_by: Planner;
  mode: TransitMode;
  operator?: string | null;
  service?: string | null;

  from_place: string;
  from_place_ja?: string | null;
  departs_on: string;
  departs_time: string;
  departs_platform?: string | null;

  to_place: string;
  to_place_ja?: string | null;
  arrives_on: string;
  arrives_time: string;
  arrives_platform?: string | null;

  reserved?: boolean;
  car?: string | null;
  seat_aaron?: string | null;
  seat_savea?: string | null;

  covered_by_pass?: boolean;
  confirmation?: string | null;
  booking_url?: string | null;
  notes?: string | null;

  /** Smallest unit of `cost_currency`: whole yen, or US cents. */
  cost_amount?: number | null;
  cost_currency?: Currency;
};

function toRow(input: TransitInput) {
  return {
    lane: input.lane,
    added_by: input.added_by,
    mode: input.mode,
    operator: blankToNull(input.operator),
    service: blankToNull(input.service),

    from_place: input.from_place.trim(),
    from_place_ja: blankToNull(input.from_place_ja),
    departs_at: zonedToUtc(input.departs_on, input.departs_time, TRANSIT_TZ),
    departs_platform: blankToNull(input.departs_platform),

    to_place: input.to_place.trim(),
    to_place_ja: blankToNull(input.to_place_ja),
    arrives_at: zonedToUtc(input.arrives_on, input.arrives_time, TRANSIT_TZ),
    arrives_platform: blankToNull(input.arrives_platform),

    reserved: input.reserved ?? false,
    car: blankToNull(input.car),
    seat_aaron: blankToNull(input.seat_aaron),
    seat_savea: blankToNull(input.seat_savea),

    covered_by_pass: input.covered_by_pass ?? false,
    confirmation: blankToNull(input.confirmation),
    booking_url: blankToNull(input.booking_url),
    notes: blankToNull(input.notes),

    cost_amount: wholeOrNull(input.cost_amount),
    cost_currency:
      input.cost_currency === "USD" ? ("USD" as const) : ("JPY" as const),
  };
}

export async function saveTransit(id: string | null, input: TransitInput) {
  if (!(await isHost())) return DENIED;

  const row = toRow(input);
  if (!row.from_place || !row.to_place) {
    return { data: null, error: "Say where it leaves from and where it goes." };
  }
  if (
    !input.departs_on ||
    !input.departs_time ||
    !input.arrives_on ||
    !input.arrives_time
  ) {
    return { data: null, error: "Add both the departure and arrival times." };
  }
  // Checked here as well as by the table constraint, so the overnight-bus
  // mistake (same date on both ends) reads as a sentence rather than as a
  // constraint violation.
  if (row.arrives_at <= row.departs_at) {
    return {
      data: null,
      error:
        "It has to arrive after it leaves. An overnight ride arrives on the next date.",
    };
  }

  // Resolved here rather than taken from the form: a trip id in a payload is a
  // way to write into a different holiday by editing a hidden field.
  const trip = await currentTripId();
  if (!trip) {
    return { data: null, error: "There's no trip yet. Make one first." };
  }

  const { data, error } = id
    ? await supabase
        .from("trip_transit")
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()
    : await supabase.from("trip_transit").insert({ ...row, trip_id: trip }).select().single();

  if (error) return { data: null, error: error.message };

  refresh();
  return { data: data as TripTransit, error: null };
}

/**
 * A ride's checklist means nothing without the ride, so it goes too. Any
 * travel blockout pointing at it keeps its own times and title — the foreign
 * key is `on delete set null`, so the card survives losing its link.
 */
export async function deleteTransit(id: string) {
  if (!(await isHost())) return DENIED;

  await supabase
    .from("trip_checklist_items")
    .delete()
    .eq("list", `transit:${id}`);

  const { error } = await supabase.from("trip_transit").delete().eq("id", id);
  if (error) return { data: null, error: error.message };

  refresh();
  return { data: true, error: null };
}

/**
 * Agree to a suggested ride.
 *
 * Just a lane change, unlike adopting a leg or a stay. Those cover a range of
 * dates, so taking one on means trimming, splitting or swallowing whatever
 * Decided already had there — several writes that have to land together, which
 * is why they are Postgres functions. A ride is a point in time and overlaps
 * nothing, so there is nothing to reconcile.
 */
export async function adoptTransit(id: string) {
  if (!(await isHost())) return DENIED;

  const { data, error } = await supabase
    .from("trip_transit")
    .update({ lane: "decided", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  refresh();
  return { data: data as TripTransit, error: null };
}

/** Send an agreed ride back to whoever suggested it. */
export async function unadoptTransit(id: string, lane: Lane) {
  if (!(await isHost())) return DENIED;

  const { error } = await supabase
    .from("trip_transit")
    .update({ lane, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { data: null, error: error.message };

  refresh();
  return { data: true, error: null };
}
