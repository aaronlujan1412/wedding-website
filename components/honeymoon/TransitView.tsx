"use client";

import { useState, useTransition } from "react";
import {
  ArrowRight,
  ArrowUp,
  ExternalLink,
  Plus,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { adoptTransit } from "@/app/actions/transit";
import { Checklist } from "./Checklist";
import { RateProvider } from "./RateContext";
import { TransitDialog, type TransitDraft } from "./TransitDialog";
import { useLiveRefresh } from "./useLiveRefresh";
import {
  MODES,
  arrivesClock,
  departsClock,
  departsOn,
  groupTransit,
  journeyMinutes,
  payableRides,
  rideMinutes,
  rideWarnings,
  routeHops,
  transitIn,
  type Hop,
  type TransitJourney,
} from "./transit";
import {
  LANES,
  LANE_ORDER,
  PLANNERS,
  formatCost,
  formatDayLong,
  formatDuration,
  formatYen,
  legsIn,
  parseDay,
  sumYen,
} from "./trip";
import type { ChecklistItem, Lane, Rate, TripLeg, TripTransit } from "./types";

export function TransitView({
  transit,
  legs,
  checklist,
  rate,
}: {
  transit: TripTransit[];
  legs: TripLeg[];
  checklist: ChecklistItem[];
  rate: Rate;
}) {
  const [draft, setDraft] = useState<TransitDraft | null>(null);
  const [, startTransition] = useTransition();
  useLiveRefresh(draft !== null);

  const decided = transitIn(transit, "decided");
  const hops = routeHops(legsIn(legs, "decided"), transit);
  const missing = hops.filter((h) => !h.covered);
  const spend = sumYen(payableRides(decided), rate);

  function adopt(ride: TripTransit) {
    startTransition(() => {
      void adoptTransit(ride.id);
    });
  }

  return (
    <RateProvider rate={rate}>
      <main className="mx-auto mt-10 max-w-4xl">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-border pb-3">
          <h2 className="font-garamond text-3xl text-foreground">
            Getting around
          </h2>
          <p className="font-mono text-[0.7rem] tracking-wide text-muted-foreground tabular-nums slashed-zero">
            {decided.length} {decided.length === 1 ? "ride" : "rides"}
            {spend > 0 && <> · {formatYen(spend)}</>}
            {decided.some((r) => r.covered_by_pass) && (
              <>
                {" "}
                · {decided.filter((r) => r.covered_by_pass).length} on the pass
              </>
            )}
          </p>
        </div>

        {/* The tab's one loud element, and the same idea as a night with no
            bed over on Lodging: the agreed route says you move that day and
            nothing on the board carries you. */}
        {hops.length > 0 && (
          <RouteHops
            hops={hops}
            onAdd={(on) =>
              setDraft({ ride: null, lane: "decided", onDate: on })
            }
          />
        )}

        <div className="mt-14 flex items-baseline justify-between gap-4 border-b border-border pb-3">
          <h3 className="font-garamond text-2xl text-foreground">
            {missing.length > 0 ? "What's booked" : "Every ride"}
          </h3>
          <button
            type="button"
            onClick={() => setDraft({ ride: null, lane: "decided" })}
            className="flex items-center gap-1 rounded-sm font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Plus className="h-3 w-3" strokeWidth={2} />
            Add a ride
          </button>
        </div>

        {decided.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-border px-6 py-10 text-center font-garamond text-lg text-muted-foreground">
            Nothing booked yet. Add the first train and it&apos;ll show up on
            the board and the pocket print.
          </p>
        ) : (
          <ol className="mt-8 space-y-10">
            {groupTransit(decided).map((journey) => (
              <JourneyBlock
                key={journey.id}
                journey={journey}
                checklist={checklist}
                onEdit={(ride) => setDraft({ ride, lane: ride.lane })}
              />
            ))}
          </ol>
        )}

        {LANE_ORDER.filter((l) => l !== "decided").map((lane) => (
          <Suggestions
            key={lane}
            lane={lane}
            rides={transitIn(transit, lane)}
            checklist={checklist}
            onEdit={(ride) => setDraft({ ride, lane })}
            onAdd={() => setDraft({ ride: null, lane })}
            onAdopt={adopt}
          />
        ))}

        <TransitDialog
          draft={draft}
          onClose={() => setDraft(null)}
          onAdopt={adopt}
        />
      </main>
    </RateProvider>
  );
}

/* ------------------------------------------------------------ route hops -- */

function RouteHops({
  hops,
  onAdd,
}: {
  hops: Hop[];
  onAdd: (on: string) => void;
}) {
  return (
    <section className="mt-8">
      <ol className="space-y-2">
        {hops.map((hop) => (
          <li
            key={`${hop.on}-${hop.to}`}
            className={cn(
              "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-4 py-3",
              hop.covered
                ? "border-border bg-card"
                : "border-seal/40 bg-seal/[0.04]",
            )}
          >
            <span className="font-mono text-[0.7rem] tracking-wide text-muted-foreground tabular-nums slashed-zero">
              {parseDay(hop.on).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>

            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 font-garamond text-lg text-foreground">
              {hop.from}
              <ArrowRight
                className="h-3.5 w-3.5 flex-none text-muted-foreground"
                strokeWidth={1.5}
              />
              {hop.to}
            </span>

            {hop.covered ? (
              <span className="font-mono text-[0.65rem] tracking-wide text-muted-foreground">
                booked
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onAdd(hop.on)}
                className="flex items-center gap-1 rounded-sm font-mono text-[0.65rem] tracking-wide text-seal underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <TriangleAlert className="h-3 w-3" strokeWidth={2} />
                nothing booked
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* --------------------------------------------------------------- a ride -- */

function JourneyBlock({
  journey,
  checklist,
  onEdit,
  onAdopt,
}: {
  journey: TransitJourney;
  checklist: ChecklistItem[];
  onEdit: (ride: TripTransit) => void;
  onAdopt?: (ride: TripTransit) => void;
}) {
  const first = journey.rides[0];
  const lists = journey.rides.map((r) => `transit:${r.id}`);
  const items = checklist.filter((i) => lists.includes(i.list));

  return (
    <li>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="font-garamond text-2xl text-foreground">
          {journey.from}
          <span className="mx-2 text-muted-foreground">→</span>
          {journey.to}
        </h4>
        <p className="font-mono text-[0.7rem] tracking-wide text-muted-foreground tabular-nums slashed-zero">
          {formatDayLong(departsOn(first))} ·{" "}
          {formatDuration(journeyMinutes(journey))}
          {journey.rides.length > 1 && (
            <>
              {" "}
              · {journey.rides.length - 1}{" "}
              {journey.rides.length === 2 ? "change" : "changes"}
            </>
          )}
        </p>
      </div>

      <ol className="mt-4 space-y-3">
        {journey.rides.map((ride, i) => (
          <li key={ride.id}>
            <RideCard ride={ride} onEdit={onEdit} onAdopt={onAdopt} />
            {journey.changes[i] && (
              <p className="mt-2 ml-4 flex items-center gap-2 border-l border-dashed border-border pl-4 font-mono text-[0.65rem] tracking-wide text-muted-foreground tabular-nums slashed-zero">
                {formatDuration(journey.changes[i].minutes)} to change
                {journey.changes[i].tone === "tight" && (
                  <span className="text-warn">that&apos;s tight</span>
                )}
                {journey.changes[i].changesStation && (
                  <span>different station</span>
                )}
              </p>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-4">
        <Checklist
          title="Before this one"
          list={lists[0]}
          items={items}
          suggestions={[
            "Collect the reserved seat tickets",
            "Forward the big bags",
            "Buy a bento",
          ]}
        />
      </div>
    </li>
  );
}

function RideCard({
  ride,
  onEdit,
  onAdopt,
}: {
  ride: TripTransit;
  onEdit: (ride: TripTransit) => void;
  onAdopt?: (ride: TripTransit) => void;
}) {
  const mode = MODES[ride.mode];
  const warnings = rideWarnings(ride);
  const planner = PLANNERS[ride.added_by];

  return (
    <article className="rounded-md border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 font-mono text-[0.65rem] tracking-wider text-muted-foreground tabular-nums slashed-zero">
            <span aria-hidden="true">{mode.glyph}</span>
            <span>{ride.service || mode.label}</span>
            {ride.operator && <span>{ride.operator}</span>}
            {ride.covered_by_pass && (
              <span className="text-primary">on the pass</span>
            )}
          </p>

          <button
            type="button"
            onClick={() => onEdit(ride)}
            className="mt-1 block rounded-sm text-left font-raleway text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="font-mono tabular-nums slashed-zero">
              {departsClock(ride)}
            </span>{" "}
            {ride.from_place}
            <span className="mx-2 text-muted-foreground">→</span>
            <span className="font-mono tabular-nums slashed-zero">
              {arrivesClock(ride)}
            </span>{" "}
            {ride.to_place}
          </button>

          {(ride.from_place_ja || ride.to_place_ja) && (
            <p className="font-jp text-xs text-muted-foreground">
              {ride.from_place_ja}
              {ride.from_place_ja && ride.to_place_ja && " → "}
              {ride.to_place_ja}
            </p>
          )}
        </div>

        <div className="text-right font-mono text-[0.65rem] tracking-wide text-muted-foreground tabular-nums slashed-zero">
          <p>{formatDuration(rideMinutes(ride))}</p>
          {!ride.covered_by_pass && ride.cost_amount !== null && (
            <p>{formatCost(ride)}</p>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.6rem] tracking-wide text-muted-foreground tabular-nums slashed-zero">
        <span
          title={`Added by ${planner.label}`}
          className="flex h-4 w-4 items-center justify-center rounded-full border border-border text-[0.55rem]"
        >
          {planner.initial}
        </span>
        {ride.departs_platform && <span>Plat. {ride.departs_platform}</span>}
        {ride.car && <span>Car {ride.car}</span>}
        {ride.seat_aaron && <span>A {ride.seat_aaron}</span>}
        {ride.seat_savea && <span>S {ride.seat_savea}</span>}
        {ride.confirmation && <span>#{ride.confirmation}</span>}
        {ride.booking_url && (
          <a
            href={ride.booking_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-primary underline-offset-4 hover:underline"
          >
            Booking
            <ExternalLink className="h-2.5 w-2.5" strokeWidth={1.5} />
          </a>
        )}
        {onAdopt && ride.lane !== "decided" && (
          <button
            type="button"
            onClick={() => onAdopt(ride)}
            className="flex items-center gap-1 rounded-sm text-primary underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ArrowUp className="h-2.5 w-2.5" strokeWidth={2} />
            Use this one
          </button>
        )}
      </div>

      {ride.notes && (
        <p className="mt-2 font-garamond text-sm leading-snug text-foreground/90">
          {ride.notes}
        </p>
      )}

      {warnings.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {warnings.map((w) => (
            <li
              key={w.text}
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
    </article>
  );
}

/* ---------------------------------------------------------- suggestions -- */

function Suggestions({
  lane,
  rides,
  checklist,
  onEdit,
  onAdd,
  onAdopt,
}: {
  lane: Lane;
  rides: TripTransit[];
  checklist: ChecklistItem[];
  onEdit: (ride: TripTransit) => void;
  onAdd: () => void;
  onAdopt: (ride: TripTransit) => void;
}) {
  const meta = LANES[lane];

  return (
    <section className="mt-14">
      <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
        <h3
          className="font-raleway text-[0.7rem] uppercase tracking-[0.25em]"
          style={{ color: meta.accent }}
        >
          {meta.label}
        </h3>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 rounded-sm font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Plus className="h-3 w-3" strokeWidth={2} />
          Suggest one
        </button>
      </div>

      {rides.length === 0 ? (
        <p className="mt-4 font-garamond text-base italic text-muted-foreground">
          Nothing suggested. This is where the night bus argument goes.
        </p>
      ) : (
        <ol className="mt-5 space-y-8">
          {groupTransit(rides).map((journey) => (
            <JourneyBlock
              key={journey.id}
              journey={journey}
              checklist={checklist}
              onEdit={onEdit}
              onAdopt={onAdopt}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
