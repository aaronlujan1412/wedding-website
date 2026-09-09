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
  };
}
