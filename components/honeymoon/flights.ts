import { HOME_AIRPORT, airport } from "./airports";
import type { TripFlight } from "./types";

/* ------------------------------------------------------------ time zones -- */

/**
 * Minutes a time zone is ahead of UTC at a given instant. Intl will format an
 * instant in any zone but won't hand the offset back directly, so format the
 * instant's wall-clock parts in that zone and see how far they sit from UTC.
 */
function offsetMinutes(utcMs: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  const wall = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return Math.round((wall - utcMs) / 60_000);
}

/**
 * "11:05 on Dec 4 in Salt Lake" → the instant, as ISO. This is the whole point
 * of storing a zone per airport: you type the time exactly as the confirmation
 * prints it, in that airport's local time, and never do the maths yourself.
 *
 * Two passes, because the offset at the naive guess can differ from the offset
 * at the answer when a DST change falls between them.
 */
export function zonedToUtc(date: string, time: string, tz: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  const first = naive - offsetMinutes(naive, tz) * 60_000;
  const second = naive - offsetMinutes(first, tz) * 60_000;
  return new Date(second).toISOString();
}

/** The instant's local date and time in a zone, for filling a form back in. */
export function utcToZoned(
  iso: string,
  tz: string,
): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

/**
 * Intl names most zones well in en-US, but gives "GMT+9" for Tokyo. These are
 * the ones this trip will actually read on a screen.
 */
const ZONE_NAMES: Record<string, string> = {
  "Asia/Tokyo": "JST",
  "Asia/Seoul": "KST",
  "Asia/Taipei": "Taipei",
  "Asia/Hong_Kong": "HKT",
  "Asia/Manila": "PHT",
  "Pacific/Guam": "ChST",
};

export function zoneName(iso: string, tz: string): string {
  if (ZONE_NAMES[tz]) return ZONE_NAMES[tz];
  return (
    new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
      .formatToParts(new Date(iso))
      .find((p) => p.type === "timeZoneName")?.value ?? tz
  );
}

export function formatClockIn(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

/** "Thu Dec 4" in the airport's own calendar, not the viewer's. */
export function formatDateIn(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

/** 12-hour time with am/pm, for sentences like "11:40pm at home". */
export function formatSpokenTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  })
    .format(new Date(iso))
    .replace(" AM", "am")
    .replace(" PM", "pm");
}

export function formatSpan(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function minutesBetween(fromIso: string, toIso: string): number {
  return (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60_000;
}

/* ---------------------------------------------------------------- flights -- */

export function flightMinutes(f: TripFlight): number {
  return minutesBetween(f.departs_at, f.arrives_at);
}

/**
 * Calendar days between leaving and landing, each in its own airport's local
 * date. +1 flying to Tokyo; on the way home it's usually 0 or even -1 — you
 * land in Salt Lake at an earlier clock time than you left Tokyo.
 */
export function dayShift(f: TripFlight): number {
  const dep = utcToZoned(f.departs_at, f.departs_tz).date;
  const arr = utcToZoned(f.arrives_at, f.arrives_tz).date;
  return Math.round(
    (Date.parse(`${arr}T00:00:00Z`) - Date.parse(`${dep}T00:00:00Z`)) /
      86_400_000,
  );
}

/**
 * Whether the route crosses the International Date Line, and roughly where
 * along the line to draw it (0 at the origin, 1 at the destination).
 *
 * Decided from longitudes, not from the clocks: Salt Lake to London changes the
 * date too, but crosses nothing. A route crosses the antimeridian when the
 * shorter way between the two longitudes goes over ±180°. Returns null for an
 * airport not in the built-in list, since there's no longitude to go on.
 */
export function dateLine(f: TripFlight): { at: number } | null {
  const from = airport(f.from_airport);
  const to = airport(f.to_airport);
  if (!from || !to) return null;

  const delta = to.lon - from.lon;
  if (Math.abs(delta) <= 180) return null;

  // Degrees from the origin to ±180, over degrees of the whole crossing.
  const total = 360 - Math.abs(delta);
  const toEdge = 180 - Math.abs(from.lon);
  return { at: Math.min(0.9, Math.max(0.1, toEdge / total)) };
}

export function isInternational(f: TripFlight): boolean {
  const from = airport(f.from_airport);
  const to = airport(f.to_airport);
  // Unknown airport: assume international, which errs toward arriving early.
  return !from || !to || from.country !== to.country;
}

/**
 * When to be at the airport: three hours ahead internationally, two
 * domestically. The usual airline guidance, not a promise — a Haneda Sunday
 * evening deserves more.
 */
export function beAtAirportBy(f: TripFlight): string {
  const lead = isInternational(f) ? 180 : 120;
  return new Date(
    new Date(f.departs_at).getTime() - lead * 60_000,
  ).toISOString();
}

/** Most airlines open online check-in 24 hours before departure. */
export function checkinOpens(f: TripFlight): string {
  return new Date(
    new Date(f.departs_at).getTime() - 24 * 60 * 60_000,
  ).toISOString();
}

/** A link that works for any airline when the flight has no status URL of its own. */
export function statusLink(f: TripFlight): string {
  return (
    f.status_url ||
    `https://www.google.com/search?q=${encodeURIComponent(`${f.flight_number} flight status`)}`
  );
}

/**
 * Flights that touch a trip day, by each airport's own calendar: leaving Salt
 * Lake on the 4th, landing in Tokyo on the 5th. A board day is a local date,
 * so this is the only comparison that puts the flight on the right column.
 */
export function flightsOnDay(
  flights: TripFlight[],
  iso: string,
): { flight: TripFlight; leaves: boolean; lands: boolean }[] {
  return flights
    .map((flight) => ({
      flight,
      leaves: utcToZoned(flight.departs_at, flight.departs_tz).date === iso,
      lands: utcToZoned(flight.arrives_at, flight.arrives_tz).date === iso,
    }))
    .filter((f) => f.leaves || f.lands);
}

/* --------------------------------------------------------------- journeys -- */

export type Layover = {
  minutes: number;
  /** Landed at one airport and leaving from another in the same city. */
  changesAirport: boolean;
  tone: "tight" | "long" | null;
};

export type Journey = {
  id: string;
  kind: "outbound" | "home" | "between";
  flights: TripFlight[];
  /** layovers[i] sits between flights[i] and flights[i + 1]. */
  layovers: Layover[];
  /** Every flight's checklist key — a journey's checklist is all of them. */
  lists: string[];
};

const MAX_CONNECTION_MINUTES = 24 * 60;

export function checklistKey(f: TripFlight): string {
  return `flight:${f.id}`;
}

function cityOf(code: string, stored: string | null): string | null {
  return stored ?? airport(code)?.city ?? null;
}

/**
 * Groups flights into journeys. A flight continues the previous one when it
 * leaves from where that one landed — or another airport in the same city,
 * like landing at Narita and leaving from Haneda — within a day. Nothing is
 * stored: move a flight's date and the grouping follows.
 */
export function groupJourneys(flights: TripFlight[]): Journey[] {
  const sorted = [...flights].sort((a, b) =>
    a.departs_at < b.departs_at ? -1 : 1,
  );
  const journeys: Journey[] = [];

  for (const flight of sorted) {
    const current = journeys.at(-1);
    const prev = current?.flights.at(-1);

    if (current && prev) {
      const gap = minutesBetween(prev.arrives_at, flight.departs_at);
      const sameAirport = prev.to_airport === flight.from_airport;
      const prevCity = cityOf(prev.to_airport, prev.to_city);
      const sameCity =
        !sameAirport &&
        prevCity !== null &&
        prevCity === cityOf(flight.from_airport, flight.from_city);

      if (
        (sameAirport || sameCity) &&
        gap >= 0 &&
        gap <= MAX_CONNECTION_MINUTES
      ) {
        const tight = gap < (sameCity ? 180 : 75);
        current.flights.push(flight);
        current.lists.push(checklistKey(flight));
        current.layovers.push({
          minutes: gap,
          changesAirport: sameCity,
          tone: tight ? "tight" : gap >= 6 * 60 ? "long" : null,
        });
        continue;
      }
    }

    journeys.push({
      id: flight.id,
      kind: "between",
      flights: [flight],
      layovers: [],
      lists: [checklistKey(flight)],
    });
  }

  for (const [i, journey] of journeys.entries()) {
    const first = journey.flights[0];
    const last = journey.flights.at(-1)!;
    journey.kind =
      last.to_airport === HOME_AIRPORT
        ? "home"
        : first.from_airport === HOME_AIRPORT || i === 0
          ? "outbound"
          : "between";
  }

  return journeys;
}

export const JOURNEY_LABELS: Record<Journey["kind"], string> = {
  outbound: "Getting there",
  home: "Going home",
  between: "Along the way",
};

/**
 * The flight to show up top: the next one that hasn't left yet, or one that
 * left less than half an hour ago — boarding runs late and you'll still be
 * looking at this page at the gate.
 */
export function nextFlight(
  flights: TripFlight[],
  now = Date.now(),
): TripFlight | null {
  const grace = 30 * 60_000;
  return (
    [...flights]
      .sort((a, b) => (a.departs_at < b.departs_at ? -1 : 1))
      .find((f) => new Date(f.departs_at).getTime() > now - grace) ?? null
  );
}

/** "in 81 days", "in 5h 20m", "now". */
export function countdown(iso: string, now = Date.now()): string {
  const minutes = Math.round((new Date(iso).getTime() - now) / 60_000);
  if (minutes <= 0) return "now";
  if (minutes < 60) return `in ${minutes}m`;
  if (minutes < 48 * 60) return `in ${formatSpan(minutes)}`;
  return `in ${Math.round(minutes / (24 * 60))} days`;
}

/** Things worth grabbing for an international trip, offered on an empty checklist. */
export function suggestedEssentials(journey: Journey): string[] {
  const intoJapan = journey.flights.some((f) => f.arrives_tz === "Asia/Tokyo");
  return [
    "Passports (both)",
    ...(intoJapan ? ["Visit Japan Web QR codes, screenshotted"] : []),
    "Boarding passes in the airline app",
    ...(intoJapan ? ["JR Pass exchange orders"] : []),
    "eSIM installed before leaving",
    "Phone chargers and a battery pack",
    "Some yen in cash",
  ].slice(0, intoJapan ? 7 : 4);
}
