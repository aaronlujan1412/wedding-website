"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { HOST_COOKIE, isValidSessionToken } from "@/lib/admin-session";
import { currentTripId } from "@/lib/honeymoon-queries";
import type {
  BookingStatus,
  Currency,
  Lane,
  Planner,
  StayPayment,
  TripStay,
} from "@/components/honeymoon/types";

async function isHost() {
  const store = await cookies();
  return isValidSessionToken(store.get(HOST_COOKIE)?.value);
}

const DENIED = { data: null, error: "Not authorised." };

function refresh() {
  // Stays show on the Lodging tab, on the board's leg bands, in the itinerary
  // and on the pocket print.
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

export type StayInput = {
  lane: Lane;
  added_by: Planner;
  name: string;
  name_ja?: string | null;
  city?: string | null;
  check_in_on: string;
  check_out_on: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  booking_status: BookingStatus;
  payment?: StayPayment | null;
  cancel_by?: string | null;
  confirmation?: string | null;
  url?: string | null;
  address?: string | null;
  address_ja?: string | null;
  phone?: string | null;
  map_url?: string | null;
  getting_there?: string | null;
  breakfast_time?: string | null;
  dinner_time?: string | null;
  onsen_hours?: string | null;
  tattoos_ok?: boolean | null;
  forward_bags?: boolean;
  /** Smallest unit of `cost_currency`: whole yen, or US cents. */
  cost_amount?: number | null;
  cost_currency?: Currency;
  desk_cash_yen?: number | null;
  notes?: string | null;
};

function toRow(input: StayInput) {
  return {
    lane: input.lane,
    added_by: input.added_by,
    name: input.name.trim(),
    name_ja: blankToNull(input.name_ja),
    city: blankToNull(input.city),
    check_in_on: input.check_in_on,
    check_out_on: input.check_out_on,
    check_in_time: blankToNull(input.check_in_time),
    check_out_time: blankToNull(input.check_out_time),
    booking_status: input.booking_status,
    payment: input.payment ?? null,
    cancel_by: blankToNull(input.cancel_by),
    confirmation: blankToNull(input.confirmation),
    url: blankToNull(input.url),
    address: blankToNull(input.address),
    address_ja: blankToNull(input.address_ja),
    phone: blankToNull(input.phone),
    map_url: blankToNull(input.map_url),
    getting_there: blankToNull(input.getting_there),
    breakfast_time: blankToNull(input.breakfast_time),
    dinner_time: blankToNull(input.dinner_time),
    onsen_hours: blankToNull(input.onsen_hours),
    tattoos_ok: input.tattoos_ok ?? null,
    forward_bags: input.forward_bags ?? false,
    cost_amount: wholeOrNull(input.cost_amount),
    cost_currency:
      input.cost_currency === "USD" ? ("USD" as const) : ("JPY" as const),
    desk_cash_yen: wholeOrNull(input.desk_cash_yen),
    notes: blankToNull(input.notes),
  };
}

/**
 * Decided can only sleep in one place a night — the exclusion constraint
 * `trip_stays_no_double_booking` (23P01). Say that rather than hand back the
 * constraint name.
 */
function stayError(error: { code?: string; message: string }) {
  if (error.code === "23P01") {
    return "Decided already has a bed on some of those nights. Shorten that stay first, or put this one in your own lane and use it from there to replace it.";
  }
  return error.message;
}

export async function saveStay(id: string | null, input: StayInput) {
  if (!(await isHost())) return DENIED;

  const row = toRow(input);
  if (!row.name) return { data: null, error: "Give the place a name." };
  if (!row.check_in_on || !row.check_out_on) {
    return { data: null, error: "Add the check-in and check-out dates." };
  }
  if (row.check_out_on <= row.check_in_on) {
    return {
      data: null,
      error: "Check out has to be at least a night after check in.",
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
        .from("trip_stays")
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()
    : await supabase.from("trip_stays").insert({ ...row, trip_id: trip }).select().single();

  if (error) return { data: null, error: stayError(error) };

  refresh();
  return { data: data as TripStay, error: null };
}

/** A stay's checklist means nothing without the stay, so it goes too. */
export async function deleteStay(id: string) {
  if (!(await isHost())) return DENIED;

  await supabase.from("trip_checklist_items").delete().eq("list", `stay:${id}`);

  const { error } = await supabase.from("trip_stays").delete().eq("id", id);
  if (error) return { data: null, error: error.message };

  refresh();
  return { data: true, error: null };
}

/**
 * Agree to a suggested stay. Copies it into Decided and trims whatever Decided
 * had on those nights, in one transaction inside `adopt_trip_stay`.
 */
export async function adoptStay(id: string) {
  if (!(await isHost())) return DENIED;

  const { data, error } = await supabase.rpc("adopt_trip_stay", { p_stay: id });
  if (error) return { data: null, error: stayError(error) };

  refresh();
  return { data, error: null };
}
