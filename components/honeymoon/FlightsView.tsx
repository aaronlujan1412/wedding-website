"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Pencil, Plane, Plus } from "lucide-react";
import { setFlightGate } from "@/app/actions/flights";
import { cn } from "@/lib/utils";
import { HOME_TZ } from "./airports";
import { Checklist } from "./Checklist";
import { CopyCode, Fact, Missing } from "./Facts";
import { FlightDialog, type FlightDraft } from "./FlightDialog";
import {
  JOURNEY_LABELS,
  beAtAirportBy,
  checklistKey,
  checkinOpens,
  countdown,
  formatClockIn,
  formatDateIn,
  formatSpan,
  formatSpokenTime,
  groupJourneys,
  nextFlight,
  statusLink,
  suggestedEssentials,
  zoneName,
  type Journey,
} from "./flights";
import { RateProvider } from "./RateContext";
import { RouteLine } from "./RouteLine";
import { LANES, PLANNERS } from "./trip";
import { useLiveRefresh } from "./useLiveRefresh";
import { useNow } from "./useNow";
import type { ChecklistItem, Rate, TripFlight } from "./types";

const CABIN_LABELS: Record<string, string> = {
  economy: "Economy",
  premium: "Premium economy",
  business: "Business",
  first: "First",
};

/**
 * The Flights tab.
 *
 * Built for two moments. Months out, it's where every flight's details live in
 * one place. On the day, it answers one question first — when do we need to be
 * at the airport — so the next flight takes the top of the page and everything
 * else sits below it.
 */
export function FlightsView({
  flights,
  checklist,
  rate,
  renderedAt,
}: {
  flights: TripFlight[];
  checklist: ChecklistItem[];
  rate: Rate;
  renderedAt: number;
}) {
  const [draft, setDraft] = useState<FlightDraft | null>(null);
  useLiveRefresh(draft !== null);

  const now = useNow(renderedAt);

  const journeys = groupJourneys(flights);
  const next = nextFlight(flights, now);
  const nextJourney = next
    ? journeys.find((j) => j.flights.includes(next))
    : undefined;
  const itemsFor = (journey: Journey) =>
    checklist.filter((item) => journey.lists.includes(item.list));

  return (
    <RateProvider rate={rate}>
      <main className="mx-auto mt-10 max-w-4xl">
        {flights.length === 0 ? (
          <EmptyFlights onAdd={() => setDraft({ flight: null })} />
        ) : (
          <>
            {next && nextJourney ? (
              <NextFlight
                flight={next}
                journey={nextJourney}
                items={itemsFor(nextJourney)}
                now={now}
                onEdit={() => setDraft({ flight: next })}
              />
            ) : (
              <p className="rounded-lg border border-border bg-card px-6 py-10 text-center font-garamond text-2xl text-foreground">
                Every flight has landed. Welcome home.
              </p>
            )}

            <div className="mt-16 flex items-baseline justify-between gap-4 border-b border-border pb-3">
              <h2 className="font-garamond text-3xl text-foreground">
                Every flight
              </h2>
              <button
                type="button"
                onClick={() => setDraft({ flight: null })}
                className="flex items-center gap-1 rounded-sm font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Plus className="h-3 w-3" strokeWidth={2} />
                Add a flight
              </button>
            </div>

            <ol className="mt-6 space-y-12">
              {journeys.map((journey) => (
                <JourneyBlock
                  key={journey.id}
                  journey={journey}
                  items={itemsFor(journey)}
                  isNext={journey === nextJourney}
                  now={now}
                  onEdit={(flight) => setDraft({ flight })}
                />
              ))}
            </ol>
          </>
        )}

        <FlightDialog draft={draft} onClose={() => setDraft(null)} />
      </main>
    </RateProvider>
  );
}

/* ------------------------------------------------------------ next flight -- */

function NextFlight({
  flight,
  journey,
  items,
  now,
  onEdit,
}: {
  flight: TripFlight;
  journey: Journey;
  items: ChecklistItem[];
  now: number;
  onEdit: () => void;
}) {
  const index = journey.flights.indexOf(flight);
  const before = index > 0 ? journey.layovers[index - 1] : null;
  const after = journey.layovers[index] ?? null;
  const airportBy = beAtAirportBy(flight);
  const checkin = checkinOpens(flight);
  const checkinOpen = new Date(checkin).getTime() <= now;

  return (
    <section
      aria-labelledby="next-flight"
      className="rounded-lg border border-border bg-card"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-border px-5 py-3 sm:px-8">
        <p
          id="next-flight"
          className="font-raleway text-[0.65rem] uppercase tracking-[0.25em] text-primary"
        >
          Next flight · {countdown(flight.departs_at, now)}
        </p>
        <p className="font-mono text-[0.65rem] text-muted-foreground tabular-nums slashed-zero">
          {JOURNEY_LABELS[journey.kind]}
          {journey.flights.length > 1 &&
            ` · flight ${index + 1} of ${journey.flights.length}`}
        </p>
      </div>

      <div className="px-5 pt-8 pb-6 sm:px-8">
        <RouteLine flight={flight} />

        <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 font-raleway text-sm text-foreground">
          <Plane
            className="h-4 w-4 text-primary"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <span className="font-semibold">
            {flight.airline} {flight.flight_number}
          </span>
          {flight.cabin && (
            <span className="text-muted-foreground">
              {CABIN_LABELS[flight.cabin]}
            </span>
          )}
          {flight.aircraft && (
            <span className="text-muted-foreground">{flight.aircraft}</span>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="ml-auto flex items-center gap-1 rounded-sm font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Pencil className="h-3 w-3" strokeWidth={1.5} />
            Edit
          </button>
        </p>
      </div>

      {/* The facts you get asked for, in the order you get asked for them. */}
      <dl className="grid gap-px border-y border-border bg-border sm:grid-cols-2">
        <Fact label="Be at the airport by">
          <span className="font-mono text-xl tabular-nums slashed-zero">
            {formatClockIn(airportBy, flight.departs_tz)}
          </span>{" "}
          <span className="font-mono text-xs text-muted-foreground">
            {zoneName(airportBy, flight.departs_tz)} ·{" "}
            {formatDateIn(airportBy, flight.departs_tz)}
          </span>
          <span className="mt-0.5 block font-garamond text-sm text-muted-foreground">
            {countdown(airportBy, now)}
          </span>
        </Fact>

        <Fact label="Online check-in">
          {checkinOpen ? (
            flight.checkin_url ? (
              <a
                href={flight.checkin_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-raleway text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Open now — check in{" "}
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
              </a>
            ) : (
              <span className="font-garamond text-lg">Usually open now</span>
            )
          ) : (
            <>
              <span className="font-mono text-xl tabular-nums slashed-zero">
                {formatClockIn(checkin, flight.departs_tz)}
              </span>{" "}
              <span className="font-mono text-xs text-muted-foreground">
                {formatDateIn(checkin, flight.departs_tz)}
              </span>
              <span className="mt-0.5 block font-garamond text-sm text-muted-foreground">
                usually opens 24h before · {countdown(checkin, now)}
              </span>
            </>
          )}
        </Fact>

        <Fact label="Confirmation">
          {flight.confirmation ? (
            <CopyCode code={flight.confirmation} />
          ) : (
            <Missing onAdd={onEdit}>Add the confirmation code</Missing>
          )}
        </Fact>

        <Fact label="Seats">
          {flight.seat_aaron || flight.seat_savea ? (
            <Seats flight={flight} />
          ) : (
            <Missing onAdd={onEdit}>Add your seats</Missing>
          )}
        </Fact>

        <Fact label="Terminal and gate">
          <GateEditor flight={flight} />
        </Fact>

        <Fact label="When you land">
          <span className="font-garamond text-lg leading-snug">
            It&apos;s {formatSpokenTime(flight.arrives_at, HOME_TZ)}{" "}
            {new Intl.DateTimeFormat("en-US", {
              timeZone: HOME_TZ,
              weekday: "long",
            }).format(new Date(flight.arrives_at))}{" "}
            at home
          </span>
          {flight.arrival_terminal && (
            <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
              Arriving at {flight.arrival_terminal}
            </span>
          )}
        </Fact>

        {(flight.baggage || flight.meal) && (
          <Fact label="Bags and meal" wide>
            <span className="font-garamond text-lg leading-snug">
              {[flight.baggage, flight.meal].filter(Boolean).join(" · ")}
            </span>
          </Fact>
        )}
      </dl>

      {(before || after) && (
        <p className="border-b border-border px-5 py-3 font-garamond text-base text-muted-foreground sm:px-8">
          {before && (
            <>
              After {formatSpan(before.minutes)} in{" "}
              {flight.from_city ?? flight.from_airport}.{" "}
            </>
          )}
          {after && (
            <>
              Then {formatSpan(after.minutes)} in{" "}
              {flight.to_city ?? flight.to_airport}
              {after.changesAirport && ", changing airports"}
              {after.tone === "tight" && " — a tight connection"}.
            </>
          )}
        </p>
      )}

      <div className="flex flex-wrap items-start gap-x-8 gap-y-6 px-5 py-6 sm:px-8">
        <Checklist
          className="min-w-[16rem] flex-1"
          title="Grab before you leave"
          list={checklistKey(journey.flights[0])}
          items={items}
          suggestions={suggestedEssentials(journey)}
        />
        <a
          href={statusLink(flight)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-primary underline-offset-4 hover:underline"
        >
          Flight status <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
        </a>
      </div>
    </section>
  );
}

function Seats({ flight }: { flight: TripFlight }) {
  const seats = [
    { who: "aaron" as const, seat: flight.seat_aaron },
    { who: "savea" as const, seat: flight.seat_savea },
  ].filter((s) => s.seat);

  return (
    <span className="flex flex-wrap gap-x-5 gap-y-1">
      {seats.map(({ who, seat }) => (
        <span key={who} className="flex items-baseline gap-1.5">
          <span
            className="font-raleway text-[0.65rem] font-semibold uppercase tracking-[0.15em]"
            style={{ color: LANES[who].accent }}
          >
            {PLANNERS[who].label}
          </span>
          <span className="font-mono text-xl tabular-nums slashed-zero">
            {seat}
          </span>
        </span>
      ))}
    </span>
  );
}

/**
 * Terminal and gate, editable right on the card — they turn up on a departures
 * screen while you're walking, and nobody wants the whole form for that.
 */
function GateEditor({ flight }: { flight: TripFlight }) {
  const [editing, setEditing] = useState(false);
  const [terminal, setTerminal] = useState(flight.departure_terminal ?? "");
  const [gate, setGate] = useState(flight.departure_gate ?? "");
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setTerminal(flight.departure_terminal ?? "");
          setGate(flight.departure_gate ?? "");
          setEditing(true);
        }}
        className="group flex items-baseline gap-2 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {flight.departure_terminal || flight.departure_gate ? (
          <span className="font-mono text-xl tabular-nums slashed-zero">
            {[
              flight.departure_terminal,
              flight.departure_gate && `Gate ${flight.departure_gate}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        ) : (
          <span className="font-garamond text-lg text-muted-foreground">
            Not posted yet
          </span>
        )}
        <Pencil
          className="h-3 w-3 text-muted-foreground group-hover:text-primary"
          strokeWidth={1.5}
          aria-label="Update terminal and gate"
        />
      </button>
    );
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          await setFlightGate(flight.id, {
            departure_terminal: terminal,
            departure_gate: gate,
          });
          setEditing(false);
        });
      }}
    >
      <input
        value={terminal}
        onChange={(e) => setTerminal(e.target.value)}
        placeholder="Terminal"
        aria-label="Terminal"
        autoFocus
        className="h-8 w-24 rounded-md border border-input bg-background px-2 font-mono text-base sm:text-sm focus-visible:border-ring focus-visible:outline-none"
      />
      <input
        value={gate}
        onChange={(e) => setGate(e.target.value)}
        placeholder="Gate"
        aria-label="Gate"
        className="h-8 w-20 rounded-md border border-input bg-background px-2 font-mono text-base sm:text-sm focus-visible:border-ring focus-visible:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="h-8 rounded-md bg-primary px-3 font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Saving" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
      >
        Cancel
      </button>
    </form>
  );
}

/* ---------------------------------------------------------------- journeys -- */

function JourneyBlock({
  journey,
  items,
  isNext,
  now,
  onEdit,
}: {
  journey: Journey;
  items: ChecklistItem[];
  isNext: boolean;
  now: number;
  onEdit: (flight: TripFlight) => void;
}) {
  const first = journey.flights[0];
  const last = journey.flights.at(-1)!;
  const done = new Date(last.arrives_at).getTime() < now;
  const total =
    (new Date(last.arrives_at).getTime() -
      new Date(first.departs_at).getTime()) /
    60_000;
  const stops = [
    first.from_airport,
    ...journey.flights.map((f) => f.to_airport),
  ];

  return (
    <li className={cn(done && "opacity-60")}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div>
          <p className="font-raleway text-[0.65rem] uppercase tracking-[0.25em] text-primary">
            {JOURNEY_LABELS[journey.kind]}
            {done && " · done"}
          </p>
          <h3 className="mt-1 font-mono text-2xl tracking-tight text-foreground">
            {stops.join(" → ")}
          </h3>
        </div>
        <p className="font-mono text-xs text-muted-foreground tabular-nums slashed-zero">
          {formatDateIn(first.departs_at, first.departs_tz)} ·{" "}
          {journey.flights.length === 1
            ? "nonstop"
            : `${journey.flights.length} flights, ${formatSpan(total)} start to finish`}
        </p>
      </div>

      <ol className="mt-4 rounded-lg border border-border bg-card">
        {journey.flights.map((flight, i) => (
          <li key={flight.id}>
            {i > 0 && (
              <LayoverRow journey={journey} index={i - 1} flight={flight} />
            )}
            <div className="px-5 py-4 sm:px-6">
              <RouteLine flight={flight} size="compact" />
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-raleway text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {flight.airline} {flight.flight_number}
                </span>
                {flight.cabin && <span>{CABIN_LABELS[flight.cabin]}</span>}
                {(flight.seat_aaron || flight.seat_savea) && (
                  <span className="font-mono tabular-nums">
                    {[
                      flight.seat_aaron && `A ${flight.seat_aaron}`,
                      flight.seat_savea && `S ${flight.seat_savea}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
                {flight.confirmation && (
                  <CopyCode code={flight.confirmation} size="sm" />
                )}
                <button
                  type="button"
                  onClick={() => onEdit(flight)}
                  className="ml-auto flex items-center gap-1 rounded-sm uppercase tracking-[0.2em] text-[0.6rem] hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Pencil className="h-3 w-3" strokeWidth={1.5} />
                  Edit
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>

      {isNext ? (
        <p className="mt-3 font-garamond text-sm text-muted-foreground italic">
          This trip&apos;s checklist is with the next flight, up top.
        </p>
      ) : (
        !done && (
          <Checklist
            className="mt-5"
            title="Grab before you leave"
            list={checklistKey(first)}
            items={items}
            suggestions={suggestedEssentials(journey)}
          />
        )
      )}
    </li>
  );
}

function LayoverRow({
  journey,
  index,
  flight,
}: {
  journey: Journey;
  index: number;
  flight: TripFlight;
}) {
  const layover = journey.layovers[index];
  const landedAt = journey.flights[index];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-dashed border-border px-5 py-2.5 font-garamond text-base sm:px-6",
        layover.tone === "tight"
          ? "bg-kind-food/5 text-kind-food"
          : "bg-background text-muted-foreground",
      )}
    >
      <span className="font-mono text-sm tabular-nums slashed-zero">
        {formatSpan(layover.minutes)}
      </span>
      <span>in {landedAt.to_city ?? landedAt.to_airport}</span>
      {layover.changesAirport && (
        <span>
          · changing airports, {landedAt.to_airport} → {flight.from_airport}
        </span>
      )}
      {layover.tone === "tight" && (
        <span className="font-raleway text-[0.6rem] font-semibold uppercase tracking-[0.2em]">
          Tight connection
        </span>
      )}
      {layover.tone === "long" && (
        <span className="font-raleway text-[0.6rem] uppercase tracking-[0.2em]">
          Long layover
        </span>
      )}
    </div>
  );
}

function EmptyFlights({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-8 py-20 text-center">
      <Plane
        className="mx-auto h-8 w-8 text-primary"
        strokeWidth={1.25}
        aria-hidden="true"
      />
      <h2 className="mt-4 font-garamond text-3xl text-foreground">
        No flights yet
      </h2>
      <p className="mx-auto mt-2 max-w-md font-garamond text-lg leading-relaxed text-muted-foreground">
        Add each flight from your confirmation email, connections included. They
        group themselves into the trip there and the trip home.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 font-raleway text-[0.7rem] uppercase tracking-[0.2em] text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        Add the first flight
      </button>
    </div>
  );
}
