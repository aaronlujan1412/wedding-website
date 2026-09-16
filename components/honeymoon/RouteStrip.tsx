"use client";

import { useDroppable } from "@dnd-kit/core";
import { BedDouble, Pencil, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { sleepsOn, staysIn } from "./stays";
import {
  addDays,
  eachDay,
  formatLegDates,
  legSegments,
  parseDay,
  BOOKING_STATUSES,
  LIGHT_ORDER,
  type BookingLight,
  type LegSegment,
} from "./trip";
import type { Lane, TripItem, TripLeg, TripStay } from "./types";

const PIP_FILL: Record<BookingLight, string> = {
  ready: "bg-ready",
  // A pip is a graphic, so it takes the pace bar's brighter amber.
  pending: "bg-caution",
  none: "bg-border",
};

/** A day cell is a drop target, so a card can be flung eight days away. */
export const DAY_DROP_PREFIX = "route-day:";

/**
 * The trip read left to right, once.
 *
 * This is three things that used to be drawn separately above the board: a row
 * of leg chips (which were also, invisibly, the date filter), a ribbon of day
 * chips (whose jump links pointed at ids nothing rendered), and the route band
 * Decided had before that. All three were the same diagram — days, and the
 * legs that cover them — so here it is as one: days are cells, legs are spans
 * over them, a missing bed is a mark on the span.
 *
 * The bar under the days is the part none of them had: which of the board's
 * columns are on screen right now, out of the whole trip.
 */
export function RouteStrip({
  days,
  legs,
  stays,
  items,
  activeLegId,
  onLeg,
  onEditLeg,
  onCreateLeg,
  onDay,
  onScreen,
  today,
}: {
  days: string[];
  legs: TripLeg[];
  stays: TripStay[];
  /** The viewed lane's cards, for the per-day marks. */
  items: TripItem[];
  activeLegId: string | null;
  onLeg: (id: string | null) => void;
  onEditLeg: (leg: TripLeg) => void;
  onCreateLeg: (lane: Lane, from: string, to: string) => void;
  onDay: (date: string) => void;
  /** Indices into `days` of the first and last column the board is showing. */
  onScreen: { first: number; last: number } | null;
  today: string;
}) {
  const beds = staysIn(stays, "decided");
  const active = legs.find((l) => l.id === activeLegId) ?? null;

  return (
    <div className="rail-scroll overflow-x-auto px-2 pt-2 pb-1.5">
      <div
        className="grid gap-x-0.5"
        style={{
          gridTemplateColumns: `repeat(${days.length}, minmax(2.5rem, 1fr))`,
          gridTemplateRows: "auto auto 0.5rem",
        }}
      >
        {legSegments(legs, "decided", days).map((segment) => (
          <Span
            key={segment.kind === "leg" ? segment.leg.id : `gap-${segment.from}`}
            segment={segment}
            beds={beds}
            active={segment.kind === "leg" && segment.leg.id === activeLegId}
            onLeg={onLeg}
            onEditLeg={onEditLeg}
            onCreateLeg={onCreateLeg}
          />
        ))}

        {days.map((date, i) => (
          <Day
            key={date}
            date={date}
            column={i + 1}
            items={items.filter((item) => item.on_date === date)}
            inScope={
              !active || (date >= active.starts_on && date <= active.ends_on)
            }
            isToday={date === today}
            onDay={onDay}
          />
        ))}

        {onScreen && (
          <span
            aria-hidden="true"
            className="mt-1 h-0.5 self-start rounded-full bg-primary"
            style={{
              gridRow: 3,
              gridColumn: `${onScreen.first + 1} / ${onScreen.last + 2}`,
            }}
          />
        )}
      </div>
    </div>
  );
}

function Span({
  segment,
  beds,
  active,
  onLeg,
  onEditLeg,
  onCreateLeg,
}: {
  segment: LegSegment;
  beds: TripStay[];
  active: boolean;
  onLeg: (id: string | null) => void;
  onEditLeg: (leg: TripLeg) => void;
  onCreateLeg: (lane: Lane, from: string, to: string) => void;
}) {
  const placement = {
    gridRow: 1,
    gridColumn: `${segment.column + 1} / span ${segment.span}`,
  };

  // Days inside the trip that no leg covers. Clicking one starts a leg on
  // exactly those dates.
  if (segment.kind === "gap") {
    const dates = formatLegDates({
      starts_on: segment.from,
      ends_on: segment.to,
    });
    return (
      <button
        type="button"
        style={placement}
        onClick={() => onCreateLeg("decided", segment.from, segment.to)}
        title={`${dates}: nowhere yet. Add a leg for these days.`}
        className="flex min-w-0 flex-col justify-center rounded-t-md border border-b-0 border-dashed border-border px-2 py-1.5 text-left transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <span className="truncate font-garamond text-sm leading-tight text-muted-foreground italic">
          {segment.span === 1 ? "Where?" : "Nowhere yet"}
        </span>
      </button>
    );
  }

  const { leg } = segment;
  // Every night of this leg except the last day, which is the day you leave.
  const nights = eachDay(leg.starts_on, addDays(leg.ends_on, -1));
  const uncovered = nights.filter((n) => !beds.some((s) => sleepsOn(s, n)));
  const names = [
    ...new Set(
      beds.filter((s) => nights.some((n) => sleepsOn(s, n))).map((s) => s.name),
    ),
  ].join(" · ");

  return (
    <div
      style={placement}
      className={cn(
        "group/leg relative flex min-w-0 rounded-t-md border border-b-0 transition-colors",
        active
          ? "border-primary bg-primary/5"
          : "border-border bg-background hover:border-primary/50",
      )}
    >
      <button
        type="button"
        onClick={() => onLeg(active ? null : leg.id)}
        aria-pressed={active}
        title={
          active
            ? `Showing ${leg.name} only. Click to show the whole trip.`
            : `${leg.name}, ${formatLegDates(leg)}. Click to show just these days.`
        }
        className="flex min-w-0 flex-1 flex-col rounded-t-md px-2 py-1.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        {/* In a two-day span the Japanese name gives way entirely before the
            English one loses a letter. A weighted shrink can't promise that:
            it still hands the name a fraction of a pixel of the overflow, and
            any overflow at all turns "Hakone" into "Hako…". So the name
            doesn't shrink — it truncates only once it alone is wider than the
            span. */}
        <span className="flex min-w-0 items-baseline gap-1.5 pr-3">
          <span className="max-w-full flex-none truncate font-garamond text-base leading-tight text-foreground">
            {leg.name}
          </span>
          {leg.name_ja && (
            <span className="min-w-0 truncate font-jp text-xs text-muted-foreground">
              {leg.name_ja}
            </span>
          )}
        </span>

        {/* Where you're sleeping, next to where you are — or that you aren't. */}
        {uncovered.length > 0 ? (
          <span className="mt-0.5 flex min-w-0 items-center gap-1 font-mono text-[0.6rem] text-warn">
            <TriangleAlert
              className="h-2.5 w-2.5 flex-none"
              strokeWidth={2}
              aria-hidden="true"
            />
            <span className="truncate">
              {uncovered.length} {uncovered.length === 1 ? "night" : "nights"}{" "}
              with no bed
            </span>
          </span>
        ) : (
          names && (
            <span className="mt-0.5 flex min-w-0 items-center gap-1 font-mono text-[0.6rem] text-muted-foreground">
              <BedDouble
                className="h-2.5 w-2.5 flex-none"
                strokeWidth={2}
                aria-hidden="true"
              />
              <span className="truncate">{names}</span>
            </span>
          )
        )}
      </button>

      <button
        type="button"
        onClick={() => onEditLeg(leg)}
        aria-label={`Edit ${leg.name}`}
        title={`Edit ${leg.name}`}
        className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity group-hover/leg:opacity-100 hover:text-primary focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:h-8 pointer-coarse:w-8 pointer-coarse:opacity-100"
      >
        <Pencil className="h-2.5 w-2.5" strokeWidth={2} />
      </button>
    </div>
  );
}

function Day({
  date,
  column,
  items,
  inScope,
  isToday,
  onDay,
}: {
  date: string;
  column: number;
  items: TripItem[];
  inScope: boolean;
  isToday: boolean;
  onDay: (date: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${DAY_DROP_PREFIX}${date}`,
  });
  const day = parseDay(date);
  // Ready first, then still to book, then plain plans: the day reads as a
  // traffic light from the left.
  const pips = items
    .map((i) => BOOKING_STATUSES[i.booking_status].light)
    .sort((a, b) => LIGHT_ORDER[a] - LIGHT_ORDER[b])
    .slice(0, 5);
  const label = day.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onDay(date)}
      aria-label={`${label}: ${items.length} planned. Scroll the board to this day.`}
      title={`${label} · ${items.length} planned`}
      style={{ gridRow: 2, gridColumn: column }}
      className={cn(
        "flex min-w-0 flex-col items-center rounded-b-md border px-0.5 pt-1 pb-1.5 transition-colors",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        isOver
          ? "border-primary bg-secondary"
          : "border-border bg-paper hover:border-primary/60",
        !inScope && "opacity-45",
        isToday && "ring-1 ring-primary ring-inset",
      )}
    >
      <span className="font-raleway text-[0.55rem] tracking-[0.15em] text-muted-foreground uppercase">
        {day.toLocaleDateString("en-US", { weekday: "narrow" })}
      </span>
      <span className="font-mono text-sm leading-none text-foreground tabular-nums slashed-zero">
        {day.getDate()}
      </span>
      {/* Green is booked, amber still needs booking, grey is just a plan. */}
      <span className="mt-1 flex h-1 items-center gap-px" aria-hidden="true">
        {pips.map((light, i) => (
          <span
            key={i}
            className={cn("h-1 w-1 rounded-full", PIP_FILL[light])}
          />
        ))}
      </span>
    </button>
  );
}
