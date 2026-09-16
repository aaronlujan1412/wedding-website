"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { HOST_COOKIE, isValidSessionToken } from "@/lib/admin-session";
import { currentTripId } from "@/lib/honeymoon-queries";
import type { ChecklistItem, Planner } from "@/components/honeymoon/types";

/**
 * Actions behind every checklist in the planner — flight essentials now,
 * packing later. Nothing here knows what a list is for; `list` is just a key.
 */

async function isHost() {
  const store = await cookies();
  return isValidSessionToken(store.get(HOST_COOKIE)?.value);
}

const DENIED = { data: null, error: "Not authorised." };

function refresh() {
  revalidatePath("/honeymoon", "layout");
}

const LIST_KEY = /^[a-z]+(:[0-9a-f-]{36})?$/;

async function nextPosition(list: string) {
  const { data } = await supabase
    .from("trip_checklist_items")
    .select("position")
    .eq("list", list)
    .order("position", { ascending: false })
    .limit(1);
  return (data?.[0]?.position ?? 0) + 1;
}

/** One item, or several at once — "add the usual essentials" is one click. */
export async function addChecklistItems(
  list: string,
  labels: string[],
  owner: Planner | null = null,
) {
  if (!(await isHost())) return DENIED;
  if (!LIST_KEY.test(list))
    return { data: null, error: "That isn't a checklist." };

  const clean = labels.map((l) => l.trim()).filter(Boolean);
  if (clean.length === 0)
    return { data: null, error: "Type what to add first." };

  const trip = await currentTripId();
  if (!trip) {
    return { data: null, error: "There's no trip yet. Make one first." };
  }

  const start = await nextPosition(list);
  const { data, error } = await supabase
    .from("trip_checklist_items")
    .insert(
      // Every column spelled out: a batch insert sends NULL for omissions.
      clean.map((label, i) => ({
        trip_id: trip,
        list,
        label,
        owner,
        done: false,
        position: start + i,
      })),
    )
    .select();

  if (error) return { data: null, error: error.message };

  refresh();
  return { data: data as ChecklistItem[], error: null };
}

export async function updateChecklistItem(
  id: string,
  patch: { done?: boolean; owner?: Planner | null; label?: string },
) {
  if (!(await isHost())) return DENIED;

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.done !== undefined) update.done = patch.done;
  if (patch.owner !== undefined) update.owner = patch.owner;
  if (patch.label !== undefined) {
    if (!patch.label.trim())
      return { data: null, error: "An item needs a name." };
    update.label = patch.label.trim();
  }

  const { error } = await supabase
    .from("trip_checklist_items")
    .update(update)
    .eq("id", id);
  if (error) return { data: null, error: error.message };

  refresh();
  return { data: true, error: null };
}

export async function deleteChecklistItem(id: string) {
  if (!(await isHost())) return DENIED;

  const { error } = await supabase
    .from("trip_checklist_items")
    .delete()
    .eq("id", id);
  if (error) return { data: null, error: error.message };

  refresh();
  return { data: true, error: null };
}
