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

/** Counts for the host hub card, without hauling the whole board over. */
export async function getHoneymoonSummary() {
  const { data } = await supabase
    .from("trip_items")
    .select("on_date, booking_status, booking_opens_on");

  const items = data ?? [];
  const today = new Date().toISOString().slice(0, 10);

  return {
    ideas: items.filter((i) => i.on_date === null).length,
    placed: items.filter((i) => i.on_date !== null).length,
    // Anything whose booking window has opened and that is still not booked.
    actionable: items.filter(
      (i) =>
        (i.booking_status === "idea" || i.booking_status === "to_book") &&
        i.booking_opens_on !== null &&
        i.booking_opens_on <= today,
    ).length,
  };
}
