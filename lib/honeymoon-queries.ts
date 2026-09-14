import { supabase } from "@/lib/supabase";
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
  const [legs, days, items, docs] = await Promise.all([
    supabase.from("trip_legs").select().order("position").order("starts_on"),
    supabase.from("trip_days").select().order("on_date"),
    supabase.from("trip_items").select().order("position"),
    supabase.from("trip_docs").select().order("category").order("position"),
  ]);

  return {
    legs: legs.data ?? [],
    days: days.data ?? [],
    items: items.data ?? [],
    docs: docs.data ?? [],
  };
}
