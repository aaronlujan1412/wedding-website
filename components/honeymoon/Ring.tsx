"use client";

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
import { OUTCOMES, type Pairing, type Standing } from "./bouts";
import { PLANNERS, formatDuration, itemLength } from "./trip";
import type { BoutOutcome } from "./types";

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

export type Flash = { pairing: Pairing; outcome: BoutOutcome; crit: boolean };

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
  fate: "won" | "lost" | "kept" | null;
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
        quiet && fate === "lost" && "opacity-25 grayscale",
      )}
    >
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
}: {
  sfx: Sfx;
  outcome: BoutOutcome;
  crit: boolean;
  quiet: boolean;
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
      {!quiet ? <Burst tint={tint} /> : null}
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
  onSettle,
}: {
  pairing: Pairing;
  flash: Flash | null;
  /** Which bout this is, one-based. Seeds the referee and the callout. */
  round: number;
  /** Reduced motion, or somebody typed `zen`. */
  quiet: boolean;
  onSettle: (outcome: BoutOutcome) => void;
}) {
  // While the hit plays, the pair that took it stays on screen. Swapping the
  // next question in under the sound effect makes the sound effect look like
  // it happened to the wrong card.
  const shown = flash?.pairing ?? pairing;
  const result = flash?.outcome ?? null;
  const callout = calloutFor(shown);
  const loaded = isCritical(
    pairing.east.item.id,
    pairing.west.item.id,
    round - 1,
  );

  const fate = (side: "savea" | "aaron"): "won" | "lost" | "kept" | null => {
    if (!result || result === "skip") return null;
    if (result === "both") return "kept";
    if (result === "neither") return "lost";
    const winner = result === "east" ? "savea" : "aaron";
    return side === winner ? "won" : "lost";
  };

  return (
    <div className={cn("relative", flash && !quiet && "animate-ring-shake")}>
      {/* What kind of fight this is. */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 border-2 border-b-0 border-[color:var(--color-arena-line)] bg-[color:var(--color-arena-deep)] px-4 py-2">
        <span
          key={callout.title}
          className={cn(
            "font-dela text-sm tracking-wide text-[color:var(--color-gold)] sm:text-base",
            !quiet && "animate-ring-announce",
          )}
        >
          {callout.title}
        </span>
        {callout.kana ? (
          <span className="font-jp-gothic text-sm text-white/45">
            {callout.kana}
          </span>
        ) : null}
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

        {flash ? (
          <Impact
            sfx={sfxFor(flash.outcome, `${round}:${flash.pairing.east.item.id}`)}
            outcome={flash.outcome}
            crit={flash.crit}
            quiet={quiet}
          />
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

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Verdict
          outcome="both"
          disabled={result !== null}
          onPick={() => onSettle("both")}
          label="BOTH SURVIVE"
          kana="両者"
          tone="var(--color-gold)"
        />
        <Verdict
          outcome="neither"
          disabled={result !== null}
          onPick={() => onSettle("neither")}
          label="DOUBLE K.O."
          kana="全滅"
          tone="var(--color-ko)"
        />
        <Verdict
          outcome="skip"
          disabled={result !== null}
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
