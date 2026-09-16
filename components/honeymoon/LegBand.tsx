"use client";

import { ArrowUp, BedDouble, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { staysIn } from "./stays";
import { LANES, formatLegDates, isAdopted, legSegments } from "./trip";
import type { Lane, TripLeg, TripStay } from "./types";

/**
 * One lane's route, drawn as a strip above that lane's cells.
 *
 * This is where the disagreement becomes visible: three strips stacked over
 * the same columns, so "Savea has us in Tokyo a night longer" is something you
 * see rather than work out. Gaps are drawn too — days that lane hasn't put
 * anywhere yet — and clicking one starts a leg on exactly those dates.
 *
 * Renders straight into the board's grid, so every piece is placed explicitly.
 */
export function LegBand({
  lane,
  legs,
  stays,
  days,
  row,
  firstColumn,
  stickyLeft,
  onEdit,
  onCreate,
  onAdopt,
}: {
  lane: Lane;
  legs: TripLeg[];
  stays: TripStay[];
  days: string[];
  row: number;
  /** The grid column of the first day — after the lane column, if there is one. */
  firstColumn: number;
  /**
   * Where a long leg's label pins while it scrolls: just clear of the sticky
   * lane column. It was once the width of the pile, back when the pile was
   * the grid's first column, and kept pinning labels 19rem in.
   */
  stickyLeft: string;
  onEdit: (leg: TripLeg) => void;
  onCreate: (lane: Lane, from: string, to: string) => void;
  onAdopt: (leg: TripLeg) => void;
}) {
  const meta = LANES[lane];

  return (
    <>
      {legSegments(legs, lane, days).map((segment) => {
        const placement = {
          gridRow: row,
          gridColumn: `${segment.column + firstColumn} / span ${segment.span}`,
          backgroundColor: meta.tint,
        };

        if (segment.kind === "gap") {
          return (
            <div
              key={`gap-${segment.from}`}
              style={placement}
              className="border-r border-border px-1.5 pt-1.5"
            >
              <button
                type="button"
                onClick={() => onCreate(lane, segment.from, segment.to)}
                className="group/gap flex h-8 w-full items-center gap-1 rounded-md border border-dashed border-border px-2 font-raleway text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              >
                {/* Kept in view while a long gap scrolls under the pile. */}
                <span
                  className="sticky flex items-center gap-1"
                  style={{ left: stickyLeft }}
                >
                  <Plus className="h-3 w-3" strokeWidth={2} />
                  {segment.span === 1 ? "Where?" : "Where are we these days?"}
                </span>
              </button>
            </div>
          );
        }

        const { leg } = segment;
        const adopted = isAdopted(leg, legs);
        // Where this lane sleeps during the leg, read off the Lodging tab.
        const beds = [
          ...new Set(
            staysIn(stays, lane)
              .filter(
                (s) =>
                  s.check_in_on <= leg.ends_on &&
                  s.check_out_on > leg.starts_on,
              )
              .map((s) => s.name),
          ),
        ].join(" · ");

        return (
          <div
            key={leg.id}
            style={placement}
            className="border-r border-border px-1.5 pt-1.5"
          >
            <div
              className="flex h-8 items-center gap-2 rounded-md border bg-background/70 pr-1"
              style={{ borderColor: meta.accent }}
            >
              <span
                aria-hidden="true"
                className="h-full w-1 flex-none rounded-l-[5px]"
                style={{ backgroundColor: meta.accent }}
              />
              <button
                type="button"
                onClick={() => onEdit(leg)}
                title={`Edit ${leg.name}`}
                // Shrink-wrapped, not flex-1: a sticky element as wide as its
                // container has nowhere to slide, so a long leg's name used
                // to scroll away with its first day.
                className="sticky flex max-w-full min-w-0 items-baseline gap-1.5 truncate rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                style={{ left: stickyLeft }}
              >
                <span className="truncate font-raleway text-xs font-semibold text-foreground">
                  {leg.name}
                </span>
                {leg.name_ja && (
                  <span className="font-jp text-[0.65rem] text-muted-foreground">
                    {leg.name_ja}
                  </span>
                )}
                <span className="font-mono text-[0.6rem] text-muted-foreground tabular-nums slashed-zero">
                  {formatLegDates(leg)}
                </span>
                {beds && (
                  <span
                    className="flex items-center gap-0.5 truncate font-garamond text-xs text-muted-foreground"
                    title={beds}
                  >
                    <BedDouble
                      className="h-3 w-3 flex-none"
                      strokeWidth={1.5}
                    />
                    <span className="truncate">{beds}</span>
                  </span>
                )}
              </button>

              {lane !== "decided" &&
                (adopted ? (
                  <span
                    title="Decided already has this leg"
                    className="ml-auto flex h-6 flex-none items-center gap-0.5 px-1.5 font-raleway text-[0.55rem] uppercase tracking-[0.15em] text-primary"
                  >
                    <Check className="h-3 w-3" strokeWidth={2} />
                    Agreed
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAdopt(leg)}
                    title={`Agreed — use ${leg.name} in Decided`}
                    aria-label={`Adopt ${leg.name} into Decided`}
                    className={cn(
                      "ml-auto flex h-6 w-6 flex-none items-center justify-center rounded-sm border border-primary/60 text-primary transition-colors",
                      "hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                    )}
                  >
                    <ArrowUp className="h-3 w-3" strokeWidth={2} />
                  </button>
                ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
