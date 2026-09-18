import { CRIT_MULTIPLIER, isCritical } from "./arcade";
import {
  KINDS,
  PACE_TARGET,
  PLANNERS,
  eachDay,
  isBlockout,
  itemLength,
  kindOf,
} from "./trip";
import type {
  BoutOutcome,
  Planner,
  Trip,
  TripBout,
  TripFlight,
  TripItem,
} from "./types";

/**
 * The Ring.
 *
 * Two ideas, one question, five answers. Everything on the banzuke — every
 * rating, every win-loss record, every card in the cut list — is replayed from
 * the bout log in order by the functions in this file. There is no stored
 * score, so undo is a delete and the standings can never disagree with the
 * history that produced them.
 */

/**
 * What one day of this trip is worth.
 *
 * Deliberately the pace meter's own target rather than the twelve hours the
 * Hours layout draws. Nine hours is the board's existing definition of a
 * comfortable honeymoon day -- past it the pace meter starts complaining --
 * so budgeting in daylight instead would hand the ring a trip the rest of the
 * planner thinks is overbooked, and the cut line would be arguing with the
 * pace bar two tabs over.
 */
const DAY_MINUTES = PACE_TARGET;

const START_RATING = 1500;

/** Standard Elo. At K=32 an upset moves a card about 25 points, so a card
 *  needs to keep winning to stay at the top rather than coasting on one. */
const K = 32;

/**
 * "Both stay" is not a draw. A draw says the two were evenly matched; this
 * says you looked at both and refused to give either one up, which is the
 * strongest thing you can say about an idea short of booking it. So both
 * sides gain, and a card that keeps surviving intact climbs past cards that
 * have only ever beaten something.
 */
const BOTH_BONUS = 16;

export const OUTCOMES: Record<
  BoutOutcome,
  { verb: string; hint: string; key: string }
> = {
  east: { verb: "Wins", hint: "the other one drops", key: "←" },
  west: { verb: "Wins", hint: "the other one drops", key: "→" },
  both: { verb: "Both stay", hint: "we're doing both of these", key: "↑" },
  neither: { verb: "Cut both", hint: "neither makes the trip", key: "↓" },
  skip: { verb: "Not now", hint: "ask again later", key: "space" },
  deadlock: { verb: "Held over", hint: "not settling this tonight", key: "d" },
};

export type Standing = {
  item: TripItem;
  rating: number;
  /**
   * A bout survived. "Both stay" counts here as much as beating something
   * does, because it is the same result for this card: it is still in the
   * trip. Carrying it as a third figure meant the banzuke printed "1-0 +1"
   * beside every name, and nothing on the page said what the third number
   * was.
   */
  wins: number;
  losses: number;
  /** Everything but skips — the figure beside the name on the banzuke. */
  fought: number;
  /** Cut from the basho. Still in its pile on the board, out of the ring. */
  cut: boolean;
  /** Whose wish protects it. It never enters the ring and it is in the trip. */
  saved: Planner | null;
  /** Whose finisher took it out, if a finisher did rather than a bout. */
  vetoed: Planner | null;
};

/** Three each, for the whole tournament. Scarcity is the entire mechanic: an
 *  unlimited "this one matters" button already exists and is called must_do,
 *  and nobody has ever pressed it. */
export const WISHES = 3;
export const FINISHERS = 3;

/**
 * Everything still arguable: an idea in either person's lane that isn't a
 * blockout. Decided is what you already agreed on, and you don't put "rest"
 * in a ring.
 */
export function roster(items: TripItem[]): TripItem[] {
  return items.filter((i) => i.lane !== "decided" && !isBlockout(i));
}

function expected(a: number, b: number): number {
  return 1 / (1 + 10 ** ((b - a) / 400));
}

/**
 * Replay the whole log and hand back where everyone stands, best first.
 *
 * Elo is order-dependent, so the bouts must arrive oldest first — the query
 * orders by created_at then id for exactly this reason.
 */
export function standings(items: TripItem[], bouts: TripBout[]): Standing[] {
  const by = new Map<string, Standing>();
  for (const item of roster(items)) {
    by.set(item.id, {
      item,
      rating: START_RATING,
      wins: 0,
      losses: 0,
      fought: 0,
      cut: item.cut_at !== null,
      saved: item.saved_by,
      vetoed: item.vetoed_by,
    });
  }

  bouts.forEach((bout, index) => {
    const east = by.get(bout.east_id);
    const west = by.get(bout.west_id);
    // A card deleted from the board leaves its bouts behind; they just stop
    // counting for anyone.
    if (!east || !west) return;
    // Neither settles anything, so neither moves a rating. They differ in what
    // the matchmaker does next: a skip can come straight back, a deadlock is
    // held over until you go looking for it.
    if (bout.outcome === "skip" || bout.outcome === "deadlock") return;

    east.fought += 1;
    west.fought += 1;

    if (bout.outcome === "both") {
      east.rating += BOTH_BONUS;
      west.rating += BOTH_BONUS;
      east.wins += 1;
      west.wins += 1;
      return;
    }

    if (bout.outcome === "neither") {
      east.losses += 1;
      west.losses += 1;
      return;
    }

    const eastWon = bout.outcome === "east";
    const exp = expected(east.rating, west.rating);
    // A critical hits the rating as hard as it hits the speakers. It is
    // seeded on the bout's position in the log, which is what makes the whole
    // banzuke reproducible from the log alone.
    const crit = isCritical(bout.east_id, bout.west_id, index)
      ? CRIT_MULTIPLIER
      : 1;
    const delta = K * crit * ((eastWon ? 1 : 0) - exp);
    east.rating += delta;
    west.rating -= delta;
    if (eastWon) {
      east.wins += 1;
      west.losses += 1;
    } else {
      west.wins += 1;
      east.losses += 1;
    }
  });

  // A wish is not a good rating, it is a decision, so a wished card sits above
  // the ranking rather than in it. Ordering them first is also what puts their
  // hours at the front of the cut line, which is the promise a wish makes.
  return [...by.values()].sort(
    (a, b) =>
      Number(b.saved !== null) - Number(a.saved !== null) ||
      b.rating - a.rating ||
      a.item.title.localeCompare(b.item.title),
  );
}

/** How many of each move that person has left. */
export function movesLeft(list: Standing[], planner: Planner) {
  let wishes = WISHES;
  let finishers = FINISHERS;
  for (const s of list) {
    if (s.saved === planner) wishes -= 1;
    if (s.vetoed === planner) finishers -= 1;
  }
  return { wishes: Math.max(0, wishes), finishers: Math.max(0, finishers) };
}

/**
 * One person's column on the banzuke.
 *
 * Wished cards are deliberately not in it: they are drawn in their own band
 * above the sheet, because a card that never fought has no rank and putting
 * it at the top of a ranking would say it earned one.
 */
export function standingsOf(list: Standing[], planner: Planner): Standing[] {
  return list.filter(
    (s) => !s.cut && s.saved === null && s.item.added_by === planner,
  );
}

/** The wished cards, in the order they were spent on. */
export function wished(list: Standing[]): Standing[] {
  return list.filter((s) => !s.cut && s.saved !== null);
}

/* ------------------------------------------------------------------ *
 * Matchmaking
 * ------------------------------------------------------------------ */

export type Pairing = {
  east: Standing;
  west: Standing;
  /** Why these two, said on screen. A bout you can't see the sense in is a
   *  bout you answer at random. */
  reason: string;
};

/** A pair that has already been in the ring, and how recently. */
function historyKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * The pairs held over.
 *
 * A pair is deadlocked if the LAST thing that happened between those two was
 * a deadlock, so coming back and settling it clears it with no extra
 * bookkeeping, and deadlocking it again re-parks it. Derived from the log
 * like everything else here.
 */
export function heldPairs(bouts: TripBout[]): Set<string> {
  const latest = new Map<string, boolean>();
  for (const bout of bouts) {
    if (bout.outcome === "skip") continue;
    latest.set(historyKey(bout.east_id, bout.west_id), bout.outcome === "deadlock");
  }
  return new Set(
    [...latest.entries()].filter(([, held]) => held).map(([key]) => key),
  );
}

/**
 * Deterministic jitter in [0, 1).
 *
 * Not Math.random: the pairing has to be a pure function of the history, or
 * the 12-second live refresh would deal a new bout out from under whoever is
 * mid-sentence about the last one, and the two of them on two screens would
 * be answering different questions.
 */
function jitter(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function sameCity(a: TripItem, b: TripItem): boolean {
  const x = a.city?.trim().toLowerCase();
  const y = b.city?.trim().toLowerCase();
  return !!x && !!y && x === y;
}

function sameKind(a: TripItem, b: TripItem): boolean {
  return (
    a.kind === b.kind && a.kind !== "unsorted" && KINDS[a.kind] !== undefined
  );
}

function reasonFor(a: TripItem, b: TripItem): string {
  const kind = kindOf(a.kind).label.toLowerCase();
  if (sameKind(a, b) && sameCity(a, b)) {
    return `Both ${kind}, both in ${a.city}.`;
  }
  if (sameCity(a, b)) return `Both in ${a.city}.`;
  if (sameKind(a, b)) return `Two of the same thing.`;
  if (a.added_by !== b.added_by) {
    return `${PLANNERS[a.added_by].label}'s against ${PLANNERS[b.added_by].label}'s.`;
  }
  return `Nothing in common — pick the one you'd miss.`;
}

/**
 * The next bout.
 *
 * The scoring is the whole feature. A ring that deals two cards at random
 * asks you to choose between a ski day in Hokkaido and a bar in Shinjuku,
 * which has no answer, and three of those in a row is how the tab gets
 * closed. So it looks for the argument actually worth having: her idea
 * against his, in the same city, of the same kind, between two cards that
 * have been winning about as much as each other.
 *
 * Coverage is in there too — a card nobody has seen yet outranks a rematch —
 * because otherwise the same eight cards fight all night and the other
 * hundred never get asked about.
 */
export function nextBout(
  list: Standing[],
  bouts: TripBout[],
  /** Serve the held-over pairs instead of avoiding them. */
  held = false,
): Pairing | null {
  // A wished card is out of the tournament upward: it has already won, so
  // putting it back in the ring would be asking a question with one answer.
  const live = list.filter((s) => !s.cut && s.saved === null);
  if (live.length < 2) return null;

  const parked = heldPairs(bouts);
  const seen = new Map<string, number>();
  bouts.forEach((bout, index) => {
    seen.set(historyKey(bout.east_id, bout.west_id), index);
  });
  const seed = String(bouts.length);

  let best: Pairing | null = null;
  let bestScore = -Infinity;

  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i];
      const b = live[j];

      // The two modes are exclusive: the ordinary ring never serves a pair
      // you set aside, and the held-over round serves nothing else.
      const key = historyKey(a.item.id, b.item.id);
      if (parked.has(key) !== held) continue;

      let score = 0;

      // The argument worth having. Two of one person's own ideas is a fine
      // bout, but it isn't the one they came here for.
      if (a.item.added_by !== b.item.added_by) score += 100;

      // Comparable. "Two mornings in Kyoto, pick one" is a real question;
      // across the country it is two unrelated questions in a trench coat.
      if (sameCity(a.item, b.item)) score += 60;
      if (sameKind(a.item, b.item)) score += 40;

      // A close fight. 400 points apart is a foregone conclusion.
      score += 40 * (1 - Math.min(Math.abs(a.rating - b.rating), 400) / 400);

      // Everyone gets asked about.
      score -= 9 * (a.fought + b.fought);

      // A rematch only once there is nothing else, and then the oldest one.
      // In the held-over round every pair is a rematch by definition, so the
      // penalty would only cancel out; the oldest deadlock goes first instead.
      const met = seen.get(key);
      if (met !== undefined) score -= held ? met : 1000 - Math.min(met, 500);

      score += jitter(`${seed}:${a.item.id}:${b.item.id}`);

      if (score > bestScore) {
        bestScore = score;
        // Savea takes the east side, to match the banzuke's columns. Two of
        // the same person's cards fall back to rating order.
        const eastFirst =
          a.item.added_by === b.item.added_by
            ? a.rating >= b.rating
            : a.item.added_by === "savea";
        const [east, west] = eastFirst ? [a, b] : [b, a];
        best = { east, west, reason: reasonFor(east.item, west.item) };
      }
    }
  }

  return best;
}

/* ------------------------------------------------------------------ *
 * The cut line
 * ------------------------------------------------------------------ */

export type Budget = {
  days: number;
  /** Daylight across the whole trip. */
  waking: number;
  /** Already spoken for by Decided, blockouts included. */
  committed: number;
  /** In the air on a day of the trip. */
  flying: number;
  /** What's left to fill. Never below zero. */
  free: number;
  /** Everything still standing in the ring, added up. */
  wanted: number;
};

/**
 * How much trip there is, against how much trip you've asked for.
 *
 * This is the number the whole tab exists to move. It's the board's own
 * arithmetic — `itemLength`, and the same twelve-hour waking day the Hours
 * layout draws — so it can't quietly disagree with the pace meter.
 */
export function budget(
  trip: Trip | null,
  items: TripItem[],
  flights: TripFlight[],
): Budget {
  const days = trip ? eachDay(trip.starts_on, trip.ends_on) : [];
  const waking = days.length * DAY_MINUTES;

  const committed = items
    .filter((i) => i.lane === "decided")
    .reduce((sum, i) => sum + itemLength(i), 0);

  const within = new Set(days);
  const flying = flights
    .filter((f) => within.has(f.departs_at.slice(0, 10)))
    .reduce((sum, f) => {
      const minutes =
        (Date.parse(f.arrives_at) - Date.parse(f.departs_at)) / 60000;
      return sum + (Number.isFinite(minutes) && minutes > 0 ? minutes : 0);
    }, 0);

  const wanted = roster(items)
    .filter((i) => i.cut_at === null)
    .reduce((sum, i) => sum + itemLength(i), 0);

  return {
    days: days.length,
    waking,
    committed,
    flying,
    free: Math.max(0, waking - committed - flying),
    wanted,
  };
}

/**
 * How far down the standings the trip actually reaches.
 *
 * Walks the ranking adding up durations and stops where the trip runs out.
 * Returns the number of cards that fit, which is the row the line is drawn
 * under — so an empty ranking and a trip with no room both give 0.
 */
export function cutLine(ranked: Standing[], free: number): number {
  let used = 0;
  let fits = 0;
  for (const standing of ranked) {
    used += itemLength(standing.item);
    if (used > free) break;
    fits += 1;
  }
  return fits;
}

/** Hours, to one decimal, for the one place the budget is spelled out. */
export function formatHours(minutes: number): string {
  const hours = minutes / 60;
  return hours >= 10 ? String(Math.round(hours)) : hours.toFixed(1);
}
