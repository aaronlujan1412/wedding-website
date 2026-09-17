"use client";

import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { clock, type EightCount, startOf } from "@/lib/first-dance";
import { FigureCard } from "./Figures";
import { BeatStrip, Pips } from "./Notation";

/**
 * One eight-count.
 *
 * The source sheet gave every line the same weight, which is why it was
 * unreadable in motion. Here each eight-count is a CUE of three to five words,
 * set large enough to read from across a room, with the detail underneath for
 * the pass where you are standing still. When the walk-through reaches a row,
 * the cue grows again — that is the whole readability argument on this page.
 */
export function CountRow({
  count,
  active,
  beat,
  countIn,
  canWalk,
  onStart,
}: {
  count: EightCount;
  active: boolean;
  beat?: number;
  countIn?: boolean;
  /** False in song mode before a file has been chosen. */
  canWalk: boolean;
  onStart: () => void;
}) {
  return (
    <li
      data-counts={count.n}
      className={cn(
        "group relative flex scroll-mt-32 gap-3 border-l-2 py-4 pl-3 transition-colors sm:gap-5 sm:pl-4 motion-reduce:transition-none",
        active
          ? "border-primary bg-paper"
          : "border-transparent hover:border-border",
      )}
    >
      <div className="w-[4.5rem] flex-none pt-1">
        <div
          className={cn(
            "font-mono text-sm tabular-nums slashed-zero",
            active ? "text-primary" : "text-foreground/70",
          )}
        >
          E{count.n}
        </div>
        <div className="font-mono text-[0.65rem] tabular-nums slashed-zero text-muted-foreground">
          {clock(startOf(count.n))}
        </div>
        <div className="mt-2">
          <Pips gear={count.gear} on={active && !countIn ? beat : undefined} dim={!active} />
        </div>
        {count.care && (
          <div className="mt-2 font-mono text-[0.6rem] tracking-wide text-muted-foreground">
            load
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3
          className={cn(
            "font-garamond leading-tight transition-[font-size] motion-reduce:transition-none",
            active
              ? "text-4xl text-primary sm:text-5xl"
              : "text-2xl text-foreground sm:text-[1.75rem]",
          )}
        >
          {count.cue}
        </h3>

        {count.detail && (
          <p className="mt-1.5 max-w-[60ch] font-garamond text-lg leading-relaxed text-foreground/85">
            {count.detail}
          </p>
        )}

        {count.beats && (
          <BeatStrip
            beats={count.beats}
            on={active && !countIn ? beat : undefined}
          />
        )}

        {count.figure && <FigureCard figure={count.figure} />}

        {count.note && (
          <div className="mt-3 max-w-[58ch] border-l-2 border-border pl-3">
            <p className="font-garamond text-lg leading-snug text-foreground">
              {count.note.title}
            </p>
            <p className="mt-0.5 font-garamond text-base leading-relaxed text-muted-foreground">
              {count.note.body}
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={!canWalk}
        onClick={onStart}
        title={`Count in and walk from E${count.n}`}
        className="absolute top-4 right-0 flex h-9 w-9 flex-none items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-primary focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring group-hover:opacity-100 disabled:hidden pointer-coarse:opacity-100 print:hidden motion-reduce:transition-none"
      >
        <Play className="h-4 w-4" strokeWidth={1.5} />
        <span className="sr-only">Walk from E{count.n}</span>
      </button>
    </li>
  );
}

/**
 * A stretch that holds.
 *
 * Five of Settle's twelve eight-counts said only "Same." in the source table,
 * which costs five rows to say one thing. Consecutive holds collapse into one
 * row that names how long the hold actually lasts — and during a walk-through
 * it says which of them you are on, because that is the part you would
 * otherwise lose count of.
 */
export function HeldRow({
  counts,
  activeIndex,
  beat,
  countIn,
  canWalk,
  onStart,
}: {
  counts: EightCount[];
  /** Position within this stretch, or -1. */
  activeIndex: number;
  beat?: number;
  countIn?: boolean;
  /** False in song mode before a file has been chosen. */
  canWalk: boolean;
  onStart: () => void;
}) {
  const first = counts[0];
  const last = counts[counts.length - 1];
  const active = activeIndex >= 0;
  const seconds = Math.round((startOf(last.n + 1) - startOf(first.n)) * 10) / 10;

  return (
    <li
      data-counts={counts.map((c) => c.n).join(" ")}
      className={cn(
        "group relative flex scroll-mt-32 items-baseline gap-3 border-l-2 py-3 pl-3 transition-colors sm:gap-5 sm:pl-4 motion-reduce:transition-none",
        active ? "border-primary bg-paper" : "border-transparent hover:border-border",
      )}
    >
      <div className="w-[4.5rem] flex-none">
        <div
          className={cn(
            "font-mono text-sm tabular-nums slashed-zero",
            active ? "text-primary" : "text-foreground/70",
          )}
        >
          {counts.length === 1 ? `E${first.n}` : `E${first.n}–${last.n}`}
        </div>
        <div className="mt-2">
          <Pips
            gear={first.gear}
            on={active && !countIn ? beat : undefined}
            dim={!active}
          />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-garamond leading-tight",
            active ? "text-3xl text-primary sm:text-4xl" : "text-xl text-foreground/80",
          )}
        >
          {first.cue}
        </p>
        <p className="mt-0.5 font-mono text-xs tabular-nums slashed-zero text-muted-foreground">
          {active
            ? `${activeIndex + 1} of ${counts.length}`
            : counts.length === 1
              ? `one eight-count · ${seconds}s`
              : `${counts.length} eight-counts · ${seconds}s`}
        </p>
      </div>

      <button
        type="button"
        disabled={!canWalk}
        onClick={onStart}
        title={`Count in and walk from E${first.n}`}
        className="absolute top-3 right-0 flex h-9 w-9 flex-none items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-primary focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring group-hover:opacity-100 disabled:hidden pointer-coarse:opacity-100 print:hidden motion-reduce:transition-none"
      >
        <Play className="h-4 w-4" strokeWidth={1.5} />
        <span className="sr-only">Walk from E{first.n}</span>
      </button>
    </li>
  );
}
