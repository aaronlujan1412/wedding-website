"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { HOST_COOKIE, isValidSessionToken } from "@/lib/admin-session";
import type {
  BookingStatus,
  DocCategory,
  ItemKind,
  Planner,
  TripDoc,
  TripItem,
  TripLeg,
} from "@/components/honeymoon/types";

async function isHost() {
  const store = await cookies();
  return isValidSessionToken(store.get(HOST_COOKIE)?.value);
}

const DENIED = { data: null, error: "Not authorised." };

function refresh() {
  revalidatePath("/honeymoon");
  revalidatePath("/honeymoon/itinerary");
  revalidatePath("/honeymoon/pocket");
  revalidatePath("/hosts");
}

/** Empty strings from a form field mean "not set", not "set to empty". */
function blankToNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export type ItemInput = {
  title: string;
  title_ja?: string | null;
  kind: ItemKind;
  on_date?: string | null;
  start_time?: string | null;
  duration_min?: number | null;
  pinned?: boolean;
  booking_status?: BookingStatus;
  booking_url?: string | null;
  booking_opens_on?: string | null;
  booking_ref?: string | null;
  closed_days?: number[];
  cost_yen?: number | null;
  city?: string | null;
  address?: string | null;
  map_url?: string | null;
  url?: string | null;
  notes?: string | null;
  added_by?: Planner;
  must_do?: boolean;
};

function normalise(input: ItemInput) {
  return {
    title: input.title.trim(),
    title_ja: blankToNull(input.title_ja),
    kind: input.kind,
    on_date: blankToNull(input.on_date),
    start_time: blankToNull(input.start_time),
    duration_min:
      input.duration_min && input.duration_min > 0 ? input.duration_min : null,
    pinned: input.pinned ?? false,
    booking_status: input.booking_status ?? "idea",
    booking_url: blankToNull(input.booking_url),
    booking_opens_on: blankToNull(input.booking_opens_on),
    booking_ref: blankToNull(input.booking_ref),
    closed_days: input.closed_days ?? [],
    cost_yen: input.cost_yen && input.cost_yen >= 0 ? input.cost_yen : null,
    city: blankToNull(input.city),
    address: blankToNull(input.address),
    map_url: blankToNull(input.map_url),
    url: blankToNull(input.url),
    notes: blankToNull(input.notes),
    added_by: input.added_by ?? "aaron",
    must_do: input.must_do ?? false,
  };
}

/** Next free slot at the bottom of a column. */
async function nextPosition(onDate: string | null) {
  const query = supabase
    .from("trip_items")
    .select("position")
    .order("position", { ascending: false })
    .limit(1);

  const { data } = await (onDate === null
    ? query.is("on_date", null)
    : query.eq("on_date", onDate));

  return (data?.[0]?.position ?? 0) + 1;
}

export async function createItem(input: ItemInput) {
  if (!(await isHost())) return DENIED;

  const row = normalise(input);
  if (!row.title) return { data: null, error: "Give it a name first." };

  const { data, error } = await supabase
    .from("trip_items")
    .insert({ ...row, position: await nextPosition(row.on_date) })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  refresh();
  return { data: data as TripItem, error: null };
}

export async function updateItem(id: string, input: ItemInput) {
  if (!(await isHost())) return DENIED;

  const row = normalise(input);
  if (!row.title) return { data: null, error: "Give it a name first." };

  const { data, error } = await supabase
    .from("trip_items")
    .update({ ...row, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  refresh();
  return { data: data as TripItem, error: null };
}

/**
 * A drag. The client has already worked out the fractional position from the
 * neighbours it dropped between, so this is one row write.
 */
export async function moveItem(
  id: string,
  onDate: string | null,
  position: number,
) {
  if (!(await isHost())) return DENIED;

  const { error } = await supabase
    .from("trip_items")
    .update({
      on_date: onDate,
      position,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { data: null, error: error.message };

  refresh();
  return { data: true, error: null };
}

/** Quick toggle from the card face, without opening the whole form. */
export async function setBookingStatus(id: string, status: BookingStatus) {
  if (!(await isHost())) return DENIED;

  const { error } = await supabase
    .from("trip_items")
    .update({ booking_status: status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { data: null, error: error.message };

  refresh();
  return { data: true, error: null };
}

export async function deleteItem(id: string) {
  if (!(await isHost())) return DENIED;

  const { error } = await supabase.from("trip_items").delete().eq("id", id);
  if (error) return { data: null, error: error.message };

  refresh();
  return { data: true, error: null };
}

/**
 * Rewrites a day's order so timed cards run chronologically and loose cards
 * keep their relative order at the end. Dragging never reorders behind your
 * back — this is the explicit "fix it" button instead.
 */
export async function sortDayByTime(onDate: string) {
  if (!(await isHost())) return DENIED;

  const { data, error } = await supabase
    .from("trip_items")
    .select("id, start_time, position")
    .eq("on_date", onDate)
    .order("position");

  if (error) return { data: null, error: error.message };

  const rows = data ?? [];
  const timed = rows.filter((r) => r.start_time !== null);
  const loose = rows.filter((r) => r.start_time === null);
  timed.sort((a, b) => (a.start_time! < b.start_time! ? -1 : 1));

  const ordered = [...timed, ...loose];
  await Promise.all(
    ordered.map((row, i) =>
      supabase.from("trip_items").update({ position: i + 1 }).eq("id", row.id),
    ),
  );

  refresh();
  return { data: true, error: null };
}

/* ----------------------------------------------------------------- legs -- */

export type LegInput = {
  name: string;
  name_ja?: string | null;
  starts_on: string;
  ends_on: string;
  lodging_name?: string | null;
  lodging_address?: string | null;
  lodging_url?: string | null;
  lodging_confirmation?: string | null;
  lodging_check_in?: string | null;
  lodging_check_out?: string | null;
  note?: string | null;
};

function normaliseLeg(input: LegInput) {
  return {
    name: input.name.trim(),
    name_ja: blankToNull(input.name_ja),
    starts_on: input.starts_on,
    ends_on: input.ends_on,
    lodging_name: blankToNull(input.lodging_name),
    lodging_address: blankToNull(input.lodging_address),
    lodging_url: blankToNull(input.lodging_url),
    lodging_confirmation: blankToNull(input.lodging_confirmation),
    lodging_check_in: blankToNull(input.lodging_check_in),
    lodging_check_out: blankToNull(input.lodging_check_out),
    note: blankToNull(input.note),
  };
}

export async function saveLeg(id: string | null, input: LegInput) {
  if (!(await isHost())) return DENIED;

  const row = normaliseLeg(input);
  if (!row.name) return { data: null, error: "Give the leg a name." };
  if (row.ends_on < row.starts_on) {
    return { data: null, error: "That leg ends before it starts." };
  }

  const { data, error } = id
    ? await supabase.from("trip_legs").update(row).eq("id", id).select().single()
    : await supabase
        .from("trip_legs")
        .insert({ ...row, position: await nextLegPosition() })
        .select()
        .single();

  if (error) return { data: null, error: error.message };

  refresh();
  return { data: data as TripLeg, error: null };
}

async function nextLegPosition() {
  const { data } = await supabase
    .from("trip_legs")
    .select("position")
    .order("position", { ascending: false })
    .limit(1);

  return (data?.[0]?.position ?? 0) + 1;
}

/**
 * Legs own the date range, not the cards, so dropping one leaves its items
 * stranded on days the board no longer draws. Sweep them back to the pool.
 */
export async function deleteLeg(id: string) {
  if (!(await isHost())) return DENIED;

  const { data: leg } = await supabase
    .from("trip_legs")
    .select("starts_on, ends_on")
    .eq("id", id)
    .single();

  if (leg) {
    await supabase
      .from("trip_items")
      .update({ on_date: null })
      .gte("on_date", leg.starts_on)
      .lte("on_date", leg.ends_on);
  }

  const { error } = await supabase.from("trip_legs").delete().eq("id", id);
  if (error) return { data: null, error: error.message };

  refresh();
  return { data: true, error: null };
}

/* ----------------------------------------------------------------- days -- */

export async function saveDayNote(
  onDate: string,
  title: string | null,
  note: string | null,
) {
  if (!(await isHost())) return DENIED;

  const { error } = await supabase.from("trip_days").upsert({
    on_date: onDate,
    title: blankToNull(title),
    note: blankToNull(note),
  });

  if (error) return { data: null, error: error.message };

  refresh();
  return { data: true, error: null };
}

/* ----------------------------------------------------------------- docs -- */

export type DocInput = {
  category: DocCategory;
  title: string;
  detail?: string | null;
  confirmation?: string | null;
  url?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  cost_yen?: number | null;
};

export async function saveDoc(id: string | null, input: DocInput) {
  if (!(await isHost())) return DENIED;

  const row = {
    category: input.category,
    title: input.title.trim(),
    detail: blankToNull(input.detail),
    confirmation: blankToNull(input.confirmation),
    url: blankToNull(input.url),
    starts_at: blankToNull(input.starts_at),
    ends_at: blankToNull(input.ends_at),
    cost_yen: input.cost_yen && input.cost_yen >= 0 ? input.cost_yen : null,
  };

  if (!row.title) return { data: null, error: "Give it a name first." };

  const { data, error } = id
    ? await supabase.from("trip_docs").update(row).eq("id", id).select().single()
    : await supabase.from("trip_docs").insert(row).select().single();

  if (error) return { data: null, error: error.message };

  refresh();
  return { data: data as TripDoc, error: null };
}

export async function deleteDoc(id: string) {
  if (!(await isHost())) return DENIED;

  const { error } = await supabase.from("trip_docs").delete().eq("id", id);
  if (error) return { data: null, error: error.message };

  refresh();
  return { data: true, error: null };
}
