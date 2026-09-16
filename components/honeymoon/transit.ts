import { formatClockIn, utcToZoned } from "./flights";
import { compare } from "./trip";
import type { Lane, TripLeg, TripTransit, TransitMode } from "./types";

/**
 * Every ride on this tab is inside Japan, so the zone is a constant rather
 * than two columns per row the way flights need. Same call stays.ts already
 * made for STAY_TZ, for the same reason: if a ride ever happens somewhere
 * else, this becomes a column and the forms grow a picker.
 */
export const TRANSIT_TZ = "Asia/Tokyo";

/** Long enough that two rides either side of it are separate journeys. */
const CONNECTION_HOURS = 6;

export const MODES: Record<
  TransitMode,
  { label: string; glyph: string; verb: string }
> = {
  train: { label: "Train", glyph: "🚄", verb: "Ride" },
  bus: { label: "Bus", glyph: "🚌", verb: "Ride" },
  ferry: { label: "Ferry", glyph: "⛴", verb: "Sail" },
  taxi: { label: "Taxi", glyph: "🚕", verb: "Ride" },
  car: { label: "Car", glyph: "🚗", verb: "Drive" },
};

/* ------------------------------------------------------------- the clock -- */

export function departsOn(ride: TripTransit): string {
  return utcToZoned(ride.departs_at, TRANSIT_TZ).date;
}

export function arrivesOn(ride: TripTransit): string {
  return utcToZoned(ride.arrives_at, TRANSIT_TZ).date;
}

export function departsClock(ride: TripTransit): string {
  return formatClockIn(ride.departs_at, TRANSIT_TZ);
}

export function arrivesClock(ride: TripTransit): string {
  return formatClockIn(ride.arrives_at, TRANSIT_TZ);
}

export function rideMinutes(ride: TripTransit): number {
  return Math.round(
    (new Date(ride.arrives_at).getTime() -
      new Date(ride.departs_at).getTime()) /
      60_000,
  );
}

/** Left on one date and arrives on another — the night bus case. */
export function isOvernight(ride: TripTransit): boolean {
  return departsOn(ride) !== arrivesOn(ride);
}

/** Departure order, with a tiebreak so both engines agree. */
export function byDeparture(a: TripTransit, b: TripTransit): number {
  return compare(a.departs_at, b.departs_at) || compare(a.id, b.id);
}

export function transitIn(rides: TripTransit[], lane: Lane): TripTransit[] {
  return rides.filter((r) => r.lane === lane).sort(byDeparture);
}

/**
 * Rides touching a calendar day, by Japan's clock.
 *
 * Mirrors flightsOnDay: an overnight bus shows on the day it leaves and again
 * on the day it lands, because both of those days are partly spent on it.
 */
export function transitOnDay(
  rides: TripTransit[],
  iso: string,
): { ride: TripTransit; leaves: boolean; lands: boolean }[] {
  return rides
    .map((ride) => ({
      ride,
      leaves: departsOn(ride) === iso,
      lands: arrivesOn(ride) === iso,
    }))
    .filter((r) => r.leaves || r.lands);
}

/* --------------------------------------------------------------- the cost -- */

/**
 * A ride the rail pass covers costs nothing when you take it.
 *
 * You reserve it at a window with the pass in your hand, so counting its face
 * value would both inflate the trip total and put money in "cash on you" that
 * you will never hand over. The pass itself is paid for once, as a trip_docs
 * row in the 'rail' category, and that is where its cost belongs.
 */
export function isPayable(ride: TripTransit): boolean {
  return !ride.covered_by_pass && typeof ride.cost_amount === "number";
}

export function payableRides(rides: TripTransit[]): TripTransit[] {
  return rides.filter(isPayable);
}

/* ------------------------------------------------------------- journeys -- */

/**
 * Rides chained into one trip across the country.
 *
 * Tokyo to Kanazawa is a Hikari and then a Thunderbird, and on the day it is
 * one journey with a change in the middle. Like flights, this is computed
 * rather than stored: move a ride's time and the grouping follows, and there
 * is no second table to get out of step.
 */
export type Change = {
  minutes: number;
  /** Arrived at one station and leaving from a differently-named one. */
  changesStation: boolean;
  tone: "tight" | "long" | null;
};

export type TransitJourney = {
  id: string;
  lane: Lane;
  rides: TripTransit[];
  /** changes[i] sits between rides[i] and rides[i + 1]. */
  changes: Change[];
  from: string;
  to: string;
  departsAt: string;
  arrivesAt: string;
};

/** Under this and you are running; over it and you are waiting around. */
const TIGHT_CHANGE = 10;
const LONG_CHANGE = 90;

function sameStation(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/\s*(station|eki|駅)\s*$/u, "")
      .trim();
  return norm(a) === norm(b);
}

export function groupTransit(rides: TripTransit[]): TransitJourney[] {
  const journeys: TransitJourney[] = [];

  for (const ride of [...rides].sort(byDeparture)) {
    const open = journeys.at(-1);
    const last = open?.rides.at(-1);

    const connects =
      open !== undefined &&
      last !== undefined &&
      open.lane === ride.lane &&
      sameStation(last.to_place, ride.from_place) &&
      new Date(ride.departs_at).getTime() -
        new Date(last.arrives_at).getTime() <=
        CONNECTION_HOURS * 3_600_000 &&
      new Date(ride.departs_at) >= new Date(last.arrives_at);

    if (connects && open && last) {
      const minutes = Math.round(
        (new Date(ride.departs_at).getTime() -
          new Date(last.arrives_at).getTime()) /
          60_000,
      );
      open.rides.push(ride);
      open.changes.push({
        minutes,
        changesStation: !sameStation(last.to_place, ride.from_place),
        tone:
          minutes < TIGHT_CHANGE
            ? "tight"
            : minutes > LONG_CHANGE
              ? "long"
              : null,
      });
      open.to = ride.to_place;
      open.arrivesAt = ride.arrives_at;
      continue;
    }

    journeys.push({
      id: ride.id,
      lane: ride.lane,
      rides: [ride],
      changes: [],
      from: ride.from_place,
      to: ride.to_place,
      departsAt: ride.departs_at,
      arrivesAt: ride.arrives_at,
    });
  }

  return journeys;
}

/** End to end, including the waiting in the middle. */
export function journeyMinutes(journey: TransitJourney): number {
  return Math.round(
    (new Date(journey.arrivesAt).getTime() -
      new Date(journey.departsAt).getTime()) /
      60_000,
  );
}

/* -------------------------------------------------------------- warnings -- */

export type TransitWarning = { tone: "warn" | "note"; text: string };

export function rideWarnings(ride: TripTransit): TransitWarning[] {
  const out: TransitWarning[] = [];

  // The one that actually ruins a day. Reserved seats on the shinkansen over
  // New Year sell out weeks ahead, and an unreserved car on the 30th of
  // December means standing to Kyoto with the luggage.
  if (ride.mode === "train" && !ride.reserved) {
    out.push({ tone: "note", text: "No seat reserved" });
  }

  if (ride.reserved && !ride.seat_aaron && !ride.seat_savea) {
    out.push({ tone: "note", text: "Reserved, but no seat numbers yet" });
  }

  if (isOvernight(ride)) {
    out.push({ tone: "note", text: "Arrives the next day" });
  }

  return out;
}

/* ------------------------------------------------------------ route gaps -- */

/**
 * The moves the agreed route implies.
 *
 * Legs are consecutive stretches in one place, so every boundary between two
 * of them is a day you have to physically get from one to the other. This is
 * the transit tab's equivalent of lodging's night with no bed: the route says
 * you move, and nothing on the board carries you.
 */
export type Hop = {
  on: string;
  from: string;
  to: string;
  fromJa: string | null;
  toJa: string | null;
  covered: boolean;
};

/**
 * Matched on the date alone, deliberately.
 *
 * Comparing a ride's free-text stations against a leg's name fires on "Tokyo"
 * against "Tokyo again" and on "Kyoto" against "Kyoto Station", and a warning
 * that cries wolf is a warning you learn to scroll past. A ride leaving on the
 * day the route moves is the honest signal, and getting on the wrong train is
 * not a problem a planner can catch anyway.
 */
export function routeHops(legs: TripLeg[], rides: TripTransit[]): Hop[] {
  const route = [...legs].sort(
    (a, b) => compare(a.starts_on, b.starts_on) || compare(a.id, b.id),
  );
  const decided = transitIn(rides, "decided");

  const hops: Hop[] = [];
  for (let i = 0; i < route.length - 1; i++) {
    const from = route[i];
    const to = route[i + 1];
    // The leg's last day is the day you leave it for the next one.
    const on = to.starts_on;
    hops.push({
      on,
      from: from.name,
      to: to.name,
      fromJa: from.name_ja,
      toJa: to.name_ja,
      covered: decided.some((ride) => departsOn(ride) === on),
    });
  }
  return hops;
}
