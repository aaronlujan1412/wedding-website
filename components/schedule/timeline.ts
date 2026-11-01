import { formatTime } from "./clock";
import { roleEntries } from "./entries";
import type { Role, Side } from "./roles";
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
 * role's entry is read against — and entries keep the order they're written
 * in, which is what pairs a two-sided view's rows.
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
        key: `entry|${entry.day}|${entry.time}|${entry.side ?? ""}|${entry.title}`,
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

export type SidedRow =
  | { kind: "stop"; key: string; stop: GuestStop }
  | { kind: "together"; key: string; entry: RoleEntry }
  | {
      kind: "apart";
      key: string;
      time: string;
      bySide: Partial<Record<Side, RoleEntry>>;
    };

/**
 * A day's items as rows of a two-sided view. Entries with a `side` at the
 * same minute share a row, one each side of the spine; an entry without one
 * is something both people do, drawn across the middle.
 */
export function sidedRows(items: TimelineItem[]): SidedRow[] {
  const rows: SidedRow[] = [];
  for (const item of items) {
    if (item.kind === "stop") {
      rows.push({ kind: "stop", key: item.key, stop: item.stop });
      continue;
    }
    const { entry } = item;
    if (!entry.side) {
      rows.push({ kind: "together", key: item.key, entry });
      continue;
    }
    const last = rows.at(-1);
    if (
      last?.kind === "apart" &&
      last.time === entry.time &&
      !last.bySide[entry.side]
    ) {
      last.bySide[entry.side] = entry;
    } else {
      rows.push({
        kind: "apart",
        key: item.key,
        time: entry.time,
        bySide: { [entry.side]: entry },
      });
    }
  }
  return rows;
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
