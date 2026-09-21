"use client";

import { useDroppable } from "@dnd-kit/core";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { bedPlan, formatNights, type BedAnswer, type BedSegment, type DayBeds } from "./stays";
import {
  formatLegDates,
  legSegments,
  parseDay,
  BOOKING_STATUSES,
  LIGHT_ORDER,
  type BookingLight,
  type LegSegment,
} from "./trip";
import type {
  Lane,
  TripFlight,
  TripItem,
  TripLeg,
  TripStay,
} from "./types";

const PIP_FILL: Record<BookingLight, string> = {
  ready: "bg-ready",
  // A pip is a graphic, so it takes the pace bar's brighter amber.
  pending: "bg-caution",
  none: "bg-border",
};

/** A day cell is a drop target, so a card can be flung eight days away. */
export const DAY_DROP_PREFIX = "route-day:";

/**
 * Half the narrowest a day column is allowed to get.
 *
 * Every bed bar is inset by this at both ends, which is what puts the beds
 * half a day out of step with the dates above them — a bar starts the
 * afternoon you check in and ends the morning you check out. Two bars meeting
 * therefore seam somewhere inside a single day column, and that column is the
 * day you travel.
 */
const HALF_DAY = "1.25rem";

/**
 * The trip read left to right, once.
 *
 * Three rows over one set of day columns: where you are, what day it is, and
 * where you sleep. The first two used to be the whole strip, and they could
 * not answer the question people actually asked it — "wait, which morning do
 * we leave?" Legs own whole days and can't overlap, so the day you move
 * belongs entirely to wherever you're going, and the strip said you were
 * already there at breakfast.
 *
 * The beds fix that by being drawn where they really fall. A night sits
 * between two days, so the bed row is offset half a column from the date row,
 * and a travel day is simply a day with a seam through the middle of it.
 *
 * The bar under everything is which of the board's columns are on screen
 * right now, out of the whole trip.
 */
export function RouteStrip({
  days,
  legs,
  stays,
  flights,
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
  /** So a night in the air doesn't read as a night nobody booked. */
  flights: TripFlight[];
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
  const active = legs.find((l) => l.id === activeLegId) ?? null;
  const { segments, byDay } = bedPlan(days, stays, flights);

  return (
    <div className="rail-scroll overflow-x-auto px-2 pt-2 pb-1.5">
      <div
        className="grid gap-x-0.5"
        style={{
          gridTemplateColumns: `repeat(${days.length}, minmax(2.5rem, 1fr))`,
          gridTemplateRows: "auto auto auto 0.5rem",
        }}
      >
        {legSegments(legs, "decided", days).map((segment) => (
          <Span
            key={segment.kind === "leg" ? segment.leg.id : `gap-${segment.from}`}
            segment={segment}
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
            beds={byDay.get(date)}
            inScope={
              !active || (date >= active.starts_on && date <= active.ends_on)
            }
            isToday={date === today}
            onDay={onDay}
          />
        ))}

        {segments.map((segment) => (
          <Bed key={`${segment.from}-${bedId(segment)}`} segment={segment} days={days} />
        ))}

        {/* The seam itself. Two bars of the same green meeting under a date
            is easy to miss, and that meeting point is the whole message, so
            it gets a hairline rather than being left to the gap. */}
        {days.map((date, i) =>
          byDay.get(date)?.moving ? (
            <span
              key={`seam-${date}`}
              aria-hidden="true"
              className="pointer-events-none relative z-10 mt-1 w-px justify-self-center bg-border"
              style={{ gridRow: 3, gridColumn: i + 1 }}
            />
          ) : null,
        )}

        {onScreen && (
          <span
            aria-hidden="true"
            className="mt-1 h-0.5 self-start rounded-full bg-primary"
            style={{
              gridRow: 4,
              gridColumn: `${onScreen.first + 1} / ${onScreen.last + 2}`,
            }}
          />
        )}
      </div>
    </div>
  );
}

function bedId(segment: BedSegment): string {
  return segment.kind === "bed" ? segment.stay.id : segment.kind;
}

/* ------------------------------------------------------------------ copy -- */

function wakePhrase(answer: BedAnswer): string {
  if (answer.kind === "bed") return `wake up at ${answer.stay.name}`;
  return answer.kind === "plane"
    ? "wake up on the plane"
    : "no bed booked last night";
}

function sleepPhrase(answer: BedAnswer): string {
  if (answer.kind === "bed") return `go to sleep at ${answer.stay.name}`;
  return answer.kind === "plane"
    ? "sleep on the plane"
    : "no bed booked for tonight";
}

/* ------------------------------------------------------------------ rows -- */

function Span({
  segment,
  active,
  onLeg,
  onEditLeg,
  onCreateLeg,
}: {
  segment: LegSegment;
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
  beds,
  inScope,
  isToday,
  onDay,
}: {
  date: string;
  column: number;
  items: TripItem[];
  beds: DayBeds | undefined;
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
  // The seam in the row below is the visible half of this; the words are for
  // anyone hovering, and for anyone who can't see the seam at all.
  const move =
    beds?.moving && beds.woke && beds.sleeps
      ? `${wakePhrase(beds.woke)}, ${sleepPhrase(beds.sleeps)}`
      : null;

  return (
    <button
      ref={setNodeRef}
      data-drop-zone=""
      type="button"
      onClick={() => onDay(date)}
      aria-label={`${label}: ${move ? `${move}. ` : ""}${items.length} planned. Scroll the board to this day.`}
      title={`${label}${move ? ` · ${move}` : ""} · ${items.length} planned`}
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

/**
 * One run of nights, drawn where those nights actually fall.
 *
 * The bar covers the stay's own two dates — check-in through check-out — and
 * is then pulled in half a day at each end, which is exactly what those dates
 * mean: you arrive in the afternoon and you leave in the morning. Nothing
 * here needs to say "travel day", because the gap between two bars is one.
 */
function Bed({ segment, days }: { segment: BedSegment; days: string[] }) {
  const nights = formatNights(segment.nights);
  const from = parseDay(days[segment.from]);
  const to = parseDay(days[segment.to + 1]);
  const span = `${from.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${to.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  const face =
    segment.kind === "bed"
      ? {
          text: segment.stay.name,
          title: `${segment.stay.name} · ${span} · ${nights} · ${BOOKING_STATUSES[segment.stay.booking_status].label.toLowerCase()}`,
          className:
            BOOKING_STATUSES[segment.stay.booking_status].light === "ready"
              ? "border-ready/60 bg-ready/10 text-foreground"
              : BOOKING_STATUSES[segment.stay.booking_status].light === "pending"
                // Amber border, but no wash: the wash below means "nothing
                // here", and a hotel you still have to book is not nothing.
                ? "border-pending/70 bg-background text-foreground"
                : "border-border bg-background text-muted-foreground",
        }
      : segment.kind === "plane"
        ? {
            text: "Plane",
            title: `${nights} in the air · ${span}`,
            className:
              "border-dashed border-border bg-transparent text-muted-foreground",
          }
        : {
            // The one loud thing down here, in the same amber Lodging uses
            // for the same hole.
            text: "No bed",
            title: `${nights} with no bed · ${span}`,
            className: "border-dashed border-pending bg-caution/25 text-pending",
          };

  return (
    <span
      style={{
        gridRow: 3,
        gridColumn: `${segment.from + 1} / ${segment.to + 3}`,
        marginInline: HALF_DAY,
      }}
      title={face.title}
      className={cn(
        "mt-1 flex min-w-0 items-center justify-center overflow-hidden rounded-sm border px-1.5 py-0.5",
        face.className,
      )}
    >
      <span className="truncate font-garamond text-xs leading-tight">
        {face.text}
      </span>
    </span>
  );
}
