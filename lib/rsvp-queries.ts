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

/**
 * Full guest-group rows, including the address columns.
 *
 * Kept separate from the `getAllGuestGroups` server action on purpose: that one
 * feeds the public RSVP picker and is deliberately narrowed to `id, name`. The
 * ledger is host-only and server-rendered, so it can have the addresses.
 */
export async function getGuestGroupsForLedger() {
  const { data, error } = await supabase
    .from("guest_groups")
    .select()
    .order("name");

  return { data, error };
}
