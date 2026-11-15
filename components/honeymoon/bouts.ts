import { CRIT_MULTIPLIER, isCritical } from "./arcade";
import { SETLIST, sameArtist, sameSong } from "./songs";
import type { BoutOutcome, Planner, Song, SongBout } from "./types";

/**
 * The Ring.
 *
 * Two songs, one question, five answers. Everything on the banzuke — every
 * rating, every win-loss record, every song in the cut list — is replayed from
 * the bout log in order by the functions in this file. There is no stored
 * score, so undo is a delete and the standings can never disagree with the
 * history that produced them.
 */

const START_RATING = 1500;

/** Standard Elo. At K=32 an upset moves a song about 25 points, so a song
 *  needs to keep winning to stay at the top rather than coasting on one. */
const K = 32;

/**
 * "Both stay" is not a draw. A draw says the two were evenly matched; this
 * says you looked at both and refused to give either one up, which is the
 * strongest thing you can say about a song short of wishing for it. So both
 * sides gain, and a song that keeps surviving intact climbs past songs that
 * have only ever beaten something.
 */
const BOTH_BONUS = 16;

export const OUTCOMES: Record<
  BoutOutcome,
  { verb: string; hint: string; key: string }
> = {
  east: { verb: "Wins", hint: "the other one drops", key: "←" },
  west: { verb: "Wins", hint: "the other one drops", key: "→" },
  both: { verb: "Both stay", hint: "we want both of these", key: "↑" },
  neither: { verb: "Cut both", hint: "neither gets played", key: "↓" },
  skip: { verb: "Not now", hint: "ask again later", key: "space" },
  deadlock: { verb: "Held over", hint: "not settling this tonight", key: "d" },
};

export type Standing = {
  song: Song;
  rating: number;
  /**
   * A bout survived. "Both stay" counts here as much as beating something
   * does, because it is the same result for this song: it is still on the
   * list. Carrying it as a third figure meant the banzuke printed "1-0 +1"
   * beside every name, and nothing on the page said what the third number was.
   */
  wins: number;
  losses: number;
  /** Everything but skips — the figure beside the name on the banzuke. */
  fought: number;
  /** Cut from the basho. Still in the table, out of the ring. */
  cut: boolean;
  /** Whose wish protects it. It never enters the ring and it is on the list. */
  saved: Planner | null;
  /** Whose finisher took it out, if a finisher did rather than a bout. */
  vetoed: Planner | null;
};

/** Three each, for the whole tournament. Scarcity is the entire mechanic: a
 *  "this one matters" button you can press on everything is a button that
 *  means nothing. */
export const WISHES = 3;
export const FINISHERS = 3;

function expected(a: number, b: number): number {
  return 1 / (1 + 10 ** ((b - a) / 400));
}

/**
 * Replay the whole log and hand back where everyone stands, best first.
 *
 * Elo is order-dependent, so the bouts must arrive oldest first — the query
 * orders by created_at then id for exactly this reason.
 */
export function standings(songs: Song[], bouts: SongBout[]): Standing[] {
  const by = new Map<string, Standing>();
  for (const song of songs) {
    by.set(song.id, {
      song,
      rating: START_RATING,
      wins: 0,
      losses: 0,
      fought: 0,
      cut: song.cut_at !== null,
      saved: song.saved_by,
      vetoed: song.vetoed_by,
    });
  }

  bouts.forEach((bout, index) => {
    const east = by.get(bout.east_id);
    const west = by.get(bout.west_id);
    // The foreign keys cascade, so this only happens to a bout whose song was
    // deleted while the page was open. It just stops counting.
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

  // A wish is not a good rating, it is a decision, so a wished song sits above
  // the ranking rather than in it. Ordering them first is also what puts them
  // at the front of the setlist, which is the promise a wish makes.
  return [...by.values()].sort(
    (a, b) =>
      Number(b.saved !== null) - Number(a.saved !== null) ||
      b.rating - a.rating ||
      a.song.title.localeCompare(b.song.title),
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
 * Everything still fighting, best first: the banzuke's sheet.
 *
 * Wished songs are deliberately not in it: they are drawn in their own band
 * above the sheet, because a song that never fought has no rank and putting it
 * at the top of a ranking would say it earned one.
 */
export function contenders(list: Standing[]): Standing[] {
  return list.filter((s) => !s.cut && s.saved === null);
}

/** The wished songs. */
export function wished(list: Standing[]): Standing[] {
  return list.filter((s) => !s.cut && s.saved !== null);
}

/**
 * How far down the standings the party reaches.
 *
 * Every song is budgeted at the same estimated length, so the line is a count
 * rather than a running total of minutes: the first `SETLIST` songs still
 * standing, wishes first.
 */
export function cutLine(standing: Standing[]): number {
  return Math.min(standing.length, SETLIST);
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
export function heldPairs(bouts: SongBout[]): Set<string> {
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

function reasonFor(a: Standing, b: Standing): string {
  if (sameSong(a.song, b.song)) return "Same song, two versions — keep one.";
  if (sameArtist(a.song, b.song)) return `Both ${a.song.artist}.`;
  if (a.fought > 0 && b.fought > 0 && Math.abs(a.rating - b.rating) < 40) {
    return "Neck and neck so far.";
  }
  return "Pick the one you'd miss if it never played.";
}

/**
 * The next bout.
 *
 * The scoring is the whole feature. Songs have no owner, city or kind to pair
 * on, so it looks for the questions with a real answer: two versions of one
 * song, two songs by one artist (there are nine Taylor Swifts on this list),
 * and two songs that have been winning about as much as each other.
 *
 * The first two only count on every third bout. A bonus that is always on
 * beats every plain pair there is, so the matchmaker served all fifty-odd
 * same-artist pairs before anything else — twenty civil wars in a row to open
 * the night. On a schedule they are a change of pace instead, and it is still
 * a pure function of the log.
 *
 * Coverage weighs heavier than it did for the trip, because there are 140 of
 * these: a song nobody has asked about yet outranks a rematch.
 */
export function nextBout(
  list: Standing[],
  bouts: SongBout[],
  /** Serve the held-over pairs instead of avoiding them. */
  held = false,
): Pairing | null {
  // A wished song is out of the tournament upward: it has already won, so
  // putting it back in the ring would be asking a question with one answer.
  const live = contenders(list);
  if (live.length < 2) return null;

  const parked = heldPairs(bouts);
  const seen = new Map<string, number>();
  bouts.forEach((bout, index) => {
    seen.set(historyKey(bout.east_id, bout.west_id), index);
  });
  const seed = String(bouts.length);
  const themed = bouts.length % 3 === 0;

  let best: Pairing | null = null;
  let bestScore = -Infinity;

  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i];
      const b = live[j];

      // The two modes are exclusive: the ordinary ring never serves a pair
      // you set aside, and the held-over round serves nothing else.
      const key = historyKey(a.song.id, b.song.id);
      if (parked.has(key) !== held) continue;

      let score = 0;

      // The questions with a real answer, on their turn.
      if (themed && sameSong(a.song, b.song)) score += 90;
      if (themed && sameArtist(a.song, b.song)) score += 45;

      // A close fight. 400 points apart is a foregone conclusion.
      score += 40 * (1 - Math.min(Math.abs(a.rating - b.rating), 400) / 400);

      // Everyone gets asked about.
      score -= 12 * (a.fought + b.fought);

      // A rematch only once there is nothing else, and then the oldest one.
      // In the held-over round every pair is a rematch by definition, so the
      // penalty would only cancel out; the oldest deadlock goes first instead.
      const met = seen.get(key);
      if (met !== undefined) score -= held ? met : 1000 - Math.min(met, 500);

      score += jitter(`${seed}:${a.song.id}:${b.song.id}`);

      if (score > bestScore) {
        bestScore = score;
        // East is the senior side on a real banzuke, so the higher-rated song
        // takes it, matching the sheet.
        const [east, west] = a.rating >= b.rating ? [a, b] : [b, a];
        best = { east, west, reason: reasonFor(east, west) };
      }
    }
  }

  return best;
}

/** Hours, to one decimal, for the one place the estimate is spelled out. */
export function formatHours(minutes: number): string {
  const hours = minutes / 60;
  return hours >= 10 ? String(Math.round(hours)) : hours.toFixed(1);
}
