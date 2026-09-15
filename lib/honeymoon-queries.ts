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
  const [legs, days, items, docs, flights, stays, rate] = await Promise.all([
    supabase.from("trip_legs").select().order("starts_on"),
    supabase.from("trip_days").select().order("on_date"),
    supabase.from("trip_items").select().order("position"),
    supabase.from("trip_docs").select().order("category").order("position"),
    supabase.from("trip_flights").select().order("departs_at"),
    supabase.from("trip_stays").select().order("check_in_on"),
    getRate(),
  ]);

  return {
    legs: legs.data ?? [],
    days: days.data ?? [],
    items: items.data ?? [],
    docs: docs.data ?? [],
    flights: flights.data ?? [],
    stays: stays.data ?? [],
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
