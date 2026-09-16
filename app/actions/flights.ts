"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { HOST_COOKIE, isValidSessionToken } from "@/lib/admin-session";
import { currentTripId } from "@/lib/honeymoon-queries";
import {
  checklistKey,
  groupJourneys,
  zonedToUtc,
} from "@/components/honeymoon/flights";
import type { Cabin, Currency, TripFlight } from "@/components/honeymoon/types";

async function isHost() {
  const store = await cookies();
  return isValidSessionToken(store.get(HOST_COOKIE)?.value);
}

const DENIED = { data: null, error: "Not authorised." };

function refresh() {
  // Every honeymoon tab shows flights somewhere: the Flights tab, the travel
  // days on the board, the pocket print, the hub's countdown.
  revalidatePath("/honeymoon", "layout");
  revalidatePath("/hosts");
}

function blankToNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * A flight as the form sends it: dates and times exactly as the confirmation
 * prints them, each in its own airport's local time. The server turns those
 * into instants, so nobody converts time zones by hand.
 */
export type FlightInput = {
  airline: string;
  flight_number: string;
  from_airport: string;
  from_city?: string | null;
  departs_date: string;
  departs_time: string;
  departs_tz: string;
  to_airport: string;
  to_city?: string | null;
  arrives_date: string;
  arrives_time: string;
  arrives_tz: string;
  cabin?: Cabin | null;
  aircraft?: string | null;
  confirmation?: string | null;
  seat_aaron?: string | null;
  seat_savea?: string | null;
  departure_terminal?: string | null;
  departure_gate?: string | null;
  arrival_terminal?: string | null;
  baggage?: string | null;
  meal?: string | null;
  checkin_url?: string | null;
  status_url?: string | null;
  notes?: string | null;
  cost_amount?: number | null;
  cost_currency?: Currency;
};

function isZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function toRow(input: FlightInput) {
  const from = input.from_airport.trim().toUpperCase();
  const to = input.to_airport.trim().toUpperCase();

  if (!input.airline.trim() || !input.flight_number.trim()) {
    return { error: "Add the airline and flight number." } as const;
  }
  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) {
    return {
      error: "Airports need their three-letter code, like SLC or HND.",
    } as const;
  }
  if (
    !input.departs_date ||
    !input.departs_time ||
    !input.arrives_date ||
    !input.arrives_time
  ) {
    return {
      error: "Add both the departure and arrival date and time.",
    } as const;
  }
  if (!isZone(input.departs_tz) || !isZone(input.arrives_tz)) {
    return { error: "Pick a time zone for each airport." } as const;
  }

  const departs_at = zonedToUtc(
    input.departs_date,
    input.departs_time,
    input.departs_tz,
  );
  const arrives_at = zonedToUtc(
    input.arrives_date,
    input.arrives_time,
    input.arrives_tz,
  );

  if (arrives_at <= departs_at) {
    return {
      error:
        "That lands before it takes off. Check the arrival date — flying to Japan usually lands the next day.",
    } as const;
  }

  const amount = input.cost_amount;
  return {
    row: {
      airline: input.airline.trim(),
      flight_number: input.flight_number
        .trim()
        .toUpperCase()
        .replace(/\s+/g, ""),
      from_airport: from,
      from_city: blankToNull(input.from_city),
      departs_at,
      departs_tz: input.departs_tz,
      to_airport: to,
      to_city: blankToNull(input.to_city),
      arrives_at,
      arrives_tz: input.arrives_tz,
      cabin: input.cabin ?? null,
      aircraft: blankToNull(input.aircraft),
      confirmation: blankToNull(input.confirmation)?.toUpperCase() ?? null,
      seat_aaron: blankToNull(input.seat_aaron)?.toUpperCase() ?? null,
      seat_savea: blankToNull(input.seat_savea)?.toUpperCase() ?? null,
      departure_terminal: blankToNull(input.departure_terminal),
      departure_gate: blankToNull(input.departure_gate),
      arrival_terminal: blankToNull(input.arrival_terminal),
      baggage: blankToNull(input.baggage),
      meal: blankToNull(input.meal),
      checkin_url: blankToNull(input.checkin_url),
      status_url: blankToNull(input.status_url),
      notes: blankToNull(input.notes),
      cost_amount:
        typeof amount === "number" && Number.isInteger(amount) && amount >= 0
          ? amount
          : null,
      cost_currency:
        input.cost_currency === "JPY" ? ("JPY" as const) : ("USD" as const),
    },
  } as const;
}

export async function saveFlight(id: string | null, input: FlightInput) {
  if (!(await isHost())) return DENIED;

  const result = toRow(input);
  if ("error" in result) return { data: null, error: result.error };

  const trip = await currentTripId();
  if (!trip) {
    return { data: null, error: "There's no trip yet. Make one first." };
  }

  const { data, error } = id
    ? await supabase
        .from("trip_flights")
        .update({ ...result.row, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()
    : await supabase.from("trip_flights").insert({ ...result.row, trip_id: trip }).select().single();

  if (error) return { data: null, error: error.message };

  refresh();
  return { data: data as TripFlight, error: null };
}

/**
 * The gate and terminal only turn up on the day, usually while you're walking.
 * One small write rather than the whole form.
 */
export async function setFlightGate(
  id: string,
  gate: { departure_terminal?: string | null; departure_gate?: string | null },
) {
  if (!(await isHost())) return DENIED;

  const { error } = await supabase
    .from("trip_flights")
    .update({
      departure_terminal: blankToNull(gate.departure_terminal),
      departure_gate: blankToNull(gate.departure_gate),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { data: null, error: error.message };

  refresh();
  return { data: true, error: null };
}

/**
 * A journey's checklist lives on its flights, so deleting a flight hands its
 * items to another flight in the same journey rather than losing "passports".
 * A flight that was its whole journey takes its checklist with it.
 */
export async function deleteFlight(id: string) {
  if (!(await isHost())) return DENIED;

  const { data: flights } = await supabase.from("trip_flights").select();
  const journey = groupJourneys(flights ?? []).find((j) =>
    j.flights.some((f) => f.id === id),
  );
  const heir = journey?.flights.find((f) => f.id !== id);
  const key = `flight:${id}`;

  if (heir) {
    await supabase
      .from("trip_checklist_items")
      .update({ list: checklistKey(heir) })
      .eq("list", key);
  } else {
    await supabase.from("trip_checklist_items").delete().eq("list", key);
  }

  const { error } = await supabase.from("trip_flights").delete().eq("id", id);
  if (error) return { data: null, error: error.message };

  refresh();
  return { data: true, error: null };
}
