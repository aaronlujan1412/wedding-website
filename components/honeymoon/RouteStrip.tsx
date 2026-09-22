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
 * Every leg is inset by this at both ends, which is what puts the route half
 * a day out of step with the dates under it — a leg starts the afternoon you
 * arrive and ends the morning you leave. Two legs meeting therefore seam
 * somewhere inside a single day column, and that column is the day you
 * travel.
 */
const HALF_DAY = "1.25rem";

/**
 * The trip read left to right, once.
 *
 * Two rows over one set of day columns: the route, and what day it is. The
 * route used to butt whole days against each other, which could not answer
 * the question people actually asked the strip — "wait, which morning do we
 * leave?" Legs own whole days and are forbidden from overlapping, so the day
 * you move belongs entirely to wherever you are going, and the strip said you
 * were already there at breakfast.
 *
 * A night sits between two days, so a leg is drawn where it really falls:
 * offset half a column from the dates, midday on the first day to midday on
 * the day after the last. A travel day is then simply a day with a seam
 * through the middle of it.
 *
 * Where you sleep lives INSIDE the leg rather than on a row of its own (see
 * `Nights`), because that is the real relationship — a leg holds beds, it
 * does not sit beside them.
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
          gridTemplateRows: "auto auto 0.5rem",
        }}
      >
        {legSegments(legs, "decided", days).map((segment) => (
          <Span
            key={segment.kind === "leg" ? segment.leg.id : `gap-${segment.from}`}
            segment={segment}
            dayCount={days.length}
            beds={segments}
            days={days}
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
  dayCount,
  beds,
  days,
  active,
  onLeg,
  onEditLeg,
  onCreateLeg,
}: {
  segment: LegSegment;
  dayCount: number;
  /** Every run of nights on the strip. The band clips them to this leg. */
  beds: BedSegment[];
  days: string[];
  active: boolean;
  onLeg: (id: string | null) => void;
  onEditLeg: (leg: TripLeg) => void;
  onCreateLeg: (lane: Lane, from: string, to: string) => void;
}) {
  // A leg's last day is a day you're still there — the form says "Last day,
  // inclusive" — so you leave the morning after it. The bar therefore runs
  // from midday on the first day to midday on the day after the last, which
  // is the same shape as a stay's check-in to check-out, and lines the two
  // rows up whenever the route and the beds agree. A leg running to the end
  // of the trip has no day after, so the end is clamped to the last column.
  const placement = {
    gridRow: 1,
    gridColumn: `${segment.column + 1} / ${Math.min(
      segment.column + segment.span + 2,
      dayCount + 1,
    )}`,
    marginInline: HALF_DAY,
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
        className="mb-1 flex min-w-0 flex-col overflow-hidden rounded-md border border-dashed border-border pt-1.5 text-left transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <span className="truncate px-2 pb-1 font-garamond text-sm leading-tight text-muted-foreground italic">
          {segment.span === 1 ? "Where?" : "Nowhere yet"}
        </span>
        <Nights
          beds={beds}
          column={segment.column}
          span={segment.span}
          days={days}
        />
      </button>
    );
  }

  const { leg } = segment;

  return (
    <div
      style={placement}
      className={cn(
        "group/leg relative mb-1 flex min-w-0 flex-col overflow-hidden rounded-md border transition-colors",
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
        className="flex min-w-0 flex-col px-2 pt-1.5 pb-1 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
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

      <Nights
        beds={beds}
        column={segment.column}
        span={segment.span}
        days={days}
      />

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
        "flex min-w-0 flex-col items-center rounded-md border px-0.5 pt-1 pb-1.5 transition-colors",
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
 * The nights of one leg, along the foot of it.
 *
 * A leg bar runs from midday on its first day to midday on the day after its
 * last, so its width is exactly its own night count — which means one grid
 * cell per night needs no arithmetic beyond clipping each run of nights to
 * this leg. The beds sit inside the place they belong to rather than beside
 * it, because that is the real relationship: you are in Kyoto, and inside
 * that you sleep at the Yachiyo. Drawn as two rows they read as equals.
 *
 * How full the box is is the message. A hotel covering the whole leg fills
 * it edge to edge; anything missing leaves amber showing on exactly the
 * nights that have no bed.
 */
function Nights({
  beds,
  column,
  span,
  days,
}: {
  beds: BedSegment[];
  column: number;
  span: number;
  days: string[];
}) {
  const inside = beds
    .map((bed) => ({
      bed,
      from: Math.max(bed.from, column),
      to: Math.min(bed.to, column + span - 1),
    }))
    .filter((run) => run.from <= run.to);

  if (inside.length === 0) return null;

  return (
    <span
      className="grid gap-px"
      style={{ gridTemplateColumns: `repeat(${span}, minmax(0, 1fr))` }}
    >
      {inside.map(({ bed, from, to }) => (
        <Bed
          key={`${from}-${bedId(bed)}`}
          bed={bed}
          from={from}
          to={to}
          column={column}
          days={days}
        />
      ))}
    </span>
  );
}

/** One run of nights inside its leg. Fills rather than outlines: a border on
 *  every run would be a second grid inside a box that already has one. */
function Bed({
  bed,
  from,
  to,
  column,
  days,
}: {
  bed: BedSegment;
  from: number;
  to: number;
  column: number;
  days: string[];
}) {
  const count = to - from + 1;
  const short = (iso: string) =>
    parseDay(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const when = `${short(days[from])} – ${short(days[to + 1] ?? days[to])}`;
  const nights = formatNights(count);

  const face =
    bed.kind === "bed"
      ? {
          text: bed.stay.name,
          title: `${bed.stay.name} · ${when} · ${nights} · ${BOOKING_STATUSES[bed.stay.booking_status].label.toLowerCase()}`,
          className:
            BOOKING_STATUSES[bed.stay.booking_status].light === "ready"
              ? "bg-ready/15 text-foreground"
              : BOOKING_STATUSES[bed.stay.booking_status].light === "pending"
                // Amber, but lighter than a hole: a hotel you still have to
                // book is not the same as having nowhere to sleep.
                ? "bg-caution/25 text-foreground"
                : "bg-secondary text-muted-foreground",
        }
      : bed.kind === "plane"
        ? {
            text: "Plane",
            title: `${nights} in the air · ${when}`,
            className: "bg-muted/60 text-muted-foreground",
          }
        : {
            // The one loud thing in here, in the amber Lodging uses for the
            // same hole.
            text: "No bed",
            title: `${nights} with no bed · ${when}`,
            className: "bg-caution/50 text-pending",
          };

  return (
    <span
      style={{ gridColumn: `${from - column + 1} / ${to - column + 2}` }}
      title={face.title}
      className={cn(
        "flex min-w-0 items-center justify-center overflow-hidden px-1 py-0.5",
        face.className,
      )}
    >
      <span className="truncate font-garamond text-[0.65rem] leading-tight">
        {face.text}
      </span>
    </span>
  );
}
