"use client";

import { useTransition } from "react";
import { BedDouble, ChevronDown, Pencil, Plus, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { selectTrip } from "@/app/actions/trips";
import { sleepsOn, staysIn } from "./stays";
import {
  addDays,
  daysBetween,
  eachDay,
  formatLegDates,
  legsIn,
} from "./trip";
import type { Lane, Trip, TripLeg, TripStay } from "./types";

/**
 * The trip, and the shape of it.
 *
 * This replaces two things that were saying the same thing in different
 * places: a row of leg chips used as a date filter, and a band inside the
 * Decided lane drawing those same legs over the columns. Neither of them was
 * the trip — there wasn't one — so the route had to stand in for it twice.
 *
 * Now the trip is the thing, the legs sit inside it, and where you're sleeping
 * comes with them, because "Kyoto, five nights, no bed booked" is one fact and
 * was previously spread across three tabs.
 */
export function TripBar({
  trip,
  trips,
  legs,
  stays,
  activeLegId,
  onLeg,
  onEditTrip,
  onNewTrip,
  onEditLeg,
  onCreateLeg,
}: {
  trip: Trip;
  trips: Trip[];
  legs: TripLeg[];
  stays: TripStay[];
  activeLegId: string | null;
  onLeg: (id: string | null) => void;
  onEditTrip: () => void;
  onNewTrip: () => void;
  onEditLeg: (leg: TripLeg) => void;
  onCreateLeg: (lane: Lane, from: string, to: string) => void;
}) {
  const [, startTransition] = useTransition();
  const route = legsIn(legs, "decided");
  const beds = staysIn(stays, "decided");
  const nights = daysBetween(trip.starts_on, trip.ends_on);

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-4 py-3">
        <h2 className="font-garamond text-2xl text-foreground">
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

        <div className="ml-auto flex items-center gap-1">
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

      {trip.note && (
        <p className="border-b border-border px-4 py-2 font-garamond text-sm leading-snug text-muted-foreground">
          {trip.note}
        </p>
      )}

      <div className="flex flex-wrap items-stretch gap-1.5 p-2">
        <button
          type="button"
          onClick={() => onLeg(null)}
          className={cn(
            "rounded-md px-3 py-2 font-raleway text-[0.65rem] tracking-[0.2em] uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            activeLegId === null
              ? "bg-primary text-primary-foreground"
              : "border border-border text-muted-foreground hover:border-primary hover:text-primary",
          )}
        >
          Whole trip
        </button>

        {stretches(trip, route).map((part) =>
          part.leg ? (
            <LegChip
              key={part.leg.id}
              leg={part.leg}
              beds={beds}
              active={activeLegId === part.leg.id}
              onSelect={() => onLeg(part.leg!.id)}
              onEdit={() => onEditLeg(part.leg!)}
            />
          ) : (
            // Days inside the trip that no leg covers. These could not be drawn
            // at all before: the board's columns were the union of the legs, so
            // "we haven't decided where we are yet" had nowhere to be.
            <button
              key={`gap-${part.from}`}
              type="button"
              onClick={() => onCreateLeg("decided", part.from, part.to)}
              className="flex min-w-[8rem] flex-col justify-center rounded-md border border-dashed border-border px-3 py-2 text-left transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="font-raleway text-[0.65rem] tracking-[0.15em] text-muted-foreground uppercase">
                Nowhere yet
              </span>
              <span className="mt-0.5 font-mono text-[0.6rem] text-muted-foreground tabular-nums slashed-zero">
                {formatLegDates({ starts_on: part.from, ends_on: part.to })}
              </span>
            </button>
          ),
        )}
      </div>
    </section>
  );
}

function LegChip({
  leg,
  beds,
  active,
  onSelect,
  onEdit,
}: {
  leg: TripLeg;
  beds: TripStay[];
  active: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  // Every night of this leg except the last day, which is the day you leave.
  const nights = eachDay(leg.starts_on, addDays(leg.ends_on, -1));
  const covering = beds.filter((s) => nights.some((n) => sleepsOn(s, n)));
  const uncovered = nights.filter((n) => !beds.some((s) => sleepsOn(s, n)));
  const names = [...new Set(covering.map((s) => s.name))];

  return (
    <span
      className={cn(
        "group/leg flex min-w-[10rem] flex-col rounded-md border px-3 py-2 transition-colors",
        active
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50",
      )}
    >
      <span className="flex items-baseline gap-2">
        <button
          type="button"
          onClick={onSelect}
          className="min-w-0 rounded-sm text-left font-garamond text-base leading-tight text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {leg.name}
          {leg.name_ja && (
            <span className="ml-1.5 font-jp text-xs text-muted-foreground">
              {leg.name_ja}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${leg.name}`}
          className="ml-auto rounded-sm text-muted-foreground opacity-0 transition-opacity group-hover/leg:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring pointer-coarse:opacity-100"
        >
          <Pencil className="h-2.5 w-2.5" strokeWidth={2} />
        </button>
      </span>

      <span className="mt-0.5 font-mono text-[0.6rem] text-muted-foreground tabular-nums slashed-zero">
        {formatLegDates(leg)}
      </span>

      {/* Where you're sleeping, next to where you are. It used to live two tabs
          away, which is how a leg ends up with no bed and nobody notices. */}
      {names.length > 0 && (
        <span className="mt-1 flex items-start gap-1 font-mono text-[0.6rem] text-muted-foreground">
          <BedDouble className="mt-px h-2.5 w-2.5 flex-none" strokeWidth={2} />
          <span className="min-w-0">{names.join(" · ")}</span>
        </span>
      )}
      {uncovered.length > 0 && (
        <span className="mt-1 flex items-start gap-1 font-mono text-[0.6rem] text-seal">
          <TriangleAlert className="mt-px h-2.5 w-2.5 flex-none" strokeWidth={2} />
          {uncovered.length} {uncovered.length === 1 ? "night" : "nights"} with
          no bed
        </span>
      )}
    </span>
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

/**
 * The trip read left to right: each leg, and each run of days between them
 * that nothing covers yet.
 */
function stretches(
  trip: Trip,
  route: TripLeg[],
): { leg: TripLeg | null; from: string; to: string }[] {
  const out: { leg: TripLeg | null; from: string; to: string }[] = [];
  let cursor = trip.starts_on;

  for (const leg of route) {
    if (leg.starts_on > cursor) {
      out.push({ leg: null, from: cursor, to: addDays(leg.starts_on, -1) });
    }
    out.push({ leg, from: leg.starts_on, to: leg.ends_on });
    if (leg.ends_on >= cursor) cursor = addDays(leg.ends_on, 1);
  }

  if (cursor <= trip.ends_on) {
    out.push({ leg: null, from: cursor, to: trip.ends_on });
  }
  return out;
}
