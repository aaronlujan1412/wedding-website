import { LANES, formatDayShort } from "./trip";
import type {
  ItemKind,
  Note,
  Notebook,
  TripDay,
  TripFlight,
  TripItem,
  TripStay,
  TripTransit,
} from "./types";

/**
 * The trip as a note can refer to it: only the columns a link or a chip needs.
 */
export type NoteSources = {
  days: Pick<TripDay, "on_date" | "title" | "note">[];
  items: Pick<TripItem, "id" | "title" | "kind" | "on_date" | "notes">[];
  stays: Pick<TripStay, "id" | "name" | "check_in_on" | "notes">[];
  transit: Pick<
    TripTransit,
    "id" | "from_place" | "to_place" | "departs_at" | "notes"
  >[];
  flights: Pick<
    TripFlight,
    "id" | "from_airport" | "to_airport" | "departs_at" | "notes"
  >[];
};

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
    .map(plainText)
    .find((line) => line.length > 0);
  return first || "Untitled";
}

/** The line under the title in the list: the body, without its markup. */
export function notePreview(note: Pick<Note, "title" | "body">): string {
  const lines = note.body.split("\n").map(plainText).filter(Boolean);
  // The first line is already the title when there isn't one.
  const rest = note.title.trim() ? lines : lines.slice(1);
  return rest.join(" · ").slice(0, 120);
}

/** Markdown read as a person reads it: the marks are punctuation, not content. */
export function plainText(line: string): string {
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

export function attachedNotes(rows: NoteSources): Attached[] {
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

/* -------------------------------------------------------------- mentions -- */

/**
 * Something on the trip a note can point at.
 *
 * The link stores the thing's id, never its name, so a card renamed on the
 * board is renamed in every note that mentions it. A chip that can't be
 * matched any more — the card was deleted — falls back to the words that were
 * typed, which is what the note said at the time anyway.
 */
export type Mention = {
  /** The href written into the note. It is the identity, so it never changes. */
  href: string;
  type: "card" | "day" | "stay" | "ride" | "flight";
  label: string;
  /** The line under it in the picker: a date, a city, where it sits. */
  detail: string;
  /** Cards keep their type, so a chip carries the same hue as its tab. */
  kind?: ItemKind;
};

export function mentionsOf(rows: NoteSources): Mention[] {
  const dayNames = new Map(
    rows.days.map((day) => [day.on_date, day.title?.trim() || ""]),
  );

  const cards: Mention[] = rows.items.map((item) => ({
    href: `/honeymoon?item=${item.id}`,
    type: "card",
    label: item.title,
    detail: item.on_date ? formatDayShort(item.on_date) : "in a pile",
    kind: item.kind,
  }));

  const days: Mention[] = [...dayNames.keys()].map((date) => ({
    href: `/honeymoon?day=${date}`,
    type: "day",
    label: dayNames.get(date) || formatDayShort(date),
    detail: formatDayShort(date),
  }));

  const stays: Mention[] = rows.stays.map((stay) => ({
    href: `/honeymoon/lodging?stay=${stay.id}`,
    type: "stay",
    label: stay.name,
    detail: `from ${formatDayShort(stay.check_in_on)}`,
  }));

  const rides: Mention[] = rows.transit.map((ride) => ({
    href: `/honeymoon/transit?ride=${ride.id}`,
    type: "ride",
    label: `${ride.from_place} → ${ride.to_place}`,
    detail: formatDayShort(ride.departs_at.slice(0, 10)),
  }));

  const flights: Mention[] = rows.flights.map((flight) => ({
    href: `/honeymoon/flights?flight=${flight.id}`,
    type: "flight",
    label: `${flight.from_airport} → ${flight.to_airport}`,
    detail: formatDayShort(flight.departs_at.slice(0, 10)),
  }));

  return [...cards, ...days, ...stays, ...rides, ...flights];
}

/**
 * What `@kyo` should offer. A name that starts with what was typed beats one
 * that merely contains it, because the first letters are what someone types
 * when they already know what they're looking for.
 */
export function searchMentions(
  all: Mention[],
  query: string,
  limit = 6,
): Mention[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return all.slice(0, limit);

  const scored: { mention: Mention; rank: number }[] = [];
  for (const mention of all) {
    const label = mention.label.toLowerCase();
    const rank = label.startsWith(needle)
      ? 0
      : label.includes(needle)
        ? 1
        : mention.detail.toLowerCase().includes(needle)
          ? 2
          : -1;
    if (rank >= 0) scored.push({ mention, rank });
  }
  return scored
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map((s) => s.mention);
}

/** A day a card mention should open, once the card is found again. */
export function mentionTarget(mention: Mention, onDate: string | null): string {
  return mention.type === "card" && onDate
    ? `/honeymoon?day=${onDate}`
    : mention.href;
}

/** The markdown a picked mention writes into the note. */
export function mentionLink(mention: Mention): string {
  return `[${mention.label}](${mention.href})`;
}
