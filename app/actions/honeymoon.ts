"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { HOST_COOKIE, isValidSessionToken } from "@/lib/admin-session";
import { currentTripId } from "@/lib/honeymoon-queries";
import { compare } from "@/components/honeymoon/trip";
import type {
  BookingStatus,
  Currency,
  DocCategory,
  ItemKind,
  Lane,
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
  revalidatePath("/honeymoon/lodging");
  revalidatePath("/hosts");
}

/**
 * A cost from a form. Zero is a real price — Fushimi Inari is free — so this
 * checks for a number rather than truthiness, which would save "free" as
 * "unknown".
 */
function cleanCost(
  amount: number | null | undefined,
  currency: Currency | undefined,
) {
  const valid =
    typeof amount === "number" && Number.isInteger(amount) && amount >= 0;
  return {
    cost_amount: valid ? amount : null,
    cost_currency: currency === "USD" ? ("USD" as const) : ("JPY" as const),
  };
}

/** Empty strings from a form field mean "not set", not "set to empty". */
function blankToNull(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export type ItemInput = {
  title: string;
  lane?: Lane;
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
  /** When the place is open, the same on every day it isn't shut. */
  opens_at?: string | null;
  closes_at?: string | null;
  /** Smallest unit of `cost_currency`: whole yen, or US cents. */
  cost_amount?: number | null;
  cost_currency?: Currency;
  city?: string | null;
  address?: string | null;
  map_url?: string | null;
  url?: string | null;
  notes?: string | null;
  added_by?: Planner;
  must_do?: boolean;
  /**
   * What a blockout points at. Both are overrides rather than requirements: a
   * rest card normally infers the stay covering its night, and a travel card
   * reads fine with just its own title until a ride is actually booked.
   */
  linked_stay_id?: string | null;
  linked_transit_id?: string | null;
};

function normalise(input: ItemInput) {
  return {
    title: input.title.trim(),
    lane: input.lane ?? "decided",
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
    opens_at: blankToNull(input.opens_at),
    closes_at: blankToNull(input.closes_at),
    ...cleanCost(input.cost_amount, input.cost_currency),
    city: blankToNull(input.city),
    // Only a blockout of the matching sort can carry a link, so switching a
    // card back to an activity drops it rather than leaving a dangling row.
    linked_stay_id:
      input.kind === "rest" ? (input.linked_stay_id ?? null) : null,
    linked_transit_id:
      input.kind === "travel" ? (input.linked_transit_id ?? null) : null,
    address: blankToNull(input.address),
    map_url: blankToNull(input.map_url),
    url: blankToNull(input.url),
    notes: blankToNull(input.notes),
    added_by: input.added_by ?? "aaron",
    must_do: input.must_do ?? false,
  };
}

/** Next free slot at the bottom of a cell — ordering is scoped to lane + day. */
async function nextPosition(lane: Lane, onDate: string | null) {
  const query = supabase
    .from("trip_items")
    .select("position")
    .eq("lane", lane)
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

  const trip = await currentTripId();
  if (!trip) {
    return { data: null, error: "There's no trip yet. Make one first." };
  }

  const { data, error } = await supabase
    .from("trip_items")
    .insert({
      ...row,
      trip_id: trip,
      position: await nextPosition(row.lane, row.on_date),
    })
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
 * neighbours it dropped between, so this is one row write — across lanes as
 * well as across days, since promoting a card is just a move into `decided`.
 */
export async function moveItem(
  id: string,
  lane: Lane,
  onDate: string | null,
  position: number,
) {
  if (!(await isHost())) return DENIED;

  const { error } = await supabase
    .from("trip_items")
    .update({
      lane,
      on_date: onDate,
      position,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { data: null, error: error.message };

  refresh();
  return { data: true, error: null };
}

/**
 * A drop in the Hours layout. Where a card lands on the hours is when it
 * starts, so the time is written along with the move — and a drop onto the
 * Sometime shelf writes `start_time` null, the way the pile is `on_date` null.
 */
export async function scheduleItem(
  id: string,
  lane: Lane,
  onDate: string | null,
  startTime: string | null,
  position: number,
) {
  if (!(await isHost())) return DENIED;
  if (startTime !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
    return { data: null, error: "That isn't a time of day." };
  }

  const { error } = await supabase
    .from("trip_items")
    .update({
      lane,
      on_date: onDate,
      start_time: startTime,
      position,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { data: null, error: error.message };

  refresh();
  return { data: true, error: null };
}

/** Dragging a card's bottom edge in the Hours layout. */
export async function setItemDuration(id: string, minutes: number) {
  if (!(await isHost())) return DENIED;
  if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 24 * 60) {
    return { data: null, error: "That isn't a length of time." };
  }

  const { error } = await supabase
    .from("trip_items")
    .update({ duration_min: minutes, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { data: null, error: error.message };

  refresh();
  return { data: true, error: null };
}

/**
 * Take a copy of someone's idea into another lane, same day, bottom of the
 * cell. The original stays where it is, and `added_by` comes along unchanged —
 * it's still their idea.
 */
export async function copyItem(id: string, lane: Lane) {
  if (!(await isHost())) return DENIED;

  const { data: source, error: readError } = await supabase
    .from("trip_items")
    .select()
    .eq("id", id)
    .single();

  if (readError) return { data: null, error: readError.message };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at, updated_at, position, ...fields } = source;

  const { data, error } = await supabase
    .from("trip_items")
    .insert({
      ...fields,
      lane,
      // The copy belongs to the same trip as the card it came from.
      trip_id: source.trip_id,
      position: await nextPosition(lane, source.on_date),
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  refresh();
  return { data: data as TripItem, error: null };
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
 * Rewrites one cell's order so timed cards run chronologically and loose cards
 * keep their relative order at the end. Dragging never reorders behind your
 * back — this is the explicit "fix it" button instead.
 */
export async function sortDayByTime(onDate: string, lane: Lane = "decided") {
  if (!(await isHost())) return DENIED;

  const { data, error } = await supabase
    .from("trip_items")
    .select("id, start_time, position")
    .eq("lane", lane)
    .eq("on_date", onDate)
    .order("position");

  if (error) return { data: null, error: error.message };

  const rows = data ?? [];
  const timed = rows.filter((r) => r.start_time !== null);
  const loose = rows.filter((r) => r.start_time === null);
  // Ties keep their drag order: a comparator that returns 0 lets the stable
  // sort leave them be.
  timed.sort((a, b) => compare(a.start_time!, b.start_time!));

  const ordered = [...timed, ...loose];
  await Promise.all(
    ordered.map((row, i) =>
      supabase
        .from("trip_items")
        .update({ position: i + 1 })
        .eq("id", row.id),
    ),
  );

  refresh();
  return { data: true, error: null };
}

/* ----------------------------------------------------------------- legs -- */

export type LegInput = {
  lane: Lane;
  name: string;
  name_ja?: string | null;
  starts_on: string;
  ends_on: string;
  note?: string | null;
};

function normaliseLeg(input: LegInput) {
  return {
    lane: input.lane,
    name: input.name.trim(),
    name_ja: blankToNull(input.name_ja),
    starts_on: input.starts_on,
    ends_on: input.ends_on,
    note: blankToNull(input.note),
  };
}

export async function saveLeg(id: string | null, input: LegInput) {
  if (!(await isHost())) return DENIED;
  const trip = await currentTripId();
  if (!trip) {
    return { data: null, error: "There's no trip yet. Make one first." };
  }

  const row = normaliseLeg(input);
  if (!row.name) return { data: null, error: "Give the leg a name." };
  if (row.ends_on < row.starts_on) {
    return { data: null, error: "That leg ends before it starts." };
  }

  const { data, error } = id
    ? await supabase
        .from("trip_legs")
        .update(row)
        .eq("id", id)
        .select()
        .single()
    : await supabase
        .from("trip_legs")
        .insert({ ...row, trip_id: trip, position: await nextLegPosition() })
        .select()
        .single();

  if (error) return { data: null, error: legError(error, row.lane) };

  // Shrinking or moving a leg can uncover dates that still have cards on them.
  await supabase.rpc("sweep_orphaned_trip_items");

  refresh();
  return { data: data as TripLeg, error: null };
}

const LANE_NAMES: Record<Lane, string> = {
  decided: "Decided",
  savea: "Savea's route",
  aaron: "Aaron's route",
};

/**
 * The database refuses overlapping legs within a lane (an exclusion
 * constraint, code 23P01). Say that in words rather than handing back
 * "conflicting key value violates exclusion constraint".
 */
function legError(error: { code?: string; message: string }, lane: Lane) {
  if (error.code === "23P01") {
    return `${LANE_NAMES[lane]} already has a leg on some of those dates. A lane can only be in one place a night — shorten the other leg first.`;
  }
  return error.message;
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
 * The board's columns are every date any lane's legs cover, so removing a leg
 * only strands the cards on dates no other lane covers either. The sweep sends
 * exactly those back to their piles — cards on a date still drawn stay put.
 */
export async function deleteLeg(id: string) {
  if (!(await isHost())) return DENIED;

  const { error } = await supabase.from("trip_legs").delete().eq("id", id);
  if (error) return { data: null, error: error.message };

  await supabase.rpc("sweep_orphaned_trip_items");

  refresh();
  return { data: true, error: null };
}

/**
 * Agree to one draft leg. Copies it into Decided and trims whatever Decided had
 * on those dates — splitting a leg in two if the new one lands in its middle.
 * Done in a Postgres function because it's several writes that must land
 * together, and supabase-js has no transactions.
 */
export async function adoptLeg(id: string) {
  if (!(await isHost())) return DENIED;

  const { data, error } = await supabase.rpc("adopt_trip_leg", { p_leg: id });
  if (error) return { data: null, error: error.message };

  refresh();
  return { data, error: null };
}

/** "Let's just do your route." Replaces every Decided leg with one lane's. */
export async function adoptRoute(lane: Lane) {
  if (!(await isHost())) return DENIED;
  const trip = await currentTripId();
  if (!trip) {
    return { data: null, error: "There's no trip yet. Make one first." };
  }
  if (lane === "decided") {
    return { data: null, error: "Decided is already the decided route." };
  }

  const { data, error } = await supabase.rpc("adopt_trip_route", {
    p_lane: lane,
    p_trip: trip,
  });
  if (error) return { data: null, error: error.message };

  refresh();
  return { data, error: null };
}

/* ----------------------------------------------------------------- days -- */

export async function saveDayNote(
  onDate: string,
  title: string | null,
  note: string | null,
) {
  if (!(await isHost())) return DENIED;
  const trip = await currentTripId();
  if (!trip) {
    return { data: null, error: "There's no trip yet. Make one first." };
  }

  const { error } = await supabase.from("trip_days").upsert({
    trip_id: trip,
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
  cost_amount?: number | null;
  cost_currency?: Currency;
};

export async function saveDoc(id: string | null, input: DocInput) {
  if (!(await isHost())) return DENIED;
  const trip = await currentTripId();
  if (!trip) {
    return { data: null, error: "There's no trip yet. Make one first." };
  }

  const row = {
    category: input.category,
    title: input.title.trim(),
    detail: blankToNull(input.detail),
    confirmation: blankToNull(input.confirmation),
    url: blankToNull(input.url),
    starts_at: blankToNull(input.starts_at),
    ends_at: blankToNull(input.ends_at),
    ...cleanCost(input.cost_amount, input.cost_currency),
  };

  if (!row.title) return { data: null, error: "Give it a name first." };

  const { data, error } = id
    ? await supabase
        .from("trip_docs")
        .update(row)
        .eq("id", id)
        .select()
        .single()
    : await supabase
        .from("trip_docs")
        .insert({ ...row, trip_id: trip })
        .select()
        .single();

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

/**
 * Put a card on a wander block's list, or take it off with `wanderId: null`.
 *
 * Its own write rather than part of the item form, because it is edited from
 * the wander block's dialog while the card being changed is a different row —
 * and because ticking a dozen things onto an afternoon shouldn't mean opening
 * a dozen forms.
 */
export async function setWanderItem(id: string, wanderId: string | null) {
  if (!(await isHost())) return DENIED;

  const { error } = await supabase
    .from("trip_items")
    .update({ wander_id: wanderId, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { data: null, error: error.message };

  refresh();
  return { data: true, error: null };
}

/**
 * Put a deleted card back, exactly as it was.
 *
 * The board's × deletes on one click and offers an undo rather than asking
 * first: there are a hundred cards to clear out of a pile and a confirm dialog
 * on each one is its own kind of punishment. The whole row goes to the client
 * on every render, so restoring is an insert of what was already there — same
 * id, same lane, same day, same position in the cell.
 *
 * One thing does not come back: cards that pointed at this one as their wander
 * block were set to null by the delete, and this does not re-link them.
 */
export async function restoreItem(row: TripItem) {
  if (!(await isHost())) return DENIED;

  const { error } = await supabase.from("trip_items").insert(row);
  if (error) return { data: null, error: error.message };

  refresh();
  return { data: true, error: null };
}

/* ---------------------------------------------------------------- notes -- */

/**
 * Notebooks and the notes in them.
 *
 * A note saves while it is still being written, so `saveNote` is called far
 * more often than any other write here: it returns the row rather than
 * revalidating every planner page, and only a note tied to a day refreshes the
 * pages that draw it.
 */
export async function saveNotebook(
  id: string | null,
  name: string,
  owner: Planner | null,
) {
  if (!(await isHost())) return DENIED;
  const trip = await currentTripId();
  if (!trip) {
    return { data: null, error: "There's no trip yet. Make one first." };
  }
  const title = name.trim();
  if (!title) return { data: null, error: "A notebook needs a name." };

  const now = new Date().toISOString();
  const { data, error } = id
    ? await supabase
        .from("trip_notebooks")
        .update({ name: title, owner, updated_at: now })
        .eq("id", id)
        .select()
        .single()
    : await supabase
        .from("trip_notebooks")
        .insert({ trip_id: trip, name: title, owner, position: Date.now() })
        .select()
        .single();

  if (error) return { data: null, error: error.message };
  revalidatePath("/honeymoon/notes");
  return { data, error: null };
}

/**
 * Deleting a notebook takes its notes with it (`on delete cascade`), so the
 * caller has to have said so. An empty one goes without ceremony.
 */
export async function deleteNotebook(id: string) {
  if (!(await isHost())) return DENIED;

  const { error } = await supabase.from("trip_notebooks").delete().eq("id", id);
  if (error) return { data: null, error: error.message };

  revalidatePath("/honeymoon/notes");
  return { data: true, error: null };
}

export type NoteInput = {
  title?: string;
  body?: string;
  /** A day this note is about, or null to set it loose again. */
  on_date?: string | null;
};

export async function saveNote(
  id: string | null,
  notebookId: string,
  input: NoteInput,
  /**
   * The note's `updated_at` as the writer last saw it. Both of them share one
   * login and the tab refreshes itself, so the same note can be open twice.
   * When it has moved on since, the other version is kept below a rule rather
   * than overwritten — the save that loses a paragraph is the one nobody
   * forgives.
   */
  expected?: string | null,
) {
  if (!(await isHost())) return DENIED;
  const trip = await currentTripId();
  if (!trip) {
    return { data: null, error: "There's no trip yet. Make one first." };
  }

  let body = input.body ?? "";
  if (id && expected) {
    const { data: current } = await supabase
      .from("trip_notes")
      .select("body, updated_at")
      .eq("id", id)
      .maybeSingle();
    if (
      current &&
      current.updated_at !== expected &&
      current.body.trim() &&
      current.body !== body
    ) {
      const at = new Date(current.updated_at).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      body = `${body}\n\n---\n\n_Written in another window at ${at}:_\n\n${current.body}`;
    }
  }

  const fields = {
    title: input.title?.trim() ?? "",
    body,
    on_date: blankToNull(input.on_date),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = id
    ? await supabase
        .from("trip_notes")
        .update(fields)
        .eq("id", id)
        .select()
        .single()
    : await supabase
        .from("trip_notes")
        .insert({ ...fields, trip_id: trip, notebook_id: notebookId })
        .select()
        .single();

  if (error) return { data: null, error: error.message };

  // Only a note pinned to a day shows up anywhere else.
  if (fields.on_date) revalidatePath("/honeymoon/itinerary");
  return { data, error: null };
}

export async function deleteNote(id: string) {
  if (!(await isHost())) return DENIED;

  const { error } = await supabase.from("trip_notes").delete().eq("id", id);
  if (error) return { data: null, error: error.message };

  revalidatePath("/honeymoon/notes");
  revalidatePath("/honeymoon/itinerary");
  return { data: true, error: null };
}
