import { supabase } from "@/lib/supabase";

/**
 * Reads backing the host-only guest ledger.
 *
 * Deliberately NOT in a `"use server"` module. Every export of one of those
 * becomes a callable POST endpoint, and `proxy.ts` guards the `/rsvp-list`
 * page — not action invocations against it. Since this is only ever called
 * from a server component, a plain function keeps it off the action manifest
 * entirely, so there is no endpoint to reach in the first place.
 */
export async function getAllGuestRsvps() {
  const { data, error } = await supabase
    .from("guests")
    .select(
      "id, name, attending, plus_one_name, group_id, dietary_type, dietary_details, song_request, notes, contact_number",
    )
    .order("name");

  return { data, error };
}
