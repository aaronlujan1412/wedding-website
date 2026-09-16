import { flightsOnDay, formatClockIn } from "./flights";
import { USUAL_CHECK_IN, USUAL_CHECK_OUT, sleepsOn } from "./stays";
import { MODES, arrivesClock, departsClock, transitOnDay } from "./transit";
import {
  WEEKDAYS,
  addDays,
  cellId,
  compare,
  itemLength,
  itemStart,
  minutesOf,
  parseCell,
  positionBetween,
  weekdayOf,
} from "./trip";
import type {
  Lane,
  TripFlight,
  TripItem,
  TripStay,
  TripTransit,
} from "./types";

/**
 * The board drawn by the hour.
 *
 * The list shows how long things take as numbers; this shows them as height,
 * so a long visit looks long and an empty afternoon looks empty. It is one
 * lane at a time — fourteen hours at a readable size is most of a screen, and
 * three lanes of it would be three screens.
 *
 * Nothing here changes what a card is. `start_time` null still means loose,
 * and a loose card sits on the day's Sometime shelf above the hours instead of
 * on them. Dropping one onto the hours is how it gets a time.
 */

export type BoardLayout = "list" | "hours";

export function isBoardLayout(value: string | null): value is BoardLayout {
  return value === "list" || value === "hours";
}

/**
 * Drops snap to quarter hours: the steps the time field already uses. The
 * half-hour lines are a ruler to read against, not boxes to fill — a 10:12
 * train belongs at 10:12, not in the 10:00 box.
 */
export const SNAP = 15;

/** A half hour on the ruler: tall enough for a half-hour card's title, and no taller. */
export const HALF_HOUR_REM = 1.125;

/**
 * A half hour on a phone, where a card is tapped rather than pointed at. At the
 * desk's height a half-hour card is an 18px target; at this one it's 32px, and
 * the hour-long cards most things are clear a thumb comfortably.
 */
export const PAGE_HALF_HOUR_REM = 2;

/** Shelves show this many cards until someone asks for the rest. */
export const SHELF_LIMIT = 4;

/**
 * What counts as the day when asking whether its loose cards still fit. Only
 * the shelf reads it — the ruler draws whatever the cards need.
 */
export const WAKING = { start: 9 * 60, end: 21 * 60 };

/* ------------------------------------------------------------ drop ids -- */

const HOURS_PREFIX = "hours:";
const SHELF_PREFIX = "shelf:";

/** The hours of one lane on one day, as a drop target. */
export function hoursId(lane: Lane, date: string): string {
  return `${HOURS_PREFIX}${cellId(lane, date)}`;
}

/** The loose cards of one lane on one day, as a drop target. */
export function shelfId(lane: Lane, date: string): string {
  return `${SHELF_PREFIX}${cellId(lane, date)}`;
}

export function isHoursId(id: string): boolean {
  return id.startsWith(HOURS_PREFIX);
}

export function parseHoursId(id: string) {
  return isHoursId(id) ? parseCell(id.slice(HOURS_PREFIX.length)) : null;
}

export function parseShelfId(id: string) {
  return id.startsWith(SHELF_PREFIX)
    ? parseCell(id.slice(SHELF_PREFIX.length))
    : null;
}

/* ---------------------------------------------------------- the ruler -- */

export type Range = { start: number; end: number };

const DEFAULT_RANGE: Range = { start: 8 * 60, end: 22 * 60 };

/**
 * The hours every column shares, so 13:00 is one line across the board. It
 * starts at 08:00–22:00 and widens, to whole hours, for anything outside that.
 * Callers pass the times from every day in scope, not only the columns on
 * screen, or the grid would rescale itself as it scrolled.
 */
export function hoursRange(minutes: number[]): Range {
  const start = Math.min(DEFAULT_RANGE.start, ...minutes);
  const end = Math.max(DEFAULT_RANGE.end, ...minutes);
  return {
    start: Math.max(0, Math.floor(start / 60) * 60),
    end: Math.min(24 * 60, Math.ceil(end / 60) * 60),
  };
}

/** A minute's distance down the ruler, as a percentage for `top`/`height`. */
export function percentAt(minute: number, range: Range): number {
  return ((minute - range.start) / (range.end - range.start)) * 100;
}

/**
 * The start time for a card whose top edge is `offset` pixels down a column
 * `height` pixels tall. Snapped, and kept inside the day: a card can run past
 * the foot of the ruler, but it can't start after it.
 */
export function minuteAt(offset: number, height: number, range: Range): number {
  const raw = range.start + (offset / height) * (range.end - range.start);
  const snapped = Math.round(raw / SNAP) * SNAP;
  return Math.max(range.start, Math.min(snapped, range.end - SNAP));
}

/** Minutes past midnight as `HH:MM`, for `start_time`. */
export function toTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Where a card dropped at `start` goes in its cell's drag order: just before
 * the first timed card that starts later. Choosing a time is asking for that
 * order, so the list agrees with the hours instead of the board second-guessing
 * a drag — which is still something it never does on its own.
 */
export function positionForTime(siblings: TripItem[], start: number): number {
  const later = siblings.findIndex((s) => {
    const at = itemStart(s);
    return at !== null && at > start;
  });
  if (later === -1)
    return positionBetween(siblings.at(-1)?.position, undefined);
  return positionBetween(
    siblings[later - 1]?.position,
    siblings[later].position,
  );
}

/* ----------------------------------------------------- side by side -- */

export type Span = { key: string; start: number; end: number };
export type Placed<T extends Span> = T & { column: number; columns: number };

/**
 * Lays out things that share minutes side by side, the way a calendar does.
 * Each run of overlaps gets as many sub-columns as it has things happening at
 * once; anything not overlapping keeps the full width.
 */
export function placeSpans<T extends Span>(spans: T[]): Placed<T>[] {
  const sorted = [...spans].sort(
    (a, b) => a.start - b.start || b.end - a.end || compare(a.key, b.key),
  );

  const placed: Placed<T>[] = [];
  let run: Placed<T>[] = [];
  let runEnd = -1;
  let ends: number[] = [];

  const close = () => {
    for (const span of run) span.columns = ends.length;
    run = [];
    ends = [];
  };

  for (const span of sorted) {
    if (span.start >= runEnd) {
      close();
      runEnd = span.end;
    }
    let column = ends.findIndex((end) => end <= span.start);
    if (column === -1) {
      column = ends.length;
      ends.push(span.end);
    } else {
      ends[column] = span.end;
    }
    runEnd = Math.max(runEnd, span.end);
    const next = { ...span, column, columns: 1 };
    run.push(next);
    placed.push(next);
  }
  close();

  return placed;
}

/* ------------------------------------------------- already on the clock -- */

/**
 * A train or flight, drawn where it happens. These already have times on
 * their own tabs; in the day header they were a line of small print, and here
 * a morning train visibly takes the morning.
 */
export type Anchor = {
  key: string;
  kind: "ride" | "flight";
  /** Minutes past midnight, local. Null when it began the day before. */
  start: number | null;
  /** Null when it carries on past midnight. */
  end: number | null;
  title: string;
  detail: string;
  href: string;
};

export function anchorsOnDay(
  date: string,
  flights: TripFlight[],
  rides: TripTransit[],
): Anchor[] {
  const out: Anchor[] = [];

  for (const { ride, leaves, lands } of transitOnDay(rides, date)) {
    out.push({
      key: `ride-${ride.id}`,
      kind: "ride",
      start: leaves ? minutesOf(departsClock(ride)) : null,
      end: lands ? minutesOf(arrivesClock(ride)) : null,
      title: ride.service || MODES[ride.mode].label,
      detail: `${ride.from_place} → ${ride.to_place}`,
      href: "/honeymoon/transit",
    });
  }

  // Each end of a flight is on its own airport's clock, which is the clock of
  // wherever you are standing — the same rule `flightsOnDay` dates them by.
  for (const { flight, leaves, lands } of flightsOnDay(flights, date)) {
    const start = leaves
      ? minutesOf(formatClockIn(flight.departs_at, flight.departs_tz))
      : null;
    let end = lands
      ? minutesOf(formatClockIn(flight.arrives_at, flight.arrives_tz))
      : null;
    let detail = `${flight.airline} ${flight.flight_number}`;
    // Flying home east across the date line lands "earlier" on the same date.
    // One block can't run backwards, so draw the leaving and say the landing.
    if (start !== null && end !== null && end < start) {
      detail += `, lands ${formatClockIn(flight.arrives_at, flight.arrives_tz)}`;
      end = null;
    }
    out.push({
      key: `flight-${flight.id}`,
      kind: "flight",
      start,
      end,
      title: `${flight.from_airport} → ${flight.to_airport}`,
      detail,
      href: "/honeymoon/flights",
    });
  }

  return out;
}

/**
 * A moment rather than a stretch: check-in and check-out, and a ryokan's set
 * breakfast and dinner. Drawn as a line across the day.
 */
export type Mark = {
  key: string;
  kind: "check-in" | "check-out" | "breakfast" | "dinner";
  at: number;
  label: string;
};

export function marksOnDay(date: string, stays: TripStay[]): Mark[] {
  const out: Mark[] = [];
  for (const stay of stays) {
    if (stay.check_out_on === date) {
      out.push({
        key: `out-${stay.id}`,
        kind: "check-out",
        at: minutesOf(stay.check_out_time ?? USUAL_CHECK_OUT),
        label: `Check out, ${stay.name}`,
      });
    }
    if (stay.check_in_on === date) {
      out.push({
        key: `in-${stay.id}`,
        kind: "check-in",
        at: minutesOf(stay.check_in_time ?? USUAL_CHECK_IN),
        label: `Check in, ${stay.name}`,
      });
    }
    // Breakfast is the morning after a night there; dinner is the evening of one.
    if (stay.breakfast_time && sleepsOn(stay, addDays(date, -1))) {
      out.push({
        key: `breakfast-${stay.id}`,
        kind: "breakfast",
        at: minutesOf(stay.breakfast_time),
        label: `Breakfast, ${stay.name}`,
      });
    }
    if (stay.dinner_time && sleepsOn(stay, date)) {
      out.push({
        key: `dinner-${stay.id}`,
        kind: "dinner",
        at: minutesOf(stay.dinner_time),
        label: `Dinner, ${stay.name}`,
      });
    }
  }
  return out.sort((a, b) => a.at - b.at || compare(a.key, b.key));
}

/* ------------------------------------------------------------ the shelf -- */

/**
 * How much of the waking day is still unclaimed: nothing timed on it, no
 * train, no flight. The shelf compares its cards against this, which is the
 * question it exists to answer — can this day still take what's on it?
 */
export function freeMinutes(timed: TripItem[], anchors: Anchor[]): number {
  const claimed = [
    ...timed.map((i) => {
      const start = itemStart(i)!;
      return [start, start + itemLength(i)];
    }),
    ...anchors.map((a) => [a.start ?? 0, a.end ?? 24 * 60]),
  ]
    .map(([s, e]) => [Math.max(s, WAKING.start), Math.min(e, WAKING.end)])
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0]);

  let free = WAKING.end - WAKING.start;
  let reached = WAKING.start;
  for (const [s, e] of claimed) {
    if (e <= reached) continue;
    free -= e - Math.max(s, reached);
    reached = e;
  }
  return free;
}

/**
 * What's wrong with putting `item` at `start` on `date`, said while it's still
 * being dragged — the moment it can be changed for free. A travel card over a
 * train isn't a clash: it's the train, blocked out. Wander blocks never clash.
 */
export function slotProblems(
  item: TripItem,
  start: number,
  date: string,
  others: TripItem[],
  anchors: Anchor[],
): string[] {
  const end = start + itemLength(item);
  const clashes =
    item.kind === "wander"
      ? []
      : [
          ...others
            .filter((other) => {
              const at = itemStart(other);
              return (
                other.id !== item.id &&
                other.kind !== "wander" &&
                at !== null &&
                at < end &&
                at + itemLength(other) > start
              );
            })
            .map((other) => other.title),
          ...(item.kind === "travel"
            ? []
            : anchors
                .filter(
                  (a) => (a.start ?? 0) < end && (a.end ?? 24 * 60) > start,
                )
                .map((a) => a.title)),
        ];

  const out: string[] = [];
  if (clashes.length > 0) out.push(`overlaps ${clashes.join(", ")}`);
  const weekday = weekdayOf(date);
  if (item.closed_days.includes(weekday))
    out.push(`closed ${WEEKDAYS[weekday]}s`);
  return out;
}
