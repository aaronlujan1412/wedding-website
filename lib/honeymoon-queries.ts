import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { TRIP_COOKIE } from "@/lib/trip-cookie";
import { getRate } from "@/lib/fx";
import type { Trip, TripBoard } from "@/components/honeymoon/types";

/**
 * The trip everything on the planner belongs to.
 *
 * Whichever one was picked, or failing that the one you are most likely to
 * mean: the trip happening today, then the next one coming up, then the most
 * recent. The guess is what makes the planner work on a fresh browser with no
 * cookie, and the choice is what makes it work in March.
 */
export async function getCurrentTrip(): Promise<Trip | null> {
  // An explicit choice wins. Without one the rule below is a good guess, but
  // it is only a guess — planning next year's holiday in March would otherwise
  // keep snapping back to the one that is closer.
  const chosen = (await cookies()).get(TRIP_COOKIE)?.value;
  if (chosen) {
    const picked = await supabase
      .from("trips")
      .select()
      .eq("id", chosen)
      .maybeSingle();
    if (picked.data) return picked.data;
  }

  const today = new Date().toISOString().slice(0, 10);

  const current = await supabase
    .from("trips")
    .select()
    .lte("starts_on", today)
    .gte("ends_on", today)
    .order("starts_on")
    .limit(1)
    .maybeSingle();
  if (current.data) return current.data;

  const upcoming = await supabase
    .from("trips")
    .select()
    .gt("starts_on", today)
    .order("starts_on")
    .limit(1)
    .maybeSingle();
  if (upcoming.data) return upcoming.data;

  const past = await supabase
    .from("trips")
    .select()
    .order("ends_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  return past.data ?? null;
}

/**
 * Reads behind the host-only honeymoon planner.
 *
 * Same reasoning as `rsvp-queries.ts`: deliberately NOT a `"use server"`
 * module, because every export of one of those becomes a public POST endpoint
 * and `proxy.ts` guards the page, not action invocations against it. These are
 * only ever called from server components, so a plain function keeps them off
 * the action manifest entirely.
 */
export async function getTripBoard(): Promise<TripBoard> {
  const trip = await getCurrentTrip();
  // Nothing belongs to no trip, so with none selected there is nothing to read.
  const of = <T>(q: T) =>
    trip
      ? (q as { eq: (c: string, v: string) => T }).eq("trip_id", trip.id)
      : q;

  const [trips, legs, days, items, docs, flights, stays, transit, rate] =
    await Promise.all([
      getTrips(),
      of(supabase.from("trip_legs").select().order("starts_on")),
      of(supabase.from("trip_days").select().order("on_date")),
      of(supabase.from("trip_items").select().order("position")),
      of(
        supabase.from("trip_docs").select().order("category").order("position"),
      ),
      of(supabase.from("trip_flights").select().order("departs_at")),
      of(supabase.from("trip_stays").select().order("check_in_on")),
      of(supabase.from("trip_transit").select().order("departs_at")),
      getRate(),
    ]);

  return {
    trip,
    trips,
    legs: legs.data ?? [],
    days: days.data ?? [],
    items: items.data ?? [],
    docs: docs.data ?? [],
    flights: flights.data ?? [],
    stays: stays.data ?? [],
    transit: transit.data ?? [],
    rate,
  };
}

/**
 * The Transit tab: every ride in every lane, the legs that say which days need
 * getting between places, and the rides' checklists ("transit:<id>").
 */
export async function getTransitPage() {
  const trip = await getCurrentTrip();
  const of = <T>(q: T) =>
    trip
      ? (q as { eq: (c: string, v: string) => T }).eq("trip_id", trip.id)
      : q;

  const [transit, legs, checklist, rate] = await Promise.all([
    of(supabase.from("trip_transit").select().order("departs_at")),
    of(supabase.from("trip_legs").select().order("starts_on")),
    of(
      supabase
        .from("trip_checklist_items")
        .select()
        .like("list", "transit:%")
        .order("position"),
    ),
    getRate(),
  ]);

  return {
    transit: transit.data ?? [],
    legs: legs.data ?? [],
    checklist: checklist.data ?? [],
    rate,
  };
}

/**
 * The Flights tab: every flight and every flight checklist item. Checklist keys
 * are "flight:<id>", so one prefix query fetches all of them and the page
 * sorts them into journeys.
 */
export async function getFlightsPage() {
  const trip = await getCurrentTrip();
  const of = <T>(q: T) =>
    trip
      ? (q as { eq: (c: string, v: string) => T }).eq("trip_id", trip.id)
      : q;

  const [flights, checklist, rate] = await Promise.all([
    of(supabase.from("trip_flights").select().order("departs_at")),
    of(
      supabase
        .from("trip_checklist_items")
        .select()
        .like("list", "flight:%")
        .order("position"),
    ),
    getRate(),
  ]);

  return {
    flights: flights.data ?? [],
    checklist: checklist.data ?? [],
    rate,
  };
}

/**
 * The Lodging tab: every stay in every lane, the legs and flights that decide
 * which nights need a bed, and the stays' checklists ("stay:<id>").
 */
/**
 * The Finder tab: routes HotelFinder has proposed, newest publish first, each
 * with its stays in order. Nothing here is part of the plan — the decided
 * stays come along so the page can say which nights are already settled.
 */
export async function getFinderPage() {
  const trip = await getCurrentTrip();
  const of = <T>(q: T) =>
    trip
      ? (q as { eq: (c: string, v: string) => T }).eq("trip_id", trip.id)
      : q;

  const [routes, stays, decided, rate] = await Promise.all([
    of(supabase.from("trip_route_proposals").select().order("position")),
    // No trip of their own — they belong to a route proposal, which has one,
    // and the page matches them up by route_id.
    supabase.from("trip_stay_proposals").select().order("position"),
    of(supabase.from("trip_stays").select().eq("lane", "decided")).order(
      "check_in_on",
    ),
    getRate(),
  ]);

  const byRoute = new Map<string, typeof stays.data>();
  for (const stay of stays.data ?? []) {
    const list = byRoute.get(stay.route_id) ?? [];
    list.push(stay);
    byRoute.set(stay.route_id, list);
  }

  return {
    routes: (routes.data ?? []).map((route) => ({
      ...route,
      stays: byRoute.get(route.id) ?? [],
    })),
    decided: decided.data ?? [],
    rate,
  };
}

export async function getLodgingPage() {
  const trip = await getCurrentTrip();
  const of = <T>(q: T) =>
    trip
      ? (q as { eq: (c: string, v: string) => T }).eq("trip_id", trip.id)
      : q;

  const [stays, legs, flights, checklist, rate] = await Promise.all([
    of(supabase.from("trip_stays").select().order("check_in_on")),
    of(supabase.from("trip_legs").select().order("starts_on")),
    of(supabase.from("trip_flights").select().order("departs_at")),
    of(
      supabase
        .from("trip_checklist_items")
        .select()
        .like("list", "stay:%")
        .order("position"),
    ),
    getRate(),
  ]);

  return {
    stays: stays.data ?? [],
    legs: legs.data ?? [],
    flights: flights.data ?? [],
    checklist: checklist.data ?? [],
    rate,
  };
}

/**
 * The trip a write belongs to.
 *
 * Deliberately resolved on the server rather than taken from the client: a
 * trip id arriving in a form payload is a way to write into someone else's
 * holiday by editing a hidden field, and nothing in the planner ever needs to
 * write to a trip other than the one on screen.
 */
/** Every trip, soonest first, for the picker. */
export async function getTrips(): Promise<Trip[]> {
  const { data } = await supabase.from("trips").select().order("starts_on");
  return data ?? [];
}

export async function currentTripId(): Promise<string | null> {
  return (await getCurrentTrip())?.id ?? null;
}
