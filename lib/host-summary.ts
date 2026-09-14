import "server-only";

import { supabase } from "./supabase";

/**
 * At-a-glance counts for the host hub. Server-component only — see the note in
 * `rsvp-queries.ts` about keeping reads off the action surface.
 *
 * `head: true` means Postgres returns the count without any rows, so this
 * stays cheap even once the album fills up.
 */
export async function getHostSummary() {
  const [photos, hidden, awaiting] = await Promise.all([
    supabase.from("guest_photos").select("*", { count: "exact", head: true }),
    supabase
      .from("guest_photos")
      .select("*", { count: "exact", head: true })
      .eq("hidden", true),
    supabase
      .from("guests")
      .select("*", { count: "exact", head: true })
      .is("attending", null),
  ]);

  return {
    photos: photos.count ?? 0,
    hiddenPhotos: hidden.count ?? 0,
    awaitingReply: awaiting.count ?? 0,
    honeymoon: await getHoneymoonCounts(),
  };
}

/**
 * The honeymoon board's line on the hub. `actionable` is the one that matters:
 * things whose booking window has already opened and that still aren't booked.
 * In Japan that gap is measured in minutes for the popular ones.
 */
async function getHoneymoonCounts() {
  const today = new Date().toISOString().slice(0, 10);

  const [ideas, placed, actionable] = await Promise.all([
    supabase
      .from("trip_items")
      .select("*", { count: "exact", head: true })
      .is("on_date", null),
    supabase
      .from("trip_items")
      .select("*", { count: "exact", head: true })
      .not("on_date", "is", null),
    supabase
      .from("trip_items")
      .select("*", { count: "exact", head: true })
      .in("booking_status", ["idea", "to_book"])
      .not("booking_opens_on", "is", null)
      .lte("booking_opens_on", today),
  ]);

  return {
    ideas: ideas.count ?? 0,
    placed: placed.count ?? 0,
    actionable: actionable.count ?? 0,
  };
}
