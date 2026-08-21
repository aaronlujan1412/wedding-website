"use server";

import { supabase } from "@/lib/supabase";
import {
  type GroupResult,
  failed,
  ok,
  REJECTED,
} from "@/components/rsvp/types";
import { GuestGroup, Guest } from "@/components/rsvp/types";

export async function getAllGuestGroups() {
  // Only the columns the picker renders. This action is called from a client
  // component by unauthenticated visitors, so a bare select() shipped every
  // household's street address to anyone who opened the RSVP dialog.
  const data = await supabase
    .from("guest_groups")
    .select("id, name")
    .order("name");
  return data;
}

export async function getGroupFromGroupId(
  groupId: number,
  verificationInput: string,
): Promise<GroupResult> {
  const { data, error } = await supabase
    .from("guests")
    .select()
    .eq("group_id", groupId);

  if (error || data === null) {
    return failed(error);
  }

  const submitter = data.find(
    (g) => g.contact_number.slice(-4) === verificationInput,
  );

  if (!submitter) {
    return REJECTED;
  }

  // Fetched only after the last-four check passes, so the address never leaves
  // the server for a caller who hasn't proven they belong to this group.
  const { data: group, error: groupError } = await supabase
    .from("guest_groups")
    .select()
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    return failed(groupError);
  }

  return ok(data, group, submitter.id);
}

export async function putGuestInformation(group: GuestGroup, members: Guest[]) {
  const { data: realGuests } = await supabase
    .from("guests")
    .select("id, plus_one_allowed")
    .eq("group_id", group.id);

  const allowedById = new Map(
    realGuests?.map((g) => [g.id, g.plus_one_allowed]),
  );

  const { error: groupError } = await supabase
    .from("guest_groups")
    .update({
      address_street: group.address_street,
      address_city: group.address_city,
      address_state: group.address_state,
      address_zip: group.address_zip,
    })
    .eq("id", group.id);

  if (groupError) {
    return { data: null, error: groupError };
  }

  const results = await Promise.all(
    members.map((m) => {
      const dietaryType = m.dietary_type ?? "none";
      return supabase
        .from("guests")
        .update({
          attending: m.attending,
          plus_one_name: allowedById.get(m.id) ? m.plus_one_name : null,
          dietary_type: dietaryType,
          dietary_details: dietaryType === "none" ? [] : m.dietary_details,
          song_request: m.song_request,
          notes: m.notes,
        })
        .eq("id", m.id);
    }),
  );

  const firstError = results.find((r) => r.error)?.error ?? null;
  return { data: firstError ? null : true, error: firstError };
}
