import { LANES } from "./trip";
import type {
  Note,
  Notebook,
  TripDay,
  TripFlight,
  TripItem,
  TripStay,
  TripTransit,
} from "./types";

/**
 * The Notes tab, minus the drawing.
 *
 * A notebook is a name and, usually, whose it is — it carries the ownership so
 * the notes inside it don't have to. One notebook isn't stored at all: "On the
 * board" gathers the notes already written on days, cards, hotels, rides and
 * flights, because the planner had five places to type before this tab existed
 * and a sixth that ignored them would have been worse than none.
 */

/** The built-in notebook, which has no row and can't be written in. */
export const BOARD_NOTEBOOK = "board";

/** A notebook's ink: its owner's lane, or Decided's green when it's shared. */
export function notebookAccent(owner: Notebook["owner"]): string {
  return LANES[owner ?? "decided"].accent;
}

export function notebookTint(owner: Notebook["owner"]): string {
  return LANES[owner ?? "decided"].tint;
}

/**
 * What to call a note in a list. A note is worth keeping before it's worth
 * naming, so an unnamed one is called by its first line and only falls back to
 * "Untitled" while it is genuinely empty.
 */
export function noteTitle(note: Pick<Note, "title" | "body">): string {
  if (note.title.trim()) return note.title.trim();
  const first = note.body
    .split("\n")
    .map(plainly)
    .find((line) => line.length > 0);
  return first || "Untitled";
}

/** The line under the title in the list: the body, without its markup. */
export function notePreview(note: Pick<Note, "title" | "body">): string {
  const lines = note.body.split("\n").map(plainly).filter(Boolean);
  // The first line is already the title when there isn't one.
  const rest = note.title.trim() ? lines : lines.slice(1);
  return rest.join(" · ").slice(0, 120);
}

/** Markdown read as a person reads it: the marks are punctuation, not content. */
function plainly(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s*/, "")
    .replace(/^\s*[-*+]\s+/, "")
    .replace(/^\s*\d+\.\s+/, "")
    .replace(/^\s*>\s?/, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_~`]/g, "")
    .trim();
}

/** A note written somewhere else on the trip, and how to get back to it. */
export type Attached = {
  key: string;
  /** The tab it lives on, in that tab's own words. */
  where: string;
  title: string;
  note: string;
  href: string;
};

export function attachedNotes(rows: {
  days: TripDay[];
  items: TripItem[];
  stays: TripStay[];
  transit: TripTransit[];
  flights: TripFlight[];
}): Attached[] {
  const out: Attached[] = [];

  for (const day of rows.days) {
    if (!day.note?.trim()) continue;
    out.push({
      key: `day-${day.on_date}`,
      where: "Day",
      title: day.title?.trim() || day.on_date,
      note: day.note,
      href: `/honeymoon?day=${day.on_date}`,
    });
  }
  for (const item of rows.items) {
    if (!item.notes?.trim()) continue;
    out.push({
      key: `item-${item.id}`,
      where: "Card",
      title: item.title,
      note: item.notes,
      href: item.on_date ? `/honeymoon?day=${item.on_date}` : "/honeymoon",
    });
  }
  for (const stay of rows.stays) {
    if (!stay.notes?.trim()) continue;
    out.push({
      key: `stay-${stay.id}`,
      where: "Hotel",
      title: stay.name,
      note: stay.notes,
      href: "/honeymoon/lodging",
    });
  }
  for (const ride of rows.transit) {
    if (!ride.notes?.trim()) continue;
    out.push({
      key: `ride-${ride.id}`,
      where: "Ride",
      title: `${ride.from_place} → ${ride.to_place}`,
      note: ride.notes,
      href: "/honeymoon/transit",
    });
  }
  for (const flight of rows.flights) {
    if (!flight.notes?.trim()) continue;
    out.push({
      key: `flight-${flight.id}`,
      where: "Flight",
      title: `${flight.from_airport} → ${flight.to_airport}`,
      note: flight.notes,
      href: "/honeymoon/flights",
    });
  }

  return out;
}
