"use client";

import { useState, useTransition } from "react";
import { BedDouble, ExternalLink, Send, TriangleAlert, UtensilsCrossed } from "lucide-react";
import { sendRouteToLane, sendStayToLane } from "@/app/actions/finder";
import { cn } from "@/lib/utils";
import { formatNights, formatStayDates } from "./stays";
import { LANES, PLANNERS, formatYen, yenAsUsd } from "./trip";
import { useLiveRefresh } from "./useLiveRefresh";
import type { Lane, Planner, ProposedRoute, Rate, StayProposal, TripStay } from "./types";

/**
 * Routes the lodging finder has worked out, and the one button that matters:
 * send one to a planner's lane.
 *
 * Nothing on this page is part of the plan. The finder re-publishes every
 * morning and replaces whatever it said yesterday, so a route here is an
 * argument, not a commitment — sending one makes ordinary suggestions in a
 * lane, which still have to be adopted from Lodging like anything else.
 */

/** Lanes a proposal can be sent to: somebody's, never Decided. */
const TARGET_LANES = (Object.keys(LANES) as Lane[]).filter((lane) => lane !== "decided");

function mealLabel(stay: StayProposal): string | null {
  if (stay.breakfast && stay.dinner) return "dinner + breakfast";
  if (stay.breakfast) return "breakfast";
  if (stay.dinner) return "dinner";
  return null;
}

export function FinderView({
  routes,
  decided,
  rate,
}: {
  routes: ProposedRoute[];
  decided: TripStay[];
  rate: Rate;
}) {
  const [busy, startTransition] = useTransition();
  const [sent, setSent] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  useLiveRefresh(busy);

  const send = (run: () => Promise<{ error: string | null }>, note: string) => {
    setProblem(null);
    startTransition(async () => {
      const { error } = await run();
      if (error) setProblem(error);
      else setSent(note);
    });
  };

  if (routes.length === 0) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <h2 className="font-garamond text-2xl">Lodging finder</h2>
        <p className="mt-4 max-w-prose text-sm text-muted-foreground">
          Nothing published yet. The finder sweeps every candidate place for every night of
          the trip and works out which whole-trip routes are actually bookable — one hotel
          held across each run of nights. When it has published, its routes appear here.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <h2 className="font-garamond text-2xl">Lodging finder</h2>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">
        Whole-trip routes, cheapest first. Each stay is one hotel open for every night of its
        block. Sending a route puts its stays in a lane as suggestions — nothing is decided
        until you adopt them from Lodging.
      </p>

      {problem && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-md border border-warn/40 bg-warn/5 px-3 py-2 text-sm text-warn"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {problem}
        </p>
      )}
      {sent && !problem && (
        <p className="mt-4 rounded-md border border-border bg-card px-3 py-2 text-sm">
          {sent} — they&rsquo;re in the lane now, waiting to be adopted from{" "}
          <a className="underline" href="/honeymoon/lodging">
            Lodging
          </a>
          .
        </p>
      )}

      <ol className="mt-6 space-y-6">
        {routes.map((route, index) => (
          <RouteCard
            key={route.id}
            route={route}
            rank={index + 1}
            decided={decided}
            rate={rate}
            busy={busy}
            onSendRoute={(lane, planner) =>
              send(
                () => sendRouteToLane(route.id, lane, planner),
                `Sent ${route.stays.length} stays to ${PLANNERS[planner].label}'s lane`,
              )
            }
            onSendStay={(stay, lane, planner) =>
              send(
                () => sendStayToLane(stay.id, lane, planner),
                `Sent ${stay.name} to ${PLANNERS[planner].label}'s lane`,
              )
            }
          />
        ))}
      </ol>

      <p className="mt-8 max-w-prose text-xs text-muted-foreground">
        Prices are each night&rsquo;s cheapest plan at that hotel, added up. Rakuten prices only
        the first night of a multi-night search, so a real quote will differ — these compare
        routes, they don&rsquo;t book them. Travel is straight-line distance at a rough rail rate
        for two, enough to keep a route from crossing the country twice.
      </p>
    </main>
  );
}

function RouteCard({
  route,
  rank,
  decided,
  rate,
  busy,
  onSendRoute,
  onSendStay,
}: {
  route: ProposedRoute;
  rank: number;
  decided: TripStay[];
  rate: Rate;
  busy: boolean;
  onSendRoute: (lane: Lane, planner: Planner) => void;
  onSendStay: (stay: StayProposal, lane: Lane, planner: Planner) => void;
}) {
  const total = route.lodging_yen + route.travel_yen;

  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-garamond text-lg">
          <span className="text-muted-foreground">{rank}.</span>{" "}
          {route.label ?? route.stays.map((s) => s.place_name).join(" → ")}
        </h3>
        <p className="text-sm">
          <span className="font-medium">{yenAsUsd(total, rate)}</span>{" "}
          <span className="text-muted-foreground">
            ({formatYen(route.lodging_yen)} beds
            {route.travel_yen > 0 && <> + {formatYen(route.travel_yen)} travel</>})
          </span>
        </p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {formatNights(route.nights)} · {route.stays.length} stays ·{" "}
        {route.moves} {route.moves === 1 ? "move" : "moves"}
        {route.travel_km > 0 && <> · {route.travel_km.toLocaleString("en-US")} km</>}
      </p>

      <ul className="mt-3 divide-y divide-border/60">
        {route.stays.map((stay) => {
          // A night already settled in Decided is worth knowing about before
          // sending an alternative for it.
          const clashes = decided.filter(
            (d) => d.check_in_on < stay.check_out_on && d.check_out_on > stay.check_in_on,
          );
          const meals = mealLabel(stay);
          return (
            <li key={stay.id} className="py-2">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span className="text-sm font-medium">{formatStayDates(stay)}</span>
                <span className="text-sm text-muted-foreground">{stay.place_name}</span>
                {stay.cost_yen !== null && (
                  <span className="ml-auto text-sm">
                    {formatYen(stay.cost_yen)}
                    {stay.per_night_yen !== null && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {formatYen(stay.per_night_yen)}/night
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-jp">{stay.name}</span>
                {meals && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <UtensilsCrossed className="size-3" aria-hidden />
                    {meals}
                  </span>
                )}
                {stay.url && (
                  <a
                    href={stay.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs underline"
                  >
                    Plans <ExternalLink className="size-3" aria-hidden />
                  </a>
                )}
                <SendMenu
                  busy={busy}
                  label="Send this stay"
                  onPick={(lane, planner) => onSendStay(stay, lane, planner)}
                />
              </div>
              {clashes.length > 0 && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <BedDouble className="size-3 shrink-0" aria-hidden />
                  Decided already has {clashes.map((c) => c.name).join(", ")} on these nights.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
        <SendMenu
          busy={busy}
          label="Send the whole route"
          primary
          onPick={(lane, planner) => onSendRoute(lane, planner)}
        />
      </div>
    </li>
  );
}

/** One button per lane: whose idea it becomes is the only choice to make. */
function SendMenu({
  busy,
  label,
  primary = false,
  onPick,
}: {
  busy: boolean;
  label: string;
  primary?: boolean;
  onPick: (lane: Lane, planner: Planner) => void;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className={cn("text-xs", primary ? "text-foreground" : "text-muted-foreground")}>
        {label} to
      </span>
      {TARGET_LANES.map((lane) => {
        const planner = LANES[lane].planner;
        if (!planner) return null;
        return (
          <button
            key={lane}
            type="button"
            disabled={busy}
            onClick={() => onPick(lane, planner)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs",
              "pointer-coarse:px-3 pointer-coarse:py-2",
              "disabled:opacity-50",
              primary ? "border-border bg-background" : "border-transparent hover:border-border",
            )}
          >
            <Send className="size-3" aria-hidden />
            {PLANNERS[planner].label}
          </button>
        );
      })}
    </span>
  );
}
