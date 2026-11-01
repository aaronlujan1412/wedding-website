import type { Segment } from "./ceremony";
import { roleEntries } from "./entries";
import type { Role } from "./roles";
import {
  guestStops,
  type Day,
  type GuestStop,
  type Line,
  type RoleEntry,
} from "./schedule";

export type TimelineItem =
  | { kind: "stop"; key: string; stop: GuestStop }
  | { kind: "entry"; key: string; entry: RoleEntry };

export type TimelineDay = { day: Day; items: TimelineItem[] };

function compare(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * A view of the day: every guest stop, plus the entries tagged with `role`,
 * in time order and grouped by date. With no role it's the guest schedule.
 * At the same minute the guest stop comes first — it's the landmark the
 * role's entry is read against.
 */
export function timelineFor(role: Role | null): TimelineDay[] {
  const items: TimelineItem[] = [
    ...guestStops.map((stop) => ({
      kind: "stop" as const,
      key: `stop|${stop.day}|${stop.time}`,
      stop,
    })),
    ...roleEntries
      .filter((entry) => role !== null && entry.roles.includes(role))
      .map((entry) => ({
        kind: "entry" as const,
        key: `entry|${entry.day}|${entry.time}|${entry.title}`,
        entry,
      })),
  ];

  const timed = (item: TimelineItem) =>
    item.kind === "stop" ? item.stop : item.entry;
  const rank = (item: TimelineItem) => (item.kind === "stop" ? 0 : 1);
  items.sort(
    (a, b) =>
      compare(timed(a).day, timed(b).day) ||
      compare(timed(a).time, timed(b).time) ||
      rank(a) - rank(b),
  );

  const days: TimelineDay[] = [];
  for (const item of items) {
    const day = timed(item).day;
    const last = days.at(-1);
    if (last?.day === day) last.items.push(item);
    else days.push({ day, items: [item] });
  }
  return days;
}

/** A line as it's drawn: always an object, its children already filtered. */
export type VisibleLine = Omit<Exclude<Line, string>, "lines"> & {
  lines?: VisibleLine[];
};

/** A role's lines, in object form, with anything aimed at other roles gone. */
export function visibleLines(lines: Line[] = [], role: Role): VisibleLine[] {
  return lines
    .map((line) => (typeof line === "string" ? { text: line } : line))
    .filter((line) => !line.roles || line.roles.includes(role))
    .map(({ lines: children, ...line }) =>
      children ? { ...line, lines: visibleLines(children, role) } : line,
    );
}

// Clock arithmetic. Times stay `HH:MM` strings all the way to the screen:
// a Date would drag a time zone into a schedule that only ever happens in
// one place.

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function addMinutes(time: string, minutes: number) {
  const total = toMinutes(time) + minutes;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Each segment's start, running the clock forward from `start`. */
export function segmentStarts(start: string, segments: Segment[]) {
  let clock = start;
  return segments.map((segment) => {
    const at = clock;
    clock = addMinutes(clock, segment.minutes ?? 0);
    return at;
  });
}

export function totalMinutes(segments: Segment[]) {
  return segments.reduce((sum, s) => sum + (s.minutes ?? 0), 0);
}

/** "4:15", for a column of times where the meridiem goes without saying. */
export function formatClock(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}`;
}

/** "4:15 PM" */
export function formatTime(time: string) {
  return `${formatClock(time)} ${Number(time.slice(0, 2)) < 12 ? "AM" : "PM"}`;
}

/** The time label above a stop or an entry. */
export function formatWhen({
  time,
  until,
  approx,
}: {
  time: string;
  until?: string;
  approx?: boolean;
}) {
  if (until) return `${formatTime(time)} – ${formatTime(until)}`;
  return approx ? `About ${formatTime(time)}` : formatTime(time);
}

const DAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

/** "Tuesday, December 1". Read as UTC so the server and every browser agree. */
export function formatDay(day: Day) {
  const [y, m, d] = day.split("-").map(Number);
  return DAY_FORMAT.format(new Date(Date.UTC(y, m - 1, d)));
}

/** "Easton, Alaysha and Brenna" — the site's lists go without the Oxford comma. */
export function joinNames(names: string[]) {
  if (names.length < 2) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
