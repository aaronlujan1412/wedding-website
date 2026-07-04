"use server";

import { supabase } from "@/lib/supabase";
import {
  type GroupResult,
  failed,
  ok,
  REJECTED,
} from "@/components/rsvp/types";

export async function getAllGuests() {
  const data = await supabase.from("guests").select();
  return data;
}

export async function getAllGuestGroups() {
  const data = await supabase.from("guest_groups").select();
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
  return ok(data, submitter.id);
}
