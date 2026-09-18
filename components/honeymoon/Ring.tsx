"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  calloutFor,
  formOf,
  gyojiLine,
  healthOf,
  isCritical,
  sfxFor,
  styleOf,
  type Sfx,
} from "./arcade";
import { FINISH_SFX, MOVES } from "./arcade";
import { OUTCOMES, type Pairing, type Standing } from "./bouts";
import { PLANNERS, formatDuration, itemLength } from "./trip";
import type { BoutOutcome, Planner } from "./types";

/**
 * The arena.
 *
 * A fighting-game versus screen, played straight: two fighters, a diagonal
 * seam, health bars, a referee and a very loud noise when somebody loses. The
 * first cut of this tab was two pale rectangles on cream, which was tasteful
 * and which nobody would ever have opened twice.
 *
 * Her side keeps her blue and his keeps his violet — taken up to neon, but the
 * same two hues the board has always used — so for all the shouting it is
 * still unmistakably her ideas against his.
 */

/** Long enough for the sound effect to land and the loser to leave. */
export const FLASH_MS = 680;

/**
 * What just happened, held on screen while it plays.
 *
 * A bout has a verdict and two fates. A move has neither: it is one person
 * spending one of three on one card, and the other card is untouched — which
 * is why it is a separate shape rather than another outcome.
 */
export type Flash =
  | { kind: "bout"; pairing: Pairing; outcome: BoutOutcome; crit: boolean }
  | {
      kind: "move";
      pairing: Pairing;
      move: "wish" | "finish";
      on: "east" | "west";
      planner: Planner;
    };

export type Fate = "won" | "lost" | "kept" | "cut" | "wished" | null;

const NEON = {
  savea: "var(--color-neon-savea)",
  aaron: "var(--color-neon-aaron)",
} as const;

/* ------------------------------------------------------------------ *
 * Health
 * ------------------------------------------------------------------ */

/**
 * A fighting game's health bar, including the yellow.
 *
 * Both layers are the same width driven by the same rating; the yellow one
 * just takes half a second longer to get there. That lag is the entire reason
 * anyone can tell how big a hit was — the neon is where the card is now, the
 * yellow is where it was a moment ago.
 */
function Health({
  standing,
  side,
  quiet,
}: {
  standing: Standing;
  side: "savea" | "aaron";
  quiet: boolean;
}) {
  const width = `${(healthOf(standing.rating) * 100).toFixed(1)}%`;
  const east = side === "savea";

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2",
        east ? "flex-row-reverse" : "flex-row",
      )}
    >
      <span
        className="font-dot shrink-0 text-[0.7rem] text-white/60 tabular-nums"
        aria-hidden
      >
        {Math.round(standing.rating)}
      </span>
      <div
        className={cn(
          "relative h-3 min-w-0 flex-1 overflow-hidden border-2 border-white/25 bg-black/60",
          east ? "skew-x-[12deg]" : "skew-x-[-12deg]",
        )}
        role="img"
        aria-label={`${PLANNERS[side].label}'s idea is rated ${Math.round(standing.rating)}`}
      >
        <span
          className={cn(
            "absolute inset-y-0 bg-[color:var(--color-chip)]",
            east ? "left-0" : "right-0",
            !quiet && "transition-[width] delay-200 duration-[600ms] ease-out",
          )}
          style={{ width }}
        />
        <span
          className={cn(
            "absolute inset-y-0",
            east ? "left-0" : "right-0",
            !quiet && "transition-[width] duration-150 ease-out",
          )}
          style={{ width, backgroundColor: NEON[side] }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * A fighter
 * ------------------------------------------------------------------ */

function Fighter({
  standing,
  side,
  fate,
  quiet,
  onPick,
}: {
  standing: Standing;
  side: "savea" | "aaron";
  fate: Fate;
  quiet: boolean;
  onPick: () => void;
}) {
  const item = standing.item;
  const east = side === "savea";
  const neon = NEON[side];
  const form = formOf(standing);

  return (
    <button
      type="button"
      onClick={onPick}
      disabled={fate !== null}
      style={{
        // The corner glow is the only thing colouring each half, so a fighter
        // that leaves the ring takes its light out with it.
        background: `radial-gradient(120% 90% at ${east ? "24%" : "76%"} 45%, color-mix(in srgb, ${neon} 24%, transparent) 0%, transparent 70%)`,
      }}
      className={cn(
        "group relative flex min-h-[15rem] flex-col items-start justify-center gap-2 px-6 py-8 text-left",
        "sm:min-h-[18rem] sm:px-10 lg:min-h-[21rem]",
        "focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white",
        "enabled:hover:brightness-125 disabled:cursor-default",
        east
          ? "lg:items-end lg:pr-28 lg:text-right lg:[clip-path:polygon(0_0,100%_0,calc(100%-4rem)_100%,0_100%)]"
          : "lg:items-start lg:pl-28 lg:[clip-path:polygon(4rem_0,100%_0,100%_100%,0_100%)]",
        !quiet && fate === "lost" && "animate-ring-ko",
        !quiet && fate === "won" && "animate-ring-win",
        // A finisher cuts down and a wish lifts out — opposite moves, opposite
        // directions, so which one happened is legible without the lettering.
        !quiet && fate === "cut" && "animate-ring-cut-bottom",
        !quiet && fate === "wished" && "animate-ring-ascend",
        quiet && (fate === "lost" || fate === "cut") && "opacity-25 grayscale",
      )}
    >
      {/* The blade, and the halo. One frame each, over the card they happen
          to. */}
      {fate === "cut" && !quiet ? (
        <span className="pointer-events-none absolute inset-0 overflow-hidden">
          <span
            className="animate-ring-slash absolute top-1/2 left-0 h-2 w-[140%] -translate-y-1/2"
            style={{
              background:
                "linear-gradient(90deg, transparent, #fff 30%, var(--color-ko) 55%, transparent)",
            }}
          />
        </span>
      ) : null}
      {fate === "wished" && !quiet ? (
        <span className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden">
          <span
            className="animate-ring-halo aspect-square w-[70%] rounded-full"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--color-gold) 70%, transparent) 0%, transparent 65%)",
            }}
          />
        </span>
      ) : null}
      {/* Both survive: a shine crosses each of them instead of anyone falling. */}
      {fate === "kept" && !quiet ? (
        <span className="pointer-events-none absolute inset-0 overflow-hidden">
          <span className="animate-ring-shine absolute inset-y-0 -left-1/3 w-1/3 bg-white/35" />
        </span>
      ) : null}

      <span className="font-dot flex flex-wrap items-center gap-2 text-[0.65rem] tracking-widest text-white/55">
        {item.must_do ? (
          <span className="flex items-center gap-1 text-[color:var(--color-gold)]">
            <Star className="size-3 fill-current" aria-hidden />
            CHAMPION
          </span>
        ) : null}
        <span>{styleOf(item)}</span>
        {form ? <span style={{ color: neon }}>{form}</span> : null}
      </span>

      <span
        className="font-dela text-impact max-w-[18ch] text-2xl leading-[1.1] text-balance text-white sm:text-3xl lg:text-4xl"
        style={{ filter: `drop-shadow(0 0 22px ${neon})` }}
      >
        {item.title}
      </span>

      {item.title_ja ? (
        <span
          className="font-jp-gothic text-lg leading-tight lg:text-xl"
          style={{ color: neon }}
        >
          {item.title_ja}
        </span>
      ) : null}

      <span className="font-dot text-[0.7rem] tracking-wide text-white/70">
        {formatDuration(itemLength(item))}
        {item.city ? ` — ${item.city.toUpperCase()}` : ""}
      </span>

      {item.notes ? (
        <span className="line-clamp-2 max-w-[34ch] font-garamond text-sm text-white/55 italic">
          {item.notes}
        </span>
      ) : null}

      <span
        className="font-dot mt-2 border-2 px-2 py-1 text-[0.7rem] tracking-widest"
        style={{ borderColor: neon, color: neon }}
      >
        <span className="pointer-coarse:hidden">
          {east ? "◀ LEFT" : "RIGHT ▶"}
        </span>
        <span className="hidden pointer-coarse:inline">TAP TO WIN</span>
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * The scarce moves
 * ------------------------------------------------------------------ */

/**
 * How many of something is left, as filled and hollow marks.
 *
 * Three is small enough to read as a shape rather than a number, which is the
 * point — you should be able to tell you are down to your last wish without
 * doing arithmetic in the middle of an argument.
 */
export function Pips({
  total,
  left,
  glyph,
  tone,
}: {
  total: number;
  left: number;
  glyph: string;
  /** The move's colour, not the person's: which of the two budgets this is
   *  matters more at a glance than whose it is, and whose is already said by
   *  the name beside it. */
  tone?: string;
}) {
  return (
    <span
      className="text-[0.7rem] leading-none tracking-[0.15em]"
      style={tone ? { color: tone } : undefined}
    >
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < left ? "" : "opacity-25"}>
          {glyph}
        </span>
      ))}
      <span className="sr-only">
        {left} of {total} left
      </span>
    </span>
  );
}

/** One of the two budgeted moves, aimed at one side of the ring. */
function Special({
  move,
  side,
  disabled,
  onPick,
}: {
  move: "wish" | "finish";
  side: "savea" | "aaron";
  disabled: boolean;
  onPick: () => void;
}) {
  const meta = MOVES[move];
  const tone =
    move === "wish" ? "var(--color-gold)" : "var(--color-ko)";
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      title={`${meta.roman} — ${meta.blurb}`}
      className={cn(
        "font-dot flex min-h-10 items-center gap-2 border-2 px-2.5 py-1",
        "text-[0.6rem] tracking-widest transition-colors",
        "enabled:hover:bg-white/10 disabled:opacity-30",
      )}
      style={{ borderColor: tone, color: tone }}
    >
      <span className="font-jp-gothic text-sm leading-none">{meta.kana}</span>
      <span className="hidden sm:inline">{meta.roman}</span>
      <span className="sr-only">
        {meta.roman} the {side === "savea" ? "left" : "right"} idea
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * The hit
 * ------------------------------------------------------------------ */

/**
 * 集中線 — the focus lines every manga panel draws around a punch, as one
 * repeating conic gradient with a hole masked out of the middle so the
 * lettering sits in clear air.
 */
function Burst({ tint }: { tint: string }) {
  const mask =
    "radial-gradient(circle, transparent 18%, black 34%, black 62%, transparent 76%)";
  return (
    <span
      aria-hidden
      className="animate-ring-burst absolute top-1/2 left-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2"
      style={{
        background: `repeating-conic-gradient(from 0deg, ${tint} 0deg 1.1deg, transparent 1.1deg 2.9deg)`,
        maskImage: mask,
        WebkitMaskImage: mask,
      }}
    />
  );
}

function Impact({
  sfx,
  outcome,
  crit,
  quiet,
  lines = true,
}: {
  sfx: Sfx;
  outcome: BoutOutcome;
  crit: boolean;
  quiet: boolean;
  /** Focus lines are for a hit. A wish or a finisher lands on one card and
   *  nobody was struck, so they get the lettering only. */
  lines?: boolean;
}) {
  const tint =
    outcome === "neither"
      ? "var(--color-ko)"
      : outcome === "both"
        ? "var(--color-gold)"
        : outcome === "skip"
          ? "rgba(255,255,255,0.55)"
          : "#ffffff";

  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center overflow-hidden">
      {!quiet && lines ? <Burst tint={tint} /> : null}
      <div
        className={cn(
          "relative flex flex-col items-center gap-1",
          !quiet && "animate-ring-sfx",
        )}
      >
        {crit && outcome !== "skip" ? (
          <span className="font-dela text-impact text-lg text-[color:var(--color-gold)] sm:text-2xl">
            CRITICAL!
          </span>
        ) : null}
        <span
          className={cn(
            "font-jp-gothic text-impact text-5xl font-bold sm:text-7xl lg:text-8xl",
            crit && "scale-110",
          )}
          style={{ color: tint }}
        >
          {sfx.kana}
        </span>
        <span className="font-dot text-xs tracking-[0.3em] text-white/85 sm:text-sm">
          {sfx.gloss}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * The verdicts that aren't a fighter
 * ------------------------------------------------------------------ */

function Verdict({
  outcome,
  onPick,
  disabled,
  label,
  kana,
  tone,
}: {
  outcome: Extract<BoutOutcome, "both" | "neither" | "skip">;
  onPick: () => void;
  disabled: boolean;
  label: string;
  kana: string;
  tone: string;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      className={cn(
        "font-dot flex min-h-12 flex-1 items-center justify-center gap-2 border-2 px-3 py-2",
        "text-[0.7rem] tracking-widest transition-colors disabled:opacity-40",
        "enabled:hover:bg-white/10",
      )}
      style={{ borderColor: tone, color: tone }}
    >
      <span className="font-jp-gothic text-base leading-none">{kana}</span>
      <span>{label}</span>
      <kbd className="border border-current/40 px-1 opacity-70 pointer-coarse:hidden">
        {OUTCOMES[outcome].key}
      </kbd>
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * The ring
 * ------------------------------------------------------------------ */

export function Ring({
  pairing,
  flash,
  round,
  quiet,
  held,
  heldCount,
  moves,
  onSettle,
  onMove,
}: {
  pairing: Pairing;
  flash: Flash | null;
  /** Which bout this is, one-based. Seeds the referee and the callout. */
  round: number;
  /** Reduced motion, or somebody typed `zen`. */
  quiet: boolean;
  /** This is the held-over round: every pair here was parked earlier. */
  held: boolean;
  /** How many pairs are waiting in 預かり. */
  heldCount: number;
  /** What each of them has left to spend. */
  moves: Record<Planner, { wishes: number; finishers: number }>;
  onSettle: (outcome: BoutOutcome) => void;
  onMove: (move: "wish" | "finish", on: "east" | "west", by: Planner) => void;
}) {
  // Which card a scarce move is about to be spent on, while the ring asks
  // whose move it is. Two people share one login, so the ring has to ask —
  // and it is the right moment to ask, because three each is few enough that
  // spending one should take a beat.
  const [picking, setPicking] = useState<{
    move: "wish" | "finish";
    on: "east" | "west";
  } | null>(null);

  // While the hit plays, the pair that took it stays on screen. Swapping the
  // next question in under the sound effect makes the sound effect look like
  // it happened to the wrong card.
  const shown = flash?.pairing ?? pairing;
  const result = flash?.kind === "bout" ? flash.outcome : null;
  const callout = calloutFor(shown);
  const loaded = isCritical(
    pairing.east.item.id,
    pairing.west.item.id,
    round - 1,
  );
  const busy = flash !== null;

  const fate = (side: "savea" | "aaron"): Fate => {
    if (flash?.kind === "move") {
      const target = flash.on === "east" ? "savea" : "aaron";
      if (side !== target) return null;
      return flash.move === "wish" ? "wished" : "cut";
    }
    if (!result || result === "skip" || result === "deadlock") return null;
    if (result === "both") return "kept";
    if (result === "neither") return "lost";
    const winner = result === "east" ? "savea" : "aaron";
    return side === winner ? "won" : "lost";
  };

  function ask(move: "wish" | "finish", on: "east" | "west") {
    const left = (planner: Planner) =>
      move === "wish" ? moves[planner].wishes : moves[planner].finishers;
    // Nobody has any: say so instead of opening a dialog with two dead
    // buttons in it.
    if (left("savea") === 0 && left("aaron") === 0) return;
    setPicking({ move, on });
  }

  return (
    <div className={cn("relative", flash && !quiet && "animate-ring-shake")}>
      {/* What kind of fight this is. */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 border-2 border-b-0 border-[color:var(--color-arena-line)] bg-[color:var(--color-arena-deep)] px-4 py-2">
        <span
          key={held ? "held" : callout.title}
          className={cn(
            "font-dela text-sm tracking-wide sm:text-base",
            !quiet && "animate-ring-announce",
          )}
          style={{
            color: held ? "var(--color-chip)" : "var(--color-gold)",
          }}
        >
          {held ? "HELD OVER — SETTLE IT NOW" : callout.title}
        </span>
        <span className="font-jp-gothic text-sm text-white/45">
          {held ? MOVES.held.kana : callout.kana}
        </span>
      </div>

      {/* Health, facing each other across the middle. */}
      <div className="flex items-center gap-3 border-x-2 border-[color:var(--color-arena-line)] bg-[color:var(--color-arena-deep)] px-4 py-2">
        <Health standing={shown.east} side="savea" quiet={quiet} />
        <span className="font-dot shrink-0 text-[0.6rem] tracking-widest text-white/35">
          HP
        </span>
        <Health standing={shown.west} side="aaron" quiet={quiet} />
      </div>

      {/* The ring itself. */}
      <div className="relative overflow-hidden border-2 border-[color:var(--color-arena-line)] bg-[color:var(--color-arena)]">
        {/* The seam shows through the gap the two clip paths leave open. */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-1/2 hidden w-16 -translate-x-1/2 lg:block"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-gold) 22%, transparent) 35%, var(--color-gold) 50%, color-mix(in srgb, var(--color-gold) 22%, transparent) 65%, transparent)",
            clipPath: "polygon(4rem 0, 100% 0, calc(100% - 4rem) 100%, 0 100%)",
            opacity: 0.85,
          }}
        />

        <div className="relative grid lg:grid-cols-2">
          <Fighter
            standing={shown.east}
            side="savea"
            fate={fate("savea")}
            quiet={quiet}
            onPick={() => onSettle("east")}
          />
          <Fighter
            standing={shown.west}
            side="aaron"
            fate={fate("aaron")}
            quiet={quiet}
            onPick={() => onSettle("west")}
          />
        </div>

        {/* VS, dead centre, over the seam. */}
        <span
          aria-hidden
          className={cn(
            "font-dela text-impact pointer-events-none absolute top-1/2 left-1/2 z-10",
            "-translate-x-1/2 -translate-y-1/2 -rotate-6 text-4xl sm:text-5xl lg:text-6xl",
            "text-[color:var(--color-gold)]",
            flash && "opacity-0",
          )}
        >
          VS
        </span>

        {flash?.kind === "bout" ? (
          <Impact
            sfx={sfxFor(flash.outcome, `${round}:${flash.pairing.east.item.id}`)}
            outcome={flash.outcome}
            crit={flash.crit}
            quiet={quiet}
          />
        ) : null}

        {/* A move has no verdict, so it gets lettering and nothing else — no
            focus lines, because nobody was hit. */}
        {flash?.kind === "move" ? (
          <Impact
            sfx={
              flash.move === "finish"
                ? FINISH_SFX
                : { kana: MOVES.wish.kana, gloss: "A WISH IS SPENT" }
            }
            outcome={flash.move === "finish" ? "neither" : "both"}
            crit={false}
            quiet={quiet}
            lines={false}
          />
        ) : null}

        {/* Whose move is it? */}
        {picking ? (
          <div className="absolute inset-0 z-30 grid place-items-center bg-[color:var(--color-arena-deep)]/92 px-4">
            <div className="w-full max-w-md border-2 border-[color:var(--color-gold)]/50 bg-[color:var(--color-arena)] px-5 py-6 text-center">
              <p className="font-jp-gothic text-3xl text-[color:var(--color-gold)]">
                {MOVES[picking.move].kana}
              </p>
              <p className="font-dot mt-1 text-[0.65rem] tracking-[0.3em] text-white/60">
                {MOVES[picking.move].roman} ON
              </p>
              <p className="font-dela mt-2 text-lg text-white">
                {(picking.on === "east" ? shown.east : shown.west).item.title}
              </p>
              <p className="font-dot mt-2 text-[0.6rem] tracking-widest text-white/40">
                {MOVES[picking.move].blurb.toUpperCase()}
              </p>

              <p className="font-dot mt-6 text-[0.6rem] tracking-[0.3em] text-white/40">
                WHOSE MOVE?
              </p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {(["savea", "aaron"] as Planner[]).map((planner) => {
                  const left =
                    picking.move === "wish"
                      ? moves[planner].wishes
                      : moves[planner].finishers;
                  return (
                    <button
                      key={planner}
                      type="button"
                      disabled={left === 0}
                      onClick={() => {
                        setPicking(null);
                        onMove(picking.move, picking.on, planner);
                      }}
                      className={cn(
                        "font-dela flex min-h-16 flex-col items-center justify-center gap-1 border-2 px-3 py-2",
                        "transition-colors enabled:hover:bg-white/10 disabled:opacity-30",
                      )}
                      style={{
                        borderColor: NEON[planner],
                        color: NEON[planner],
                      }}
                    >
                      {PLANNERS[planner].label.toUpperCase()}
                      <Pips
                        total={3}
                        left={left}
                        glyph={MOVES[picking.move].pip}
                        tone={
                          picking.move === "wish"
                            ? "var(--color-gold)"
                            : "var(--color-ko)"
                        }
                      />
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setPicking(null)}
                className="font-dot mt-4 text-[0.6rem] tracking-widest text-white/40 underline"
              >
                NEVER MIND
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* The referee says the boring true thing. */}
      <p className="flex flex-wrap items-baseline justify-center gap-x-2 border-2 border-t-0 border-[color:var(--color-arena-line)] bg-[color:var(--color-arena-deep)] px-4 py-2 text-center">
        <span className="font-jp-gothic text-base text-[color:var(--color-gold)]">
          軍配
        </span>
        <span className="font-dot text-[0.7rem] tracking-wide text-white/55">
          {gyojiLine(shown, round)}
        </span>
        <span className="font-garamond text-sm text-white/45 italic">
          {shown.reason}
        </span>
      </p>

      {/* The specials, mirroring the arena: the left group acts on the left
          card, the right group on the right, and 預かり sits in the middle
          because it is the only one that acts on the bout rather than on a
          card. */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <div className="flex flex-1 items-center justify-center gap-2 lg:justify-end">
          <span aria-hidden className="font-dot text-[0.6rem] text-white/30">
            <span className="lg:hidden">▲</span>
            <span className="hidden lg:inline">◀</span>
          </span>
          <Special
            move="wish"
            side="savea"
            disabled={busy}
            onPick={() => ask("wish", "east")}
          />
          <Special
            move="finish"
            side="savea"
            disabled={busy}
            onPick={() => ask("finish", "east")}
          />
        </div>

        <button
          type="button"
          onClick={() => onSettle("deadlock")}
          disabled={busy}
          title={`${MOVES.held.roman} — ${MOVES.held.blurb}`}
          className={cn(
            "font-dot flex min-h-10 items-center gap-2 border-2 border-white/25 px-3 py-1",
            "text-[0.6rem] tracking-widest text-white/70 transition-colors",
            "enabled:hover:bg-white/10 disabled:opacity-30",
          )}
        >
          <span className="font-jp-gothic text-sm leading-none text-[color:var(--color-chip)]">
            {MOVES.held.kana}
          </span>
          <span className="hidden sm:inline">{MOVES.held.roman}</span>
          <kbd className="border border-current/40 px-1 opacity-70 pointer-coarse:hidden">
            {OUTCOMES.deadlock.key}
          </kbd>
          {heldCount > 0 ? (
            <span className="text-[color:var(--color-chip)] tabular-nums">
              {heldCount}
            </span>
          ) : null}
        </button>

        <div className="flex flex-1 items-center justify-center gap-2 lg:justify-start">
          <Special
            move="finish"
            side="aaron"
            disabled={busy}
            onPick={() => ask("finish", "west")}
          />
          <Special
            move="wish"
            side="aaron"
            disabled={busy}
            onPick={() => ask("wish", "west")}
          />
          <span aria-hidden className="font-dot text-[0.6rem] text-white/30">
            <span className="lg:hidden">▼</span>
            <span className="hidden lg:inline">▶</span>
          </span>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <Verdict
          outcome="both"
          disabled={busy}
          onPick={() => onSettle("both")}
          label="BOTH SURVIVE"
          kana="両者"
          tone="var(--color-gold)"
        />
        <Verdict
          outcome="neither"
          disabled={busy}
          onPick={() => onSettle("neither")}
          label="DOUBLE K.O."
          kana="全滅"
          tone="var(--color-ko)"
        />
        <Verdict
          outcome="skip"
          disabled={busy}
          onPick={() => onSettle("skip")}
          label="MATTA"
          kana="待った"
          tone="rgba(255,255,255,0.55)"
        />
      </div>

      {loaded && !flash ? (
        <p className="font-dot mt-2 text-center text-[0.65rem] tracking-widest text-[color:var(--color-gold)]/70">
          ⚡ something feels different about this one
        </p>
      ) : null}
    </div>
  );
}
