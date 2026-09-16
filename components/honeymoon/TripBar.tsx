"use client";

import { useTransition } from "react";
import { ChevronDown, Pencil, Plus, X } from "lucide-react";
import { selectTrip } from "@/app/actions/trips";
import { RouteStrip } from "./RouteStrip";
import { TripSummary } from "./TripSummary";
import { daysBetween, formatLegDates } from "./trip";
import type { Lane, Trip, TripItem, TripLeg, TripStay } from "./types";

/**
 * The trip, and the shape of it.
 *
 * One line says what the trip is and how far from planned it is; the strip
 * underneath is the route across every day of it. Nothing above the board says
 * either of those things a second time.
 */
export function TripBar({
  trip,
  trips,
  days,
  legs,
  stays,
  items,
  laneItems,
  spend,
  activeLegId,
  onLeg,
  onEditTrip,
  onNewTrip,
  onEditLeg,
  onCreateLeg,
  onDay,
  onScreen,
  today,
}: {
  trip: Trip;
  trips: Trip[];
  days: string[];
  legs: TripLeg[];
  stays: TripStay[];
  /** Every item, so the summary can count Decided's open days. */
  items: TripItem[];
  /** The viewed lane's cards, for the strip's per-day marks. */
  laneItems: TripItem[];
  spend: number;
  activeLegId: string | null;
  onLeg: (id: string | null) => void;
  onEditTrip: () => void;
  onNewTrip: () => void;
  onEditLeg: (leg: TripLeg) => void;
  onCreateLeg: (lane: Lane, from: string, to: string) => void;
  onDay: (date: string) => void;
  onScreen: { first: number; last: number } | null;
  today: string;
}) {
  const [, startTransition] = useTransition();
  const nights = daysBetween(trip.starts_on, trip.ends_on);
  const scoped = legs.find((l) => l.id === activeLegId) ?? null;

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 pt-3">
        <h2 className="font-garamond text-2xl leading-none text-foreground">
          {trip.name}
          {trip.name_ja && (
            <span className="ml-2 font-jp text-base text-muted-foreground">
              {trip.name_ja}
            </span>
          )}
        </h2>
        <p className="font-mono text-[0.7rem] tracking-wide text-muted-foreground tabular-nums slashed-zero">
          {formatLegDates(trip)} · {nights} {nights === 1 ? "night" : "nights"}
        </p>

        {/* The strip scopes the board to a leg. Say so up here, with the way
            back, because a board missing twenty days otherwise just looks
            short. */}
        {scoped && (
          <button
            type="button"
            onClick={() => onLeg(null)}
            className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 font-raleway text-[0.65rem] text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Only {scoped.name}, {formatLegDates(scoped)}
            <X className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
            <span className="sr-only">— show the whole trip</span>
          </button>
        )}

        <div className="ml-auto flex items-center gap-4">
          <TripSummary days={days} items={items} spend={spend} />

          <div className="flex items-center gap-1">
            {trips.length > 1 && (
              <label className="relative flex items-center">
                <span className="sr-only">Which trip</span>
                <select
                  value={trip.id}
                  onChange={(e) =>
                    startTransition(async () => {
                      await selectTrip(e.target.value);
                    })
                  }
                  className="appearance-none rounded-sm border border-border bg-background py-1 pr-6 pl-2 font-raleway text-[0.65rem] tracking-[0.15em] text-muted-foreground uppercase focus-visible:border-ring focus-visible:outline-none"
                >
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-1.5 h-3 w-3 text-muted-foreground"
                  strokeWidth={2}
                />
              </label>
            )}
            <BarButton label="Edit this trip" onClick={onEditTrip}>
              <Pencil className="h-3 w-3" strokeWidth={2} />
            </BarButton>
            <BarButton label="Make a new trip" onClick={onNewTrip}>
              <Plus className="h-3 w-3" strokeWidth={2} />
            </BarButton>
          </div>
        </div>
      </div>

      {trip.note && (
        <p className="px-4 pt-1 font-garamond text-sm leading-snug text-muted-foreground">
          {trip.note}
        </p>
      )}

      <RouteStrip
        days={days}
        legs={legs}
        stays={stays}
        items={laneItems}
        activeLegId={activeLegId}
        onLeg={onLeg}
        onEditLeg={onEditLeg}
        onCreateLeg={onCreateLeg}
        onDay={onDay}
        onScreen={onScreen}
        today={today}
      />
    </section>
  );
}

function BarButton({
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
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring pointer-coarse:h-9 pointer-coarse:w-9"
    >
      {children}
    </button>
  );
}
