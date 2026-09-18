import type { Pairing, Standing } from "./bouts";
import { PLANNERS, kindOf } from "./trip";
import type { BoutOutcome, TripItem } from "./types";

/**
 * The Ring's voice.
 *
 * Everything the arcade shouts lives here, and every bit of it is a pure
 * function of the bout — the two card ids and how many bouts came before. Same
 * rule as the matchmaker: the twelve-second refresh re-renders this screen
 * while a question is still on it, and a `Math.random()` sound effect would
 * change its mind about what just happened halfway through the animation.
 *
 * The register is deliberate. The rest of the planner is a quiet paper
 * document because it gets read on a train; this is the screen where two
 * people argue about whether the owl cafe is happening, and it is allowed to
 * be an arcade cabinet about it.
 */

export function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

function pick<T>(list: T[], seed: string): T {
  return list[Math.floor(hash(seed) * list.length) % list.length];
}

/* ------------------------------------------------------------------ *
 * Impact
 * ------------------------------------------------------------------ */

/**
 * Manga lettering, with a fansub gloss under it.
 *
 * The gloss is not a translation anyone needs — it is there because a line of
 * badly-timed English under the sound effect is the joke, and because the one
 * of us who cannot read kana should still know whether that was good.
 */
export type Sfx = { kana: string; gloss: string };

const HITS: Sfx[] = [
  { kana: "ドン！", gloss: "DON!" },
  { kana: "バキッ！", gloss: "CRACK!" },
  { kana: "ズバッ！", gloss: "SLICE!" },
  { kana: "ドカーン！", gloss: "KABOOM!" },
  { kana: "ゴスッ！", gloss: "THUD!" },
  { kana: "ズドン！", gloss: "DIRECT HIT!" },
  { kana: "バキィ！", gloss: "SHATTERED!" },
  { kana: "ドギャア！", gloss: "UNTRANSLATABLE" },
];

const BOTH: Sfx[] = [
  { kana: "キラーン！", gloss: "BOTH SURVIVE" },
  { kana: "相打ち！", gloss: "DRAW — NOBODY MOVES" },
  { kana: "がっちり！", gloss: "TAG TEAM FORMED" },
];

const NEITHER: Sfx[] = [
  { kana: "全滅！", gloss: "DOUBLE K.O." },
  { kana: "ドボン！", gloss: "BOTH ELIMINATED" },
  { kana: "さようなら", gloss: "GOODBYE FOREVER" },
];

/** 待った is the real call for a false start in sumo, and it is exactly what
 *  "ask me later" is. */
const SKIP: Sfx[] = [{ kana: "待った！", gloss: "MATTA — FALSE START" }];

export function sfxFor(outcome: BoutOutcome, seed: string): Sfx {
  if (outcome === "both") return pick(BOTH, seed);
  if (outcome === "neither") return pick(NEITHER, seed);
  if (outcome === "skip") return SKIP[0];
  return pick(HITS, seed);
}

/**
 * A critical hit, about one bout in nine.
 *
 * It is a real 1.6x on the rating swing, not just a bigger noise, and it is
 * still perfectly reproducible: the standings replay from the log, and this
 * takes the same seed the replay does. A crit you cannot recompute would make
 * undo hand back a different banzuke than the one you undid.
 */
export function isCritical(east: string, west: string, index: number): boolean {
  return hash(`crit:${index}:${east}:${west}`) < 0.11;
}

export const CRIT_MULTIPLIER = 1.6;

/* ------------------------------------------------------------------ *
 * The card before the bell
 * ------------------------------------------------------------------ */

export type Callout = { title: string; kana: string | null };

/**
 * What kind of fight this is, announced over the top of it.
 *
 * The matchmaker already pairs on the things that make a bout worth having —
 * same person's rival, same city, same kind — so this is mostly the matchmaker
 * saying out loud what it just did. Which is the useful version of a joke:
 * "CIVIL WAR: KYOTO" is funnier than "Both in Kyoto" and tells you the same
 * thing.
 */
export function calloutFor(pairing: Pairing): Callout {
  const a = pairing.east.item;
  const b = pairing.west.item;

  if (a.must_do && b.must_do) {
    return { title: "TITLE MATCH", kana: "全勝対決" };
  }
  if (a.must_do || b.must_do) {
    return { title: "CHAMPION ENTERS", kana: "横綱登場" };
  }
  if (pairing.east.fought === 0 && pairing.west.fought === 0) {
    return { title: "BOTH DEBUTS", kana: "新入幕" };
  }
  if (a.kind === b.kind && a.kind === "food") {
    return { title: "STOMACH BATTLE", kana: "食い倒れ" };
  }
  if (a.kind === b.kind && a.kind !== "unsorted") {
    return { title: "MIRROR MATCH", kana: "同門対決" };
  }
  if (
    a.city &&
    b.city &&
    a.city.trim().toLowerCase() === b.city.trim().toLowerCase()
  ) {
    return { title: `CIVIL WAR — ${a.city.toUpperCase()}`, kana: null };
  }
  if (Math.abs(pairing.east.rating - pairing.west.rating) > 120) {
    return { title: "UPSET INCOMING?", kana: "番狂わせ" };
  }
  if (a.added_by === b.added_by) {
    return {
      title: `${PLANNERS[a.added_by].label.toUpperCase()} VS HERSELF`.replace(
        "AARON VS HERSELF",
        "AARON VS HIMSELF",
      ),
      kana: "同部屋",
    };
  }
  return { title: "SAVEA VS AARON", kana: "東西対抗" };
}

/**
 * The referee. He calls the start of every bout the way a gyoji actually
 * does, and then says the boring true thing underneath, because the boring
 * true thing is what you are actually deciding on.
 */
export function gyojiLine(pairing: Pairing, index: number): string {
  const calls = [
    "HAKKEYOI! — put your backs into it",
    "NOKOTTA, NOKOTTA! — still in, still in",
    "The fan is up. Somebody choose.",
    "I have seen better. Proceed anyway.",
    "No pushing out of the ring. Actually, do.",
  ];
  return pick(calls, `gyoji:${index}:${pairing.east.item.id}`);
}

/* ------------------------------------------------------------------ *
 * The combo counter
 * ------------------------------------------------------------------ */

/**
 * Deciding things quickly, rewarded.
 *
 * The streak is the only thing on the tab that rewards pace rather than care,
 * which is the point — the pile does not get shorter by being thought about.
 * It resets the moment you stop, so it can only ever egg you on for as long
 * as you are already going.
 */
const COMBO: { at: number; title: string }[] = [
  { at: 2, title: "DOUBLE" },
  { at: 3, title: "TRIPLE" },
  { at: 5, title: "RAMPAGE" },
  { at: 7, title: "UNSTOPPABLE" },
  { at: 10, title: "GODLIKE" },
  { at: 14, title: "ARE YOU TWO OKAY" },
  { at: 20, title: "PLEASE GO OUTSIDE" },
  { at: 30, title: "THIS IS YOUR HONEYMOON" },
];

export function comboTitle(count: number): string | null {
  let title: string | null = null;
  for (const step of COMBO) if (count >= step.at) title = step.title;
  return title;
}

/* ------------------------------------------------------------------ *
 * The banzuke's ranks
 * ------------------------------------------------------------------ */

export type Rank = { kana: string; roman: string };

/**
 * A real banzuke's ranks, which happen to be exactly the shape of this list:
 * four titles at the top that mean something, then everybody else numbered,
 * then a line, and below the line you are not on the payroll.
 */
const TOP: Rank[] = [
  { kana: "横綱", roman: "YOKOZUNA" },
  { kana: "大関", roman: "ŌZEKI" },
  { kana: "関脇", roman: "SEKIWAKE" },
  { kana: "小結", roman: "KOMUSUBI" },
];

export function rankFor(row: number, fits: boolean): Rank {
  if (!fits) return { kana: "幕下", roman: "MAKUSHITA" };
  if (row < TOP.length) return TOP[row];
  return { kana: "前頭", roman: `MAEGASHIRA ${row - TOP.length + 1}` };
}

/* ------------------------------------------------------------------ *
 * Health
 * ------------------------------------------------------------------ */

/** Ratings start at 1500 and drift about 200 either way, so the bar is that
 *  band stretched over its whole width. A leader reads full, a card that has
 *  lost all night reads nearly empty, and nothing ever pins at either end. */
export function healthOf(rating: number): number {
  return Math.max(0.06, Math.min(1, (rating - 1280) / 440));
}

/* ------------------------------------------------------------------ *
 * The things that turn up uninvited
 * ------------------------------------------------------------------ */

export type Secret = {
  word: string;
  /** What the toast says once they've typed it. */
  announce: string;
};

/**
 * Typed anywhere on the tab.
 *
 * Not the Konami code, much as it belongs here: the arrow keys are the four
 * verdicts, so entering it would settle eight real bouts on the way through,
 * and up-up-down-down is "keep both, keep both, cut both, cut both".
 */
export const SECRETS: Secret[] = [
  { word: "hadouken", announce: "波動拳" },
  { word: "matsuri", announce: "祭り — festival mode" },
  { word: "neko", announce: "招き猫" },
  { word: "zen", announce: "禅 — the noise stops" },
];

export function secretFor(buffer: string): Secret | null {
  return SECRETS.find((s) => buffer.endsWith(s.word)) ?? null;
}

/** One line of flavour for a card that has been in a lot of bouts, shown
 *  under its name in the arena. Cosmetic, and it earns its place by being the
 *  only reason to notice a card is on a run. */
export function formOf(standing: Standing): string | null {
  if (standing.fought === 0) return "DEBUT";
  if (standing.losses === 0 && standing.wins >= 4) return "UNDEFEATED";
  if (standing.wins === 0 && standing.losses >= 4) return "WINLESS";
  if (standing.wins >= 3 && standing.wins >= standing.losses * 3) return "ON A RUN";
  return null;
}

/** The fighter's "name" under the title — the card's type, shouted. */
export function styleOf(item: TripItem): string {
  return kindOf(item.kind).label.toUpperCase();
}
