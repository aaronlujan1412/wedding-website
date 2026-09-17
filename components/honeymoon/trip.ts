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
 * `decided` is the final draft and the only lane the itinerary, and its
 * printout, read. The other two are drafting rows — throw anything in, argue later,
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

/**
 * The board's views.
 *
 * Four jobs, not four layouts. Three of them are working views — one person's
 * row plus the pile they are pulling from — and Compare is a deciding view,
 * where you are choosing between two drafts rather than adding to either, so
 * the pile gets out of the way and the days get the room.
 *
 * Keeping the board as one stack of three lanes made every view the worst
 * case: 107 of the 117 cards live in piles, so the backlog set the height of a
 * grid that is 95% empty, and reaching the third lane meant scrolling past two
 * other people's ideas to get there.
 */
export type BoardView = "decided" | "savea" | "aaron" | "compare";

export const BOARD_VIEWS: Record<
  BoardView,
  { label: string; lanes: Lane[]; blurb: string; pile: boolean }
> = {
  aaron: {
    label: "Aaron",
    lanes: ["aaron"],
    blurb: "His route and his ideas. The arrow on a card agrees to it.",
    pile: true,
  },
  savea: {
    label: "Savea",
    lanes: ["savea"],
    blurb: "Her route and her ideas. The arrow on a card agrees to it.",
    pile: true,
  },
  decided: {
    label: "Decided",
    lanes: ["decided"],
    blurb: "What prints. The arrow on a card sends it back.",
    pile: true,
  },
  compare: {
    label: "Compare",
    lanes: ["savea", "aaron"],
    blurb: "Both drafts over what's agreed. Drag a card up to settle it.",
    pile: false,
  },
};

export const VIEW_ORDER: BoardView[] = ["compare", "aaron", "savea", "decided"];

export function isBoardView(value: string | null): value is BoardView {
  return value !== null && value in BOARD_VIEWS;
}

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

/**
 * What a card is, and how it behaves.
 *
 * `blockout` is the one that matters: those cards claim time without being an
 * activity. They are in this same enum rather than a parallel column so that
 * one dropdown turns "we'll rest here" into "actually, the aquarium" -- and so
 * that everything downstream branches off this map instead of off the schema.
 *
 * `links` says what a blockout points at. `stay` and `transit` resolve to a
 * record on another tab; `city` is not a record at all -- a wander blockout
 * names a place and the ideas worth seeing there are looked up live from the
 * pile, so the list stays current on its own and no join table exists.
 */
export type KindMeta = {
  label: string;
  color: string;
  /** Blockouts have none: the band shape is the identity. */
  glyph: string | null;
  blockout: boolean;
  links: "stay" | "city" | "transit" | null;
};

export const KINDS: Record<ItemKind, KindMeta> = {
  unsorted: {
    label: "Unsorted",
    color: "var(--color-kind-unsorted)",
    glyph: null,
    blockout: false,
    links: null,
  },

  shrine: {
    label: "Shrine",
    color: "var(--color-kind-shrine)",
    glyph: "⛩",
    blockout: false,
    links: null,
  },
  food: {
    label: "Food",
    color: "var(--color-kind-food)",
    glyph: "🍜",
    blockout: false,
    links: null,
  },
  workshop: {
    label: "Workshop",
    color: "var(--color-kind-workshop)",
    glyph: "✎",
    blockout: false,
    links: null,
  },
  shop: {
    label: "Shop",
    color: "var(--color-kind-shop)",
    glyph: "🛍",
    blockout: false,
    links: null,
  },
  outdoors: {
    label: "Outdoors",
    color: "var(--color-kind-outdoors)",
    glyph: "⛰",
    blockout: false,
    links: null,
  },
  culture: {
    label: "Culture",
    color: "var(--color-kind-culture)",
    glyph: "🏛",
    blockout: false,
    links: null,
  },
  event: {
    label: "Event",
    color: "var(--color-kind-event)",
    glyph: "✺",
    blockout: false,
    links: null,
  },
  play: {
    label: "Play",
    color: "var(--color-kind-play)",
    glyph: "✦",
    blockout: false,
    links: null,
  },
  animals: {
    label: "Animals",
    color: "var(--color-kind-animals)",
    glyph: "🐧",
    blockout: false,
    links: null,
  },
  onsen: {
    label: "Onsen & ryokan",
    color: "var(--color-kind-onsen)",
    glyph: "♨",
    blockout: false,
    links: null,
  },

  rest: {
    label: "Resting",
    color: "var(--color-kind-rest)",
    glyph: null,
    blockout: true,
    links: "stay",
  },
  wander: {
    label: "Wandering",
    color: "var(--color-kind-wander)",
    glyph: null,
    blockout: true,
    links: "city",
  },
  travel: {
    label: "Travelling",
    color: "var(--color-kind-travel)",
    glyph: null,
    blockout: true,
    links: "transit",
  },
};

/** The dropdown, grouped so fourteen values still read as three decisions. */
export const KIND_GROUPS: { label: string; kinds: ItemKind[] }[] = [
  { label: "Not sorted yet", kinds: ["unsorted"] },
  {
    label: "Things to do",
    kinds: [
      "shrine",
      "food",
      "workshop",
      "shop",
      "outdoors",
      "culture",
      "event",
      "play",
      "animals",
      "onsen",
    ],
  },
  { label: "Blocked out", kinds: ["rest", "wander", "travel"] },
];

/**
 * A card's type metadata, tolerating a value this build has never heard of.
 *
 * The enum and the deployed bundle can disagree for as long as it takes a push
 * and a deploy to both land, and a bare `KINDS[kind]` in that window returns
 * undefined and takes the whole board down on the first `.color`. Falling back
 * to unsorted costs one `??` and turns a white screen into a few cards that
 * look untriaged until the deploy catches up.
 */
export function kindOf(kind: ItemKind): KindMeta {
  return KINDS[kind] ?? KINDS.unsorted;
}

export function isBlockout(item: { kind: ItemKind }): boolean {
  return kindOf(item.kind).blockout;
}

/**
 * Where a booking stands on the traffic light. An idea has no colour at all:
 * nobody has decided it needs booking yet, so there is nothing to chase.
 */
export type BookingLight = "none" | "pending" | "ready";

/** Ready first, then still to book, then plain plans. */
export const LIGHT_ORDER: Record<BookingLight, number> = {
  ready: 0,
  pending: 1,
  none: 2,
};

export const BOOKING_STATUSES: Record<
  BookingStatus,
  { label: string; light: BookingLight }
> = {
  idea: { label: "Idea", light: "none" },
  to_book: { label: "Need to book", light: "pending" },
  booked: { label: "Booked", light: "ready" },
  in_hand: { label: "Ticket in hand", light: "ready" },
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
    (leg) =>
      daysBetween(leg.starts_on, iso) >= 0 &&
      daysBetween(iso, leg.ends_on) >= 0,
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
        : {
            kind: "gap",
            from: days[i],
            to: days[j],
            column: i,
            span: j - i + 1,
          },
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

export function formatLegDates(leg: {
  starts_on: string;
  ends_on: string;
}): string {
  const start = parseDay(leg.starts_on);
  const end = parseDay(leg.ends_on);
  const month = (d: Date) => d.toLocaleDateString("en-US", { month: "short" });
  if (leg.starts_on === leg.ends_on)
    return `${month(start)} ${start.getDate()}`;
  return start.getMonth() === end.getMonth()
    ? `${month(start)} ${start.getDate()}–${end.getDate()}`
    : `${month(start)} ${start.getDate()} – ${month(end)} ${end.getDate()}`;
}

/** Every day the trip covers, across all legs, in order. */
export function tripDays(legs: TripLeg[]): string[] {
  const seen = new Set<string>();
  for (const leg of legs)
    for (const d of eachDay(leg.starts_on, leg.ends_on)) seen.add(d);
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

/**
 * When a place is open, in minutes after midnight, or null if nobody has said.
 * One window for every open day — the days it's shut are `closed_days` — and
 * either end can be missing, since "closes at 2pm" is the half that bites.
 *
 * A close at or before the open runs past midnight, so a bar open 18:00–02:00
 * closes at 26:00 and a card at 23:00 is inside it. With no open time to
 * compare against, a close by 04:00 is read the same way: nothing opens then.
 */
export function openHours(
  item: TripItem,
): { opens: number | null; closes: number | null } | null {
  if (!item.opens_at && !item.closes_at) return null;
  const opens = item.opens_at ? minutesOf(item.opens_at) : null;
  let closes = item.closes_at ? minutesOf(item.closes_at) : null;
  if (closes !== null && closes <= (opens ?? 4 * 60)) closes += 24 * 60;
  return { opens, closes };
}

/**
 * What a stretch of a day runs into at a place that isn't open all of it, as
 * lowercase fragments: "opens 10:00", "closes 14:00". A card inside a window
 * that runs past midnight is read on that side of it, so a 23:00 drink at a
 * bar open until 02:00 is fine.
 */
export function hoursProblems(
  item: TripItem,
  start: number,
  end: number,
): string[] {
  const hours = openHours(item);
  if (!hours) return [];
  const { opens, closes } = hours;
  // Past midnight: a card in the small hours belongs to the night before.
  const shift = closes !== null && closes > 24 * 60 && start < closes - 24 * 60;
  const from = shift ? start + 24 * 60 : start;
  const to = shift ? end + 24 * 60 : end;

  const out: string[] = [];
  if (opens !== null && from < opens) out.push(`opens ${toClock(opens)}`);
  if (closes !== null && to > closes) out.push(`closes ${toClock(closes)}`);
  return out;
}

/** Minutes after midnight as a clock, past midnight included: 26:00 is 02:00. */
function toClock(minutes: number): string {
  const total = minutes % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/* ---------------------------------------------------------------- links -- */

/**
 * Where a card is, on a map.
 *
 * `map_url` is a pin somebody saved, so it wins outright. Most cards never get
 * one, and a name and a city are enough to find a place — so the fallback is a
 * maps search, offered as a search rather than as a pin, because it can land
 * on the wrong branch of the same ramen chain.
 *
 * The Japanese name goes into that search when the card has one. Maps finds
 * 伏見稲荷大社 first time; "Fushimi Inari" competes with every blog post ever
 * written about it.
 */
export function mapsLink(item: TripItem): { href: string; saved: boolean } {
  if (item.map_url) return { href: item.map_url, saved: true };
  const query =
    item.address ??
    [item.title_ja ?? item.title, item.city].filter(Boolean).join(" ");
  return {
    href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
    saved: false,
  };
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

/**
 * Timed cards that claim the same minutes, a pair at a time.
 *
 * Wander blocks are exempt: eating and shopping inside an afternoon of walking
 * a neighbourhood is what one is for, not a clash with it.
 */
export function overlaps(
  items: TripItem[],
): { first: TripItem; second: TripItem; minutes: number }[] {
  const timed = items
    .filter((i) => i.start_time !== null && i.kind !== "wander")
    .sort((a, b) => itemStart(a)! - itemStart(b)! || compare(a.id, b.id));

  const out: { first: TripItem; second: TripItem; minutes: number }[] = [];
  for (const [i, first] of timed.entries()) {
    const end = itemEnd(first)!;
    for (const second of timed.slice(i + 1)) {
      const start = itemStart(second)!;
      if (start >= end) break;
      out.push({
        first,
        second,
        minutes: Math.min(end, itemEnd(second)!) - start,
      });
    }
  }
  return out;
}

/**
 * Minutes of actual activity in a day. Blockouts are time you claimed on
 * purpose, so they are not in this number -- a day with a long rest block
 * should read as restful, not as a full day. They still fill the rail, because
 * layoutDay works off start times and knows nothing about kinds.
 */
export function paceMinutes(items: TripItem[]): number {
  return items
    .filter((i) => !isBlockout(i))
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
        !isBlockout(i) &&
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

/**
 * `warn` is wrong (red), `pending` is still to do (amber), `info` is worth
 * knowing and is drawn muted.
 */
export type Warning = { tone: "warn" | "pending" | "info"; text: string };

/** Things wrong with one card, given where it has landed. */
export function itemWarnings(item: TripItem, today = todayISO()): Warning[] {
  const out: Warning[] = [];

  if (item.on_date && item.closed_days.includes(weekdayOf(item.on_date))) {
    out.push({
      tone: "warn",
      text: `Closed ${WEEKDAYS[weekdayOf(item.on_date)]}s`,
    });
  } else {
    // Only once it has an hour: a loose card is "the market on Sunday,
    // whenever", and whenever is not yet outside the opening hours. Shut that
    // day is said above instead, since the hours don't apply at all.
    const start = itemStart(item);
    if (start !== null) {
      for (const problem of hoursProblems(
        item,
        start,
        start + itemLength(item),
      )) {
        out.push({
          tone: "warn",
          text: `${problem.charAt(0).toUpperCase()}${problem.slice(1)}`,
        });
      }
    }
  }

  if (item.booking_status === "idea" || item.booking_status === "to_book") {
    if (item.booking_opens_on) {
      const days = daysBetween(today, item.booking_opens_on);
      if (days > 0) {
        out.push({ tone: "info", text: `Books open in ${days}d` });
      } else {
        out.push({ tone: "pending", text: "Booking is open — go" });
      }
    } else if (item.booking_status === "to_book" && item.on_date) {
      const days = daysBetween(today, item.on_date);
      if (days >= 0 && days <= 30) {
        out.push({ tone: "pending", text: `Unbooked, ${days}d out` });
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
  /** True when a booked ride already covers this day, from `transitOnDay`. */
  hasRide = false,
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

  // A card's warning, said for the whole day, has to say which card: a bare
  // "Closed Tuesdays" over four cards is a puzzle, not a warning.
  for (const item of items) {
    for (const w of itemWarnings(item, today)) {
      if (w.tone === "info") continue;
      out.push({
        tone: w.tone,
        text: `${item.title}: ${w.text.charAt(0).toLowerCase()}${w.text.slice(1)}`,
      });
    }
  }

  // Timed cards dragged out of sequence.
  const timed = items.map(itemStart).filter((s): s is number => s !== null);
  if (timed.some((s, i) => i > 0 && s < timed[i - 1])) {
    out.push({ tone: "info", text: "Times are out of order" });
  }

  // Two things at once. A list draws them one above the other, which reads as
  // a morning, so it has to be said in words.
  for (const { first, second, minutes } of overlaps(items)) {
    out.push({
      tone: "warn",
      text: `${first.title} and ${second.title} overlap by ${formatDuration(minutes)}`,
    });
  }

  // Two cities in a day with nothing on the board to get between them. Only
  // the items' own cities count — comparing free text against the leg's name
  // just fires on "Tokyo" vs "Tokyo again" and trains you to ignore it.
  // Either a booked ride on the transit tab or a travel blockout answers this.
  // The blockout still counts on its own: "we'll move that afternoon" is a
  // decision worth recording before anyone has bought a ticket.
  const cities = new Set(
    items.map((i) => i.city?.trim()).filter((c): c is string => !!c),
  );
  if (cities.size > 1 && !hasRide && !items.some((i) => i.kind === "travel")) {
    out.push({
      tone: "warn",
      text: `${[...cities].join(" and ")} in one day, nothing blocked out to travel`,
    });
  }

  const pace = paceMinutes(items);
  if (pace > PACE_CEILING) {
    out.push({
      tone: "warn",
      text: `${formatDuration(pace)} booked — that's a march`,
    });
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

export function parseCell(
  id: string,
): { lane: Lane; date: string | null } | null {
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
