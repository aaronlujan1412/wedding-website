import type {
  BookingStatus,
  Currency,
  DocCategory,
  ItemKind,
  Lane,
  Planner,
  Rate,
  TripItem,
  TripLeg,
} from "./types";


/** A lane's pile: cards in that lane with no day yet. */
export const POOL = "pool";

/**
 * The three rows of the board.
 *
 * `decided` is the final draft and the only lane the itinerary and the pocket
 * print read. The other two are drafting rows — throw anything in, argue later,
 * and promote the card when you agree. A lane is where a card sits now;
 * `added_by` is who thought of it and never changes.
 */
export const LANE_ORDER: Lane[] = ["decided", "savea", "aaron"];

export const LANES: Record<
  Lane,
  {
    label: string;
    pile: string;
    blurb: string;
    accent: string;
    tint: string;
    planner: Planner | null;
  }
> = {
  decided: {
    label: "Decided",
    pile: "Agreed, no day yet",
    blurb: "The final draft. This is what prints.",
    accent: "var(--color-primary)",
    tint: "var(--color-paper)",
    planner: null,
  },
  savea: {
    label: "Savea's ideas",
    pile: "Savea's pile",
    blurb: "Her draft route. Nothing here is settled.",
    accent: "var(--color-lane-savea)",
    tint: "var(--color-lane-savea-tint)",
    planner: "savea",
  },
  aaron: {
    label: "Aaron's ideas",
    pile: "Aaron's pile",
    blurb: "His draft route. Nothing here is settled.",
    accent: "var(--color-lane-aaron)",
    tint: "var(--color-lane-aaron-tint)",
    planner: "aaron",
  },
};

/** Where a lane's card goes when it is sent back out of `decided`. */
export function laneForPlanner(planner: Planner): Lane {
  return planner;
}

/**
 * Only used when the rate feed has never answered. The UI labels it as an
 * estimate, so a stale guess never passes for a live quote.
 */
export const FALLBACK_YEN_PER_USD = 155;

/** An item with no duration still takes an hour out of the day. */
export const DEFAULT_DURATION = 60;

/** Below this, a hole in the day is just walking-between-things time. */
const GAP_THRESHOLD = 45;

/** A comfortable honeymoon day. Past this the pace meter starts complaining. */
export const PACE_TARGET = 9 * 60;
export const PACE_CEILING = 11 * 60;

export const KINDS: Record<
  ItemKind,
  { label: string; color: string; glyph: string }
> = {
  sight: { label: "Sight", color: "var(--color-kind-sight)", glyph: "⛩" },
  food: { label: "Food", color: "var(--color-kind-food)", glyph: "🍜" },
  workshop: { label: "Workshop", color: "var(--color-kind-workshop)", glyph: "✎" },
  transit: { label: "Transit", color: "var(--color-kind-transit)", glyph: "🚄" },
  lodging: { label: "Lodging", color: "var(--color-kind-lodging)", glyph: "🛏" },
  shop: { label: "Shop", color: "var(--color-kind-shop)", glyph: "🛍" },
  rest: { label: "Rest", color: "var(--color-kind-rest)", glyph: "☕" },
};

export const BOOKING_STATUSES: Record<
  BookingStatus,
  { label: string; seal: string | null; sealLabel: string }
> = {
  idea: { label: "Idea", seal: null, sealLabel: "" },
  to_book: { label: "Need to book", seal: null, sealLabel: "" },
  // The seals read as a goshuin would: reserved, then ticket issued.
  booked: { label: "Booked", seal: "予約済", sealLabel: "Booked" },
  in_hand: { label: "Ticket in hand", seal: "発券済", sealLabel: "Ticket in hand" },
};

export const PLANNERS: Record<Planner, { label: string; initial: string }> = {
  aaron: { label: "Aaron", initial: "A" },
  savea: { label: "Savea", initial: "S" },
};

export const DOC_CATEGORIES: Record<DocCategory, string> = {
  flight: "Flights",
  rail: "Rail",
  lodging: "Lodging",
  connectivity: "Phone & wifi",
  luggage: "Luggage",
  money: "Money",
  other: "Everything else",
};

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * A comparator that returns 0 for a tie. `a < b ? -1 : 1` calls equal keys
 * unequal, and engines resolve that differently — Node and Firefox put two
 * stays checking in the same day in different orders, which broke hydration.
 * Always break ties on something unique.
 */
export function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/* ---------------------------------------------------------------- dates -- */

/**
 * Postgres hands back `YYYY-MM-DD`, and `new Date("2026-12-05")` parses that as
 * UTC midnight — which is the day before, for anyone west of Greenwich. Build
 * the date from parts so a trip day is always the day it says it is.
 */
export function parseDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, delta: number): string {
  const date = parseDay(iso);
  date.setDate(date.getDate() + delta);
  return toISODate(date);
}

export function daysBetween(from: string, to: string): number {
  const ms = parseDay(to).getTime() - parseDay(from).getTime();
  return Math.round(ms / 86_400_000);
}

/** Every date from `start` to `end`, both inclusive. */
export function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; daysBetween(d, end) >= 0; d = addDays(d, 1)) out.push(d);
  return out;
}

export function weekdayOf(iso: string): number {
  return parseDay(iso).getDay();
}

export function formatDayShort(iso: string): string {
  const date = parseDay(iso);
  return date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
}

export function formatDayLong(iso: string): string {
  return parseDay(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function legForDay(legs: TripLeg[], iso: string): TripLeg | undefined {
  return legs.find(
    (leg) => daysBetween(leg.starts_on, iso) >= 0 && daysBetween(iso, leg.ends_on) >= 0,
  );
}

/** One lane's legs, in date order. */
export function legsIn(legs: TripLeg[], lane: Lane): TripLeg[] {
  return legs
    .filter((l) => l.lane === lane)
    .sort((a, b) => compare(a.starts_on, b.starts_on) || compare(a.id, b.id));
}

/**
 * A draft leg that Decided already has, same place and same dates. Used to
 * mark a proposal as agreed rather than to link rows — adopting copies a leg,
 * so there is no foreign key to follow.
 */
export function isAdopted(leg: TripLeg, legs: TripLeg[]): boolean {
  return (
    leg.lane !== "decided" &&
    legs.some(
      (d) =>
        d.lane === "decided" &&
        d.name === leg.name &&
        d.starts_on === leg.starts_on &&
        d.ends_on === leg.ends_on,
    )
  );
}

export type LegSegment =
  | { kind: "leg"; leg: TripLeg; column: number; span: number }
  | { kind: "gap"; from: string; to: string; column: number; span: number };

/**
 * A lane's route laid across the visible columns: its legs, clipped to what's
 * on screen, and the gaps between them. Gaps are real — they're days that lane
 * hasn't proposed anywhere for yet, and clicking one starts a leg there.
 * `column` is an index into `days`.
 */
export function legSegments(
  legs: TripLeg[],
  lane: Lane,
  days: string[],
): LegSegment[] {
  const own = legsIn(legs, lane);
  const out: LegSegment[] = [];
  let i = 0;

  while (i < days.length) {
    const leg = legForDay(own, days[i]);
    let j = i;
    while (j + 1 < days.length && legForDay(own, days[j + 1]) === leg) j++;

    out.push(
      leg
        ? { kind: "leg", leg, column: i, span: j - i + 1 }
        : { kind: "gap", from: days[i], to: days[j], column: i, span: j - i + 1 },
    );
    i = j + 1;
  }

  return out;
}

export type AdoptEffect = {
  /** Decided legs that disappear entirely, lodging details and all. */
  replaced: TripLeg[];
  /** Decided legs that lose some nights off one end, or get split around it. */
  shortened: TripLeg[];
};

/**
 * What adopting `leg` would do to Decided — mirrors `adopt_trip_leg` in the
 * database, so the board can say "this replaces Hakone and shortens Tokyo"
 * before anything is overwritten, and skip asking when nothing is.
 */
export function adoptEffect(leg: TripLeg, legs: TripLeg[]): AdoptEffect {
  const decided = legsIn(legs, "decided");
  return {
    replaced: decided.filter(
      (d) => d.starts_on >= leg.starts_on && d.ends_on <= leg.ends_on,
    ),
    shortened: decided.filter(
      (d) =>
        d.starts_on <= leg.ends_on &&
        d.ends_on >= leg.starts_on &&
        !(d.starts_on >= leg.starts_on && d.ends_on <= leg.ends_on),
    ),
  };
}

export function formatLegDates(leg: { starts_on: string; ends_on: string }): string {
  const start = parseDay(leg.starts_on);
  const end = parseDay(leg.ends_on);
  const month = (d: Date) => d.toLocaleDateString("en-US", { month: "short" });
  if (leg.starts_on === leg.ends_on) return `${month(start)} ${start.getDate()}`;
  return start.getMonth() === end.getMonth()
    ? `${month(start)} ${start.getDate()}–${end.getDate()}`
    : `${month(start)} ${start.getDate()} – ${month(end)} ${end.getDate()}`;
}

/** Every day the trip covers, across all legs, in order. */
export function tripDays(legs: TripLeg[]): string[] {
  const seen = new Set<string>();
  for (const leg of legs) for (const d of eachDay(leg.starts_on, leg.ends_on)) seen.add(d);
  return [...seen].sort();
}

/* ---------------------------------------------------------------- times -- */

/** `"09:30:00"` -> minutes past midnight. */
export function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function formatClock(time: string): string {
  const total = minutesOf(time);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function itemStart(item: TripItem): number | null {
  return item.start_time ? minutesOf(item.start_time) : null;
}

export function itemLength(item: TripItem): number {
  return item.duration_min ?? DEFAULT_DURATION;
}

export function itemEnd(item: TripItem): number | null {
  const start = itemStart(item);
  return start === null ? null : start + itemLength(item);
}

/* ------------------------------------------------------------- the rail -- */

export type RailRow =
  | { kind: "item"; item: TripItem }
  | { kind: "gap"; minutes: number; key: string };

/**
 * Walks a day in drag order and inserts a marker wherever real open time is
 * left between two timed things. Loose cards sitting in that stretch eat into
 * it, so the number shown is what is genuinely still free — the point of the
 * rail is finding the empty Tuesday afternoon, not drawing a calendar.
 */
export function layoutDay(items: TripItem[]): RailRow[] {
  const rows: RailRow[] = [];
  let lastEnd: number | null = null;
  let looseSince = 0;

  for (const item of items) {
    const start = itemStart(item);

    if (start !== null) {
      if (lastEnd !== null) {
        const free = start - lastEnd - looseSince;
        if (free >= GAP_THRESHOLD) {
          rows.push({ kind: "gap", minutes: free, key: `gap-${item.id}` });
        }
      }
      rows.push({ kind: "item", item });
      lastEnd = start + itemLength(item);
      looseSince = 0;
    } else {
      rows.push({ kind: "item", item });
      if (lastEnd !== null) looseSince += itemLength(item);
    }
  }

  return rows;
}

/** Minutes of activity in a day. Sleeping somewhere is not an activity. */
export function paceMinutes(items: TripItem[]): number {
  return items
    .filter((i) => i.kind !== "lodging")
    .reduce((sum, i) => sum + itemLength(i), 0);
}

/* ---------------------------------------------------------------- money -- */

/**
 * Costs are stored exactly as entered — `cost_amount` in the smallest unit of
 * `cost_currency` (whole yen, or US cents) — and only converted when they're
 * being added up. Converting on the way in would quietly rewrite a $60 quote
 * into whatever $60 was worth the day it was typed.
 */
type Costed = { cost_amount: number | null; cost_currency: Currency };

export const CURRENCIES: Record<Currency, { symbol: string; label: string }> = {
  JPY: { symbol: "¥", label: "Yen" },
  USD: { symbol: "$", label: "Dollars" },
};

export function formatYen(yen: number): string {
  return `¥${Math.round(yen).toLocaleString("en-US")}`;
}

/** Cents as dollars. Whole-dollar amounts drop the ".00". */
export function formatUsd(cents: number): string {
  const whole = cents % 100 === 0;
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })}`;
}

/** A cost in the currency it was entered in. */
export function formatCost(cost: Costed): string {
  if (cost.cost_amount === null) return "";
  return cost.cost_currency === "JPY"
    ? formatYen(cost.cost_amount)
    : formatUsd(cost.cost_amount);
}

/** The same cost in the other currency, for a tooltip or a hint. */
export function formatCostConverted(cost: Costed, rate: Rate): string {
  if (cost.cost_amount === null) return "";
  return cost.cost_currency === "JPY"
    ? `≈ ${yenAsUsd(cost.cost_amount, rate)}`
    : `≈ ${formatYen(costInYen(cost, rate))}`;
}

export function costInYen(cost: Costed, rate: Rate): number {
  if (cost.cost_amount === null) return 0;
  return cost.cost_currency === "JPY"
    ? cost.cost_amount
    : Math.round((cost.cost_amount / 100) * rate.yenPerUsd);
}

/** Totals are kept in yen — it's what you spend there — and shown in both. */
export function sumYen(costs: Costed[], rate: Rate): number {
  return costs.reduce((sum, c) => sum + costInYen(c, rate), 0);
}

export function yenAsUsd(yen: number, rate: Rate): string {
  const usd = yen / rate.yenPerUsd;
  return `$${usd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/**
 * What you need on you that day. Japan still runs on cash in exactly the small
 * places worth eating at, and a card that is already paid for is not cash.
 * Anything priced in dollars was booked online and paid by card, so it isn't
 * cash either.
 */
export function cashYen(items: TripItem[], rate: Rate): number {
  return sumYen(
    items.filter(
      (i) =>
        i.booking_status !== "in_hand" &&
        i.kind !== "lodging" &&
        i.cost_currency === "JPY",
    ),
    rate,
  );
}

/**
 * Parses what someone typed into a cost field. Tolerates "¥9,300", "$60.50",
 * "60." and stray spaces; anything unreadable is null rather than zero, so a
 * typo never saves as "free".
 */
export function parseCostInput(raw: string, currency: Currency): number | null {
  const cleaned = raw.replace(/[¥$,\s]/g, "");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return currency === "JPY" ? Math.round(value) : Math.round(value * 100);
}

/** The stored amount back as something to put in an input. */
export function costToInput(amount: number | null, currency: Currency): string {
  if (amount === null) return "";
  if (currency === "JPY") return String(amount);
  return amount % 100 === 0 ? String(amount / 100) : (amount / 100).toFixed(2);
}

export function describeRate(rate: Rate): string {
  const value = `¥${rate.yenPerUsd.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })} = $1`;
  if (!rate.live) return `${value} · estimate, feed unavailable`;
  if (!rate.asOf) return value;
  const date = parseDay(rate.asOf).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${value} · ECB rate, ${date}`;
}

/* ------------------------------------------------------------- warnings -- */

export type Warning = { tone: "warn" | "info"; text: string };

/** Things wrong with one card, given where it has landed. */
export function itemWarnings(item: TripItem, today = todayISO()): Warning[] {
  const out: Warning[] = [];

  if (item.on_date && item.closed_days.includes(weekdayOf(item.on_date))) {
    out.push({
      tone: "warn",
      text: `Closed ${WEEKDAYS[weekdayOf(item.on_date)]}s`,
    });
  }

  if (item.booking_status === "idea" || item.booking_status === "to_book") {
    if (item.booking_opens_on) {
      const days = daysBetween(today, item.booking_opens_on);
      if (days > 0) {
        out.push({ tone: "info", text: `Books open in ${days}d` });
      } else {
        out.push({ tone: "warn", text: "Booking is open — go" });
      }
    } else if (item.booking_status === "to_book" && item.on_date) {
      const days = daysBetween(today, item.on_date);
      if (days >= 0 && days <= 30) {
        out.push({ tone: "warn", text: `Unbooked, ${days}d out` });
      }
    }
  }

  return out;
}

/** Things wrong with a whole day. */
export function dayWarnings(
  iso: string,
  items: TripItem[],
  today = todayISO(),
): Warning[] {
  const out: Warning[] = [];
  const date = parseDay(iso);
  const month = date.getMonth();
  const day = date.getDate();

  // Shōgatsu. Museums, shops and most restaurants shut, and trains fill up.
  if ((month === 11 && day >= 29) || (month === 0 && day <= 3)) {
    out.push({
      tone: "warn",
      text: "Shōgatsu — much of Japan is shut Dec 29 – Jan 3",
    });
  }

  // Christmas Eve in Japan is a couples' night, not a family one.
  if (month === 11 && (day === 24 || day === 25)) {
    out.push({
      tone: "info",
      text: "Christmas Eve is date night here — restaurants book out weeks ahead",
    });
  }

  for (const w of items.flatMap((i) => itemWarnings(i, today))) {
    if (w.tone === "warn") out.push(w);
  }

  // Timed cards dragged out of sequence.
  const timed = items.map(itemStart).filter((s): s is number => s !== null);
  if (timed.some((s, i) => i > 0 && s < timed[i - 1])) {
    out.push({ tone: "info", text: "Times are out of order" });
  }

  // Two cities in a day with nothing booked to get between them. Only the
  // items' own cities count — comparing free text against the leg's name just
  // fires on "Tokyo" vs "Tokyo again" and trains you to ignore the warning.
  const cities = new Set(
    items.map((i) => i.city?.trim()).filter((c): c is string => !!c),
  );
  if (cities.size > 1 && !items.some((i) => i.kind === "transit")) {
    out.push({
      tone: "warn",
      text: `${[...cities].join(" and ")} in one day, no train on the board`,
    });
  }

  const pace = paceMinutes(items);
  if (pace > PACE_CEILING) {
    out.push({ tone: "warn", text: `${formatDuration(pace)} booked — that's a march` });
  }

  return out;
}

/* ------------------------------------------------------------ ordering -- */

/**
 * Fractional indexing: a drop between two neighbours is one UPDATE instead of
 * renumbering the column.
 */
export function positionBetween(before?: number, after?: number): number {
  if (before === undefined && after === undefined) return 1;
  if (before === undefined) return after! - 1;
  if (after === undefined) return before + 1;
  return (before + after) / 2;
}

/**
 * A cell is one lane crossed with one day — or with that lane's pile. Drop
 * targets are addressed by this id, and ordering is scoped to it.
 */
export function cellId(lane: Lane, date: string | null): string {
  return `${lane}|${date ?? POOL}`;
}

export function parseCell(id: string): { lane: Lane; date: string | null } | null {
  const [lane, rest] = id.split("|");
  if (!rest || !LANE_ORDER.includes(lane as Lane)) return null;
  return { lane: lane as Lane, date: rest === POOL ? null : rest };
}

export function containerOf(item: TripItem): string {
  return cellId(item.lane, item.on_date);
}

export function itemsIn(items: TripItem[], container: string): TripItem[] {
  return items
    .filter((i) => containerOf(i) === container)
    .sort((a, b) => a.position - b.position);
}

export function itemsInCell(
  items: TripItem[],
  lane: Lane,
  date: string | null,
): TripItem[] {
  return itemsIn(items, cellId(lane, date));
}

/** The plan of record. Everything read-only renders from this. */
export function decidedOn(items: TripItem[], date: string): TripItem[] {
  return itemsInCell(items, "decided", date);
}

/**
 * Where a card lands when nudged a day left or right: a trip day, `null` for
 * its pile (nudging left off the first day), or `undefined` when there's
 * nowhere to go. A card in a pile nudged right lands on the first day.
 */
export function nudgeTarget(
  item: TripItem,
  delta: number,
  days: string[],
): string | null | undefined {
  const index = item.on_date ? days.indexOf(item.on_date) : -1;
  if (index === -1) return delta < 0 || days.length === 0 ? undefined : days[0];
  const next = index + delta;
  if (next >= days.length) return undefined;
  return next < 0 ? null : days[next];
}
