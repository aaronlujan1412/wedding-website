import { supabase } from "@/lib/supabase";
import { getRate } from "@/lib/fx";
import type { TripBoard } from "@/components/honeymoon/types";

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
  const [legs, days, items, docs, flights, stays, transit, rate] =
    await Promise.all([
      supabase.from("trip_legs").select().order("starts_on"),
      supabase.from("trip_days").select().order("on_date"),
      supabase.from("trip_items").select().order("position"),
      supabase.from("trip_docs").select().order("category").order("position"),
      supabase.from("trip_flights").select().order("departs_at"),
      supabase.from("trip_stays").select().order("check_in_on"),
      supabase.from("trip_transit").select().order("departs_at"),
      getRate(),
    ]);

  return {
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
  const [transit, legs, checklist, rate] = await Promise.all([
    supabase.from("trip_transit").select().order("departs_at"),
    supabase.from("trip_legs").select().order("starts_on"),
    supabase
      .from("trip_checklist_items")
      .select()
      .like("list", "transit:%")
      .order("position"),
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
  const [flights, checklist, rate] = await Promise.all([
    supabase.from("trip_flights").select().order("departs_at"),
    supabase
      .from("trip_checklist_items")
      .select()
      .like("list", "flight:%")
      .order("position"),
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
  const [routes, stays, decided, rate] = await Promise.all([
    supabase.from("trip_route_proposals").select().order("position"),
    supabase.from("trip_stay_proposals").select().order("position"),
    supabase.from("trip_stays").select().eq("lane", "decided").order("check_in_on"),
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
  const [stays, legs, flights, checklist, rate] = await Promise.all([
    supabase.from("trip_stays").select().order("check_in_on"),
    supabase.from("trip_legs").select().order("starts_on"),
    supabase.from("trip_flights").select().order("departs_at"),
    supabase
      .from("trip_checklist_items")
      .select()
      .like("list", "stay:%")
      .order("position"),
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
