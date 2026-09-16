"use client";

import Link from "next/link";
import {
  ArrowDownWideNarrow,
  NotebookPen,
  Plane,
  TramFront,
  TriangleAlert,
} from "lucide-react";
import { flightsOnDay, formatClockIn } from "./flights";
import { arrivesClock, departsClock, transitOnDay } from "./transit";
import { cn } from "@/lib/utils";
import {
  PACE_CEILING,
  PACE_TARGET,
  cashYen,
  dayWarnings,
  formatDuration,
  formatYen,
  legForDay,
  legsIn,
  paceMinutes,
  parseDay,
  sumYen,
  yenAsUsd,
} from "./trip";
import { useRate } from "./RateContext";
import type { TripDay, TripItem, TripLeg } from "./types";

/**
 * The sticky top cell of a day column.
 *
 * Every number here describes one lane — whichever the current view is about.
 * It used to always be `decided`, which meant a single-lane view could warn
 * about a twelve-hour march sitting on a row you were not looking at. A day
 * only ever gets costed against one lane, never a sum of them: two drafts for
 * the same afternoon are alternatives, not an itinerary.
 */
export function DayHeader({
  date,
  note,
  legs,
  laneItems,
  marksChange = true,
  isToday,
  onEditNote,
  onSortByTime,
  flights = [],
  transit = [],
  style,
  variant = "cell",
}: {
  style?: React.CSSProperties;
  /** A sticky grid cell on the desktop board, or the top of a day page on a phone. */
  variant?: "cell" | "page";
  /** Flights leaving or landing on this date, from `flightsOnDay`. */
  flights?: ReturnType<typeof flightsOnDay>;
  /** Trains and buses touching this date, from `transitOnDay`. */
  transit?: ReturnType<typeof transitOnDay>;
  date: string;
  note?: TripDay;
  legs: TripLeg[];
  /** The viewed lane's cards on this day. */
  laneItems: TripItem[];
  /**
   * True when the agreed route changes here — the first day of a leg, or the
   * first day of a stretch with no leg on it. The leg's name is drawn only on
   * those days: the trip bar already lists the route, so repeating "Tokyo" down
   * six columns was the same word in a third place. Shown at the boundary it
   * stops being a repeat and starts marking where you move.
   */
  marksChange?: boolean;
  isToday: boolean;
  onEditNote: (date: string) => void;
  onSortByTime: (date: string) => void;
}) {
  const rate = useRate();
  // The header names where the agreed route has you. Drafts show in their own
  // lane's leg band, not here.
  const leg = legForDay(legsIn(legs, "decided"), date);
  const warnings = dayWarnings(date, laneItems, undefined, transit.length > 0);
  const pace = paceMinutes(laneItems);
  const spend = sumYen(laneItems, rate);
  const cash = cashYen(laneItems, rate);

  const day = parseDay(date);

  return (
    <div
      style={style}
      // The board measures columns by this, and the route strip scrolls to it.
      data-board-day={variant === "cell" ? date : undefined}
      className={cn(
        variant === "cell" &&
          "sticky top-0 z-30 border-r border-b border-border bg-background px-3 py-2.5",
        variant === "cell" && isToday && "bg-secondary",
      )}
    >
      <div
        className={cn(
          "flex justify-between gap-2",
          variant === "cell" ? "items-baseline" : "items-start",
        )}
      >
        {variant === "cell" ? (
          <p className="font-mono text-xs tracking-wider text-foreground tabular-nums slashed-zero">
            <span className="uppercase text-muted-foreground">
              {day.toLocaleDateString("en-US", { weekday: "short" })}
            </span>{" "}
            {day.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </p>
        ) : (
          <div>
            <p className="font-raleway text-[0.65rem] uppercase tracking-[0.25em] text-primary">
              {day.toLocaleDateString("en-US", { weekday: "long" })}
              {isToday && " · today"}
            </p>
            <h2 className="font-garamond text-3xl leading-tight text-foreground">
              {day.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
              })}
            </h2>
          </div>
        )}
        <div className="flex items-center gap-0.5">
          <IconButton label="Day note" onClick={() => onEditNote(date)}>
            <NotebookPen className="h-3.5 w-3.5" strokeWidth={1.5} />
          </IconButton>
          <IconButton
            label="Sort the decided lane by time"
            onClick={() => onSortByTime(date)}
          >
            <ArrowDownWideNarrow className="h-3.5 w-3.5" strokeWidth={1.5} />
          </IconButton>
        </div>
      </div>

      <p
        className={cn(
          "mt-0.5 font-garamond leading-tight text-foreground",
          variant === "cell" ? "truncate text-lg" : "text-xl",
        )}
      >
        {note?.title ||
          (marksChange ? leg?.name || "No agreed leg yet" : "\u00a0")}
        {marksChange &&
          (note?.title ? (
            // The day is named for what happens on it, so where you've arrived
            // rides along beside it rather than displacing it.
            <span className="ml-1.5 text-sm text-muted-foreground">
              {leg?.name}
              {leg?.name_ja && (
                <span className="ml-1 font-jp text-xs">{leg.name_ja}</span>
              )}
            </span>
          ) : (
            leg?.name_ja && (
              <span className="ml-1.5 font-jp text-xs text-muted-foreground">
                {leg.name_ja}
              </span>
            )
          ))}
      </p>

      {transit.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {transit.map(({ ride, leaves, lands }) => (
            <li key={ride.id}>
              <Link
                href="/honeymoon/transit"
                className="flex items-center gap-1 rounded-sm font-mono text-[0.6rem] text-primary tabular-nums slashed-zero hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              >
                <TramFront
                  className="h-2.5 w-2.5 flex-none"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                {leaves
                  ? `${ride.from_place} ${departsClock(ride)} → ${ride.to_place}${lands ? ` ${arrivesClock(ride)}` : ""}`
                  : `Arrives ${ride.to_place} ${arrivesClock(ride)}`}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {flights.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {flights.map(({ flight, leaves, lands }) => (
            <li key={flight.id}>
              <Link
                href="/honeymoon/flights"
                className="flex items-center gap-1 rounded-sm font-mono text-[0.6rem] text-primary tabular-nums slashed-zero hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Plane
                  className="h-2.5 w-2.5 flex-none"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                {leaves && lands
                  ? `${flight.from_airport} ${formatClockIn(flight.departs_at, flight.departs_tz)} → ${flight.to_airport} ${formatClockIn(flight.arrives_at, flight.arrives_tz)}`
                  : leaves
                    ? `${flight.from_airport} ${formatClockIn(flight.departs_at, flight.departs_tz)} → ${flight.to_airport}`
                    : `Lands ${flight.to_airport} ${formatClockIn(flight.arrives_at, flight.arrives_tz)}`}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <PaceBar minutes={pace} />

      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 font-mono text-[0.6rem] tracking-wide text-muted-foreground tabular-nums slashed-zero">
        <span>
          {laneItems.length === 0 ? "nothing planned" : formatDuration(pace)}
        </span>
        {spend > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span>
              {formatYen(spend)} / {yenAsUsd(spend, rate)}
            </span>
          </>
        )}
        {cash > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span title="Cash you'll want on you — anything not already ticketed">
              {formatYen(cash)} cash
            </span>
          </>
        )}
      </p>

      {warnings.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {warnings.map((w, i) => (
            <li
              key={`${w.text}-${i}`}
              className={cn(
                "flex items-start gap-1 font-raleway text-[0.65rem] leading-snug",
                w.tone === "warn" ? "text-warn" : "text-muted-foreground",
              )}
            >
              <TriangleAlert
                className="mt-px h-2.5 w-2.5 flex-none"
                strokeWidth={2}
              />
              {w.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** How full the day is. A honeymoon that reads like a conference agenda is a bug. */
function PaceBar({ minutes }: { minutes: number }) {
  const fill = Math.min(minutes / PACE_CEILING, 1) * 100;
  const tone =
    minutes > PACE_CEILING
      ? "bg-warn"
      : minutes > PACE_TARGET
        ? "bg-caution"
        : "bg-primary";

  return (
    <div
      className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border/60"
      role="img"
      aria-label={`${formatDuration(minutes)} planned`}
    >
      <div
        className={cn("h-full rounded-full transition-[width]", tone)}
        style={{ width: `${fill}%` }}
      />
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground pointer-coarse:h-10 pointer-coarse:w-10 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
    >
      {children}
    </button>
  );
}
