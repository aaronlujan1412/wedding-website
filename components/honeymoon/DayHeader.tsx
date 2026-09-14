"use client";

import Link from "next/link";
import {
  ArrowDownWideNarrow,
  NotebookPen,
  Plane,
  TriangleAlert,
} from "lucide-react";
import { flightsOnDay, formatClockIn } from "./flights";
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
 * Every number here is read off the `decided` lane only. The draft lanes are
 * arguments in progress — costing or pace-checking a proposal nobody has agreed
 * to would just train you to ignore the warnings.
 */
export function DayHeader({
  date,
  note,
  legs,
  decided,
  isToday,
  onEditNote,
  onSortByTime,
  flights = [],
  style,
}: {
  style?: React.CSSProperties;
  /** Flights leaving or landing on this date, from `flightsOnDay`. */
  flights?: ReturnType<typeof flightsOnDay>;
  date: string;
  note?: TripDay;
  legs: TripLeg[];
  decided: TripItem[];
  isToday: boolean;
  onEditNote: (date: string) => void;
  onSortByTime: (date: string) => void;
}) {
  const rate = useRate();
  // The header names where the agreed route has you. Drafts show in their own
  // lane's leg band, not here.
  const leg = legForDay(legsIn(legs, "decided"), date);
  const warnings = dayWarnings(date, decided);
  const pace = paceMinutes(decided);
  const spend = sumYen(decided, rate);
  const cash = cashYen(decided, rate);

  const day = parseDay(date);

  return (
    <div
      style={style}
      className={cn(
        "sticky top-0 z-30 border-r border-b border-border bg-background px-3 py-2.5",
        isToday && "bg-secondary",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-mono text-xs tracking-wider text-foreground tabular-nums slashed-zero">
          <span className="uppercase text-muted-foreground">
            {day.toLocaleDateString("en-US", { weekday: "short" })}
          </span>{" "}
          {day.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
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

      <p className="mt-0.5 truncate font-garamond text-lg leading-tight text-foreground">
        {note?.title || leg?.name || "No agreed leg yet"}
        {leg?.name_ja && (
          <span className="ml-1.5 font-jp text-xs text-muted-foreground">
            {leg.name_ja}
          </span>
        )}
      </p>

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
          {decided.length === 0 ? "nothing decided" : formatDuration(pace)}
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
                w.tone === "warn" ? "text-kind-food" : "text-muted-foreground",
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
      ? "bg-kind-food"
      : minutes > PACE_TARGET
        ? "bg-kind-workshop"
        : "bg-primary";

  return (
    <div
      className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border/60"
      role="img"
      aria-label={`${formatDuration(minutes)} decided`}
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
      className="flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
    >
      {children}
    </button>
  );
}
