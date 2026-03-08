"use server";

import { supabase } from "@/lib/supabase";

export async function getAllGuests() {
  const data = await supabase.from("guests").select();
  return data;
}

export async function getAllGuestGroups() {
  const data = await supabase.from("guest_groups").select();
  return data;
}

export async function getGuestsFromGroupId(groupId: number) {
  const data = await supabase.from("guests").select().eq("group_id", groupId);
  return data;
}
