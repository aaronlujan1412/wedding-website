import { airport } from "./airports";
import {
  checkinOpens,
  flightsOnDay,
  groupJourneys,
  utcToZoned,
  zonedToUtc,
} from "./flights";
import {
  STAY_TZ,
  USUAL_CHECK_OUT,
  deskCashYen,
  sleepsOn,
  stayChecklistKey,
  staysIn,
  tripNights,
} from "./stays";
import {
  arrivesOn,
  departsOn,
  isPayable,
  routeHops,
  transitIn,
  transitOnDay,
} from "./transit";
import {
  addDays,
  cashYen,
  compare,
  decidedOn,
  eachDay,
  isBlockout,
  legForDay,
  legsIn,
  sumYen,
  tripDays,
} from "./trip";
import type {
  ChecklistItem,
  TripBoard,
  TripDay,
  TripDoc,
  TripFlight,
  TripItem,
  TripLeg,
  TripStay,
  TripTransit,
} from "./types";

/**
 * The Itinerary, minus the drawing: every day of the trip as one list of what
 * happens, in order, from every tab that knows something about it.
 *
 * It replaced two pages that each drew the same days from half the facts. The
 * Itinerary read cards and rides; Pocket added the bed and the cash. Neither
 * read flights, so on arrival day both printed a "travelling" card typed on
 * the Board as if it were the flight, and the flight itself — the one fact
 * with a confirmation number — was on neither.
 */

/** Something on the day's timeline. `at` is an instant, so clocks can mix. */
export type Entry =
  | { kind: "item"; key: string; at: number | null; item: TripItem }
  | {
      kind: "flight";
      key: string;
      at: number;
      flight: TripFlight;
      leaves: boolean;
      lands: boolean;
      /** The first flight of its journey, leaving today: when to be there. */
      startsJourney: boolean;
      /** Off when the flight before it today had the same booking. */
      showConfirmation: boolean;
    }
  | {
      kind: "ride";
      key: string;
      at: number;
      ride: TripTransit;
      leaves: boolean;
      lands: boolean;
    }
  | { kind: "doc"; key: string; at: number; doc: TripDoc }
  | { kind: "checkin"; key: string; at: number; flight: TripFlight }
  | {
      kind: "gap";
      key: string;
      at: number | null;
      from: string;
      to: string;
    };

export type DayChecklist = { key: string; title: string; items: ChecklistItem[] };

export type PlanDay = {
  date: string;
  /** The agreed route's leg, and whether today is where it starts. */
  leg: TripLeg | null;
  startsLeg: boolean;
  note: TripDay | null;
  /** Where tonight is spent. */
  bed: TripStay | null;
  onPlane: boolean;
  /** Inside the agreed trip, no stay and no flight: nowhere to sleep yet. */
  needsBed: boolean;
  checkIn: TripStay | null;
  checkOut: TripStay | null;
  cash: number;
  entries: Entry[];
  checklists: DayChecklist[];
  warnings: string[];
  /** At least one agreed card: what "days with a plan" counts. */
  planned: boolean;
};

export type Input = Pick<
  TripBoard,
  "trip" | "legs" | "days" | "items" | "docs" | "flights" | "stays" | "transit" | "rate"
> & { checklist: ChecklistItem[] };

/** The trip's own dates, falling back to the route's, as the Board does. */
export function itineraryDates(input: Pick<Input, "trip" | "legs">): string[] {
  return input.trip
    ? eachDay(input.trip.starts_on, input.trip.ends_on)
    : tripDays(legsIn(input.legs, "decided"));
}

export function planDays(input: Input): PlanDay[] {
  const legs = legsIn(input.legs, "decided");
  const stays = staysIn(input.stays, "decided");
  const rides = transitIn(input.transit, "decided");
  const nights = new Map(
    tripNights(input.legs, input.stays, input.flights).map((n) => [n.date, n]),
  );
  const journeys = groupJourneys(input.flights);
  const hops = routeHops(legs, input.transit);
  const dates = itineraryDates(input);

  return dates.map((date, index) => {
    const leg = legForDay(legs, date) ?? null;
    const previous = index > 0 ? legForDay(legs, dates[index - 1]) : undefined;
    const night = nights.get(date);
    const items = decidedOn(input.items, date);
    const checkIn = stays.find((s) => s.check_in_on === date) ?? null;
    const checkOut = stays.find((s) => s.check_out_on === date) ?? null;
    const bed = stays.find((s) => sleepsOn(s, date)) ?? null;

    const anchors: Entry[] = [];

    const flights = flightsOnDay(input.flights, date).sort(
      (a, b) => atOf(a) - atOf(b) || compare(a.flight.id, b.flight.id),
    );
    let lastConfirmation: string | null = null;
    for (const { flight, leaves, lands } of flights) {
      const journey = journeys.find((j) => j.flights.includes(flight));
      anchors.push({
        kind: "flight",
        key: `flight-${flight.id}`,
        at: Date.parse(leaves ? flight.departs_at : flight.arrives_at),
        flight,
        leaves,
        lands,
        startsJourney: leaves && journey?.flights[0] === flight,
        showConfirmation:
          !!flight.confirmation && flight.confirmation !== lastConfirmation,
      });
      lastConfirmation = flight.confirmation ?? lastConfirmation;
    }

    // Online check-in opens a day ahead, which is a day of its own on paper.
    for (const journey of journeys) {
      const first = journey.flights[0];
      const opens = checkinOpens(first);
      if (utcToZoned(opens, first.departs_tz).date !== date) continue;
      anchors.push({
        kind: "checkin",
        key: `checkin-${first.id}`,
        at: Date.parse(opens),
        flight: first,
      });
    }

    for (const { ride, leaves, lands } of transitOnDay(rides, date)) {
      anchors.push({
        kind: "ride",
        key: `ride-${ride.id}`,
        at: Date.parse(leaves ? ride.departs_at : ride.arrives_at),
        ride,
        leaves,
        lands,
      });
    }

    for (const doc of input.docs) {
      if (doc.starts_at?.slice(0, 10) !== date) continue;
      anchors.push({
        kind: "doc",
        key: `doc-${doc.id}`,
        // Papers are typed as the wall clock where they happen: in Japan.
        at: Date.parse(zonedToUtc(date, doc.starts_at.slice(11, 16), STAY_TZ)),
        doc,
      });
    }

    anchors.push(...transfers(date, journeys, stays, rides, legs));

    // The route moves today and nothing is booked to move it. Placed at
    // check-out when there is one, since that's when the moving starts.
    for (const hop of hops) {
      if (hop.on !== date || hop.covered) continue;
      anchors.push({
        kind: "gap",
        key: `hop-${date}`,
        at: checkOut
          ? Date.parse(
              zonedToUtc(
                date,
                (checkOut.check_out_time ?? USUAL_CHECK_OUT).slice(0, 5),
                STAY_TZ,
              ),
            )
          : null,
        from: hop.from,
        to: hop.to,
      });
    }

    const entries = splice(
      items.map((item) => ({
        kind: "item" as const,
        key: `item-${item.id}`,
        at: item.start_time
          ? Date.parse(zonedToUtc(date, item.start_time.slice(0, 5), STAY_TZ))
          : null,
        item,
      })),
      anchors,
    );

    const checklists: DayChecklist[] = [];
    for (const journey of journeys) {
      const first = journey.flights[0];
      if (utcToZoned(first.departs_at, first.departs_tz).date !== date) continue;
      const list = input.checklist.filter((c) => journey.lists.includes(c.list));
      if (list.length) {
        checklists.push({
          key: `journey-${journey.id}`,
          title: "Grab before you leave",
          items: list,
        });
      }
    }
    if (checkIn) {
      const list = input.checklist.filter(
        (c) => c.list === stayChecklistKey(checkIn),
      );
      if (list.length) {
        checklists.push({
          key: `stay-${checkIn.id}`,
          title: `Before you check in at ${checkIn.name}`,
          items: list,
        });
      }
    }

    const cash =
      cashYen(items, input.rate) +
      (checkIn ? deskCashYen(checkIn) : 0) +
      // A ride paid on the day is cash; one the rail pass covers is not.
      sumYen(
        rides.filter(
          (r) =>
            departsOn(r) === date && isPayable(r) && r.cost_currency === "JPY",
        ),
        input.rate,
      );

    return {
      date,
      leg,
      startsLeg: !!leg && leg.id !== previous?.id,
      note: input.days.find((d) => d.on_date === date) ?? null,
      bed,
      onPlane: night?.onPlane ?? false,
      needsBed: !!night && !night.stay && !night.onPlane,
      checkIn,
      checkOut,
      cash,
      entries,
      checklists,
      warnings: flightWarnings(items, flights.map((f) => f.flight)),
      planned: items.length > 0,
    };
  });
}

function atOf({
  flight,
  leaves,
}: {
  flight: TripFlight;
  leaves: boolean;
}): number {
  return Date.parse(leaves ? flight.departs_at : flight.arrives_at);
}

/**
 * The anchors laid into the day's cards.
 *
 * Cards keep their drag order — the board never re-sorts behind anyone's back,
 * and neither does this. A flight, a ride or a paper goes in after the last
 * timed card that starts before it. The old Itinerary put every ride above
 * every card, so a 17:40 bus sat on top of a 14:20 museum.
 */
export function splice(base: Entry[], anchors: Entry[]): Entry[] {
  const out = [...base];
  const untimed = anchors.filter((a) => a.at === null);
  const timed = anchors
    .filter((a) => a.at !== null)
    .sort((a, b) => a.at! - b.at! || compare(a.key, b.key));

  for (const anchor of timed) {
    let after = -1;
    out.forEach((entry, i) => {
      if (entry.at !== null && entry.at <= anchor.at!) after = i;
    });
    if (after >= 0) {
      out.splice(after + 1, 0, anchor);
    } else {
      const firstTimed = out.findIndex((e) => e.at !== null);
      out.splice(firstTimed === -1 ? out.length : firstTimed, 0, anchor);
    }
  }
  return [...untimed, ...out];
}

/**
 * The two rides with a flight riding on them: from the airport to the first
 * bed, and from the last bed back to the airport. The route's hops only run
 * between cities, so neither was ever something the planner said to book.
 *
 * Covered by a ride on the right side of the flight — leaving after it lands,
 * or arriving before it leaves — rather than by any ride that day.
 */
function transfers(
  date: string,
  journeys: ReturnType<typeof groupJourneys>,
  stays: TripStay[],
  rides: TripTransit[],
  legs: TripLeg[],
): Entry[] {
  const out: Entry[] = [];

  for (const journey of journeys) {
    const last = journey.flights.at(-1)!;
    if (
      last.arrives_tz === STAY_TZ &&
      utcToZoned(last.arrives_at, last.arrives_tz).date === date
    ) {
      const landed = Date.parse(last.arrives_at);
      const to =
        stays.find((s) => sleepsOn(s, date))?.name ??
        legForDay(legs, date)?.name;
      const covered = rides.some(
        (r) => departsOn(r) === date && Date.parse(r.departs_at) >= landed,
      );
      if (to && !covered) {
        out.push({
          kind: "gap",
          key: `from-airport-${last.id}`,
          at: landed + 1,
          from: airportName(last.to_airport),
          to,
        });
      }
    }

    const first = journey.flights[0];
    if (
      first.departs_tz === STAY_TZ &&
      utcToZoned(first.departs_at, first.departs_tz).date === date
    ) {
      const leaving = Date.parse(first.departs_at);
      const from =
        stays.find((s) => s.check_out_on === date)?.name ??
        stays.find((s) => sleepsOn(s, addDays(date, -1)))?.name ??
        legForDay(legs, date)?.name;
      const covered = rides.some(
        (r) => arrivesOn(r) === date && Date.parse(r.arrives_at) <= leaving,
      );
      if (from && !covered) {
        out.push({
          kind: "gap",
          key: `to-airport-${first.id}`,
          at: leaving - 1,
          from,
          to: airportName(first.from_airport),
        });
      }
    }
  }

  return out;
}

function airportName(code: string): string {
  return airport(code)?.name ?? code;
}

/**
 * A travel card that names a flight the trip doesn't have.
 *
 * Deliberately narrow. A travel card with no flight number is someone blocking
 * out the ride to the airport, and warning about that would be crying wolf. A
 * card that says DL167 on a day whose only flight is DL7 is a card that's
 * wrong, and it's the one that got printed as the flight.
 */
export function flightWarnings(
  items: TripItem[],
  flights: TripFlight[],
): string[] {
  if (flights.length === 0) return [];
  const numbers = new Set(flights.map((f) => normalise(f.flight_number)));
  const names = [...new Set(flights.map((f) => f.flight_number))];

  return items
    .filter((i) => isBlockout(i) && i.kind === "travel" && i.booking_ref)
    .filter((i) => /^[A-Z0-9]{2}\d{1,4}$/.test(normalise(i.booking_ref!)))
    .filter((i) => !numbers.has(normalise(i.booking_ref!)))
    .map(
      (i) =>
        `“${i.title}” says ${i.booking_ref}, but the ${names.length === 1 ? "flight" : "flights"} that day ${names.length === 1 ? "is" : "are"} ${listOf(names)}.`,
    );
}

function normalise(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

function listOf(words: string[]): string {
  return words.length <= 1
    ? (words[0] ?? "")
    : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
}

/* ------------------------------------------------------------ the page -- */

/** A day drawn in full, or a stretch of quiet days drawn as one line. */
export type Block =
  | { kind: "day"; day: PlanDay }
  | { kind: "quiet"; days: PlanDay[] };

/** Nothing on it anywhere: no card, no flight, no ride, no note, no move. */
export function isQuiet(day: PlanDay): boolean {
  return (
    day.entries.length === 0 &&
    !day.note?.title &&
    !day.note?.note &&
    !day.checkIn &&
    !day.checkOut &&
    day.checklists.length === 0 &&
    day.warnings.length === 0
  );
}

/**
 * Quiet days run together while nothing about them changes: the same leg, the
 * same bed, the same "no bed". Fifteen cards reading "Nothing planned" in a
 * row was fifteen screens of the page saying one thing.
 */
export function blocksOf(days: PlanDay[]): Block[] {
  const out: Block[] = [];
  for (const day of days) {
    const last = out.at(-1);
    if (!isQuiet(day)) {
      out.push({ kind: "day", day });
      continue;
    }
    const prev = last?.kind === "quiet" ? last.days.at(-1)! : null;
    if (
      last?.kind === "quiet" &&
      prev &&
      !day.startsLeg &&
      prev.leg?.id === day.leg?.id &&
      prev.bed?.id === day.bed?.id &&
      prev.needsBed === day.needsBed
    ) {
      last.days.push(day);
    } else {
      out.push({ kind: "quiet", days: [day] });
    }
  }
  return out;
}

/** Nights inside the agreed trip with nowhere to sleep, as stretches. */
export function bedGaps(days: PlanDay[]): { from: string; nights: number }[] {
  const out: { from: string; nights: number }[] = [];
  for (const day of days) {
    if (!day.needsBed) continue;
    const last = out.at(-1);
    if (last && addDays(last.from, last.nights) === day.date) last.nights += 1;
    else out.push({ from: day.date, nights: 1 });
  }
  return out;
}
