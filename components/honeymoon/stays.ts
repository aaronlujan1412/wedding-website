import { utcToZoned, zonedToUtc } from "./flights";
import {
  addDays,
  compare,
  costInYen,
  daysBetween,
  eachDay,
  legsIn,
  parseDay,
  tripDays,
} from "./trip";
import type { Lane, Rate, TripFlight, TripLeg, TripStay } from "./types";

/**
 * Stays are all in Japan, so their dates and clock times are Tokyo's. If the
 * trip ever grows a layover hotel somewhere else, this becomes a column.
 */
export const STAY_TZ = "Asia/Tokyo";

/** What most Japanese hotels print when the booking doesn't say. */
export const USUAL_CHECK_IN = "15:00";
export const USUAL_CHECK_OUT = "11:00";

/* ---------------------------------------------------------------- nights -- */

/**
 * The nights a stay covers. Nights are named by the evening they start on and
 * run [check_in_on, check_out_on) — check out on the 29th and the last night
 * was the 28th.
 */
export function stayNights(stay: TripStay): string[] {
  return eachDay(stay.check_in_on, addDays(stay.check_out_on, -1));
}

export function nightCount(stay: TripStay): number {
  return daysBetween(stay.check_in_on, stay.check_out_on);
}

export function sleepsOn(stay: TripStay, night: string): boolean {
  return stay.check_in_on <= night && night < stay.check_out_on;
}

/** Check-in order, ties broken so every engine agrees on it. */
export function byCheckIn(a: TripStay, b: TripStay): number {
  return (
    compare(a.check_in_on, b.check_in_on) ||
    compare(a.check_out_on, b.check_out_on) ||
    compare(a.created_at, b.created_at) ||
    compare(a.id, b.id)
  );
}

export function staysIn(stays: TripStay[], lane: Lane): TripStay[] {
  return stays.filter((s) => s.lane === lane).sort(byCheckIn);
}

/** "Dec 22 – 29", check-in to check-out. */
export function formatStayDates(
  stay: Pick<TripStay, "check_in_on" | "check_out_on">,
): string {
  const start = parseDay(stay.check_in_on);
  const end = parseDay(stay.check_out_on);
  const month = (d: Date) => d.toLocaleDateString("en-US", { month: "short" });
  return start.getMonth() === end.getMonth()
    ? `${month(start)} ${start.getDate()} – ${end.getDate()}`
    : `${month(start)} ${start.getDate()} – ${month(end)} ${end.getDate()}`;
}

export function formatNights(count: number): string {
  return `${count} ${count === 1 ? "night" : "nights"}`;
}

/**
 * Nights spent in the air. A flight that leaves on the 21st by its own
 * airport's calendar and lands on the 22nd by the other's means the night of
 * the 21st is on the plane, not in a bed.
 */
export function planeNights(flights: TripFlight[]): Set<string> {
  const out = new Set<string>();
  for (const f of flights) {
    const leaves = utcToZoned(f.departs_at, f.departs_tz).date;
    const lands = utcToZoned(f.arrives_at, f.arrives_tz).date;
    for (let n = leaves; n < lands; n = addDays(n, 1)) out.add(n);
  }
  return out;
}

export type Night = {
  date: string;
  stay: TripStay | null;
  onPlane: boolean;
};

/**
 * Every night of the agreed trip and where it's spent. The trip runs from the
 * first day of the Decided route to the night before its last day — the last
 * day is the one you fly home. A night with no stay and no flight is a night
 * with no bed.
 */
export function tripNights(
  legs: TripLeg[],
  stays: TripStay[],
  flights: TripFlight[],
): Night[] {
  const decided = staysIn(stays, "decided");
  const days = tripDays(legsIn(legs, "decided"));
  const starts = [
    ...(days.length ? [days[0]] : []),
    ...decided.map((s) => s.check_in_on),
  ].sort();
  const ends = [
    ...(days.length ? [addDays(days.at(-1)!, -1)] : []),
    ...decided.map((s) => addDays(s.check_out_on, -1)),
  ].sort();
  if (starts.length === 0) return [];

  const plane = planeNights(flights);
  return eachDay(starts[0], ends.at(-1)!).map((date) => ({
    date,
    stay: decided.find((s) => sleepsOn(s, date)) ?? null,
    onPlane: plane.has(date),
  }));
}

/**
 * The strip's columns: every night any lane has a route or a stay on, so a
 * suggestion for an extra night past the agreed trip still has somewhere to
 * sit.
 */
export function stripNights(legs: TripLeg[], stays: TripStay[]): string[] {
  const starts = [
    ...legs.map((l) => l.starts_on),
    ...stays.map((s) => s.check_in_on),
  ].sort();
  const ends = [
    ...legs.map((l) => addDays(l.ends_on, -1)),
    ...stays.map((s) => addDays(s.check_out_on, -1)),
  ].sort();
  if (starts.length === 0 || ends.at(-1)! < starts[0]) return [];
  return eachDay(starts[0], ends.at(-1)!);
}

/**
 * One lane's stays stacked into rows so overlapping suggestions sit one above
 * the other instead of on top of each other. Decided never overlaps, so it is
 * always one row.
 */
export function stackStays(stays: TripStay[]): TripStay[][] {
  const rows: TripStay[][] = [];
  for (const stay of [...stays].sort(byCheckIn)) {
    const row = rows.find((r) => r.at(-1)!.check_out_on <= stay.check_in_on);
    if (row) row.push(stay);
    else rows.push([stay]);
  }
  return rows;
}

/**
 * Suggestions grouped by the nights they're competing for. Stays whose nights
 * overlap — directly or through a chain — are one question: "where do we sleep
 * Dec 29 to Jan 1?"
 */
export type StayQuestion = { from: string; to: string; stays: TripStay[] };

export function groupSuggestions(stays: TripStay[]): StayQuestion[] {
  const out: StayQuestion[] = [];
  const sorted = stays
    .filter((s) => s.lane !== "decided")
    .sort(byCheckIn);

  for (const stay of sorted) {
    const last = out.at(-1);
    if (last && stay.check_in_on < last.to) {
      last.stays.push(stay);
      if (stay.check_out_on > last.to) last.to = stay.check_out_on;
    } else {
      out.push({
        from: stay.check_in_on,
        to: stay.check_out_on,
        stays: [stay],
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------- adopting -- */

/** Decided already has this exact stay: same place, same nights. */
export function isStayAdopted(stay: TripStay, stays: TripStay[]): boolean {
  return (
    stay.lane !== "decided" &&
    stays.some(
      (d) =>
        d.lane === "decided" &&
        d.name === stay.name &&
        d.check_in_on === stay.check_in_on &&
        d.check_out_on === stay.check_out_on,
    )
  );
}

/**
 * What adopting a suggestion would do to Decided. Mirrors `adopt_trip_stay`,
 * so the page can say "this replaces the Gora Kadan booking" before it does.
 */
export function stayAdoptEffect(stay: TripStay, stays: TripStay[]) {
  const decided = staysIn(stays, "decided");
  const inside = (d: TripStay) =>
    d.check_in_on >= stay.check_in_on && d.check_out_on <= stay.check_out_on;
  const overlaps = (d: TripStay) =>
    d.check_in_on < stay.check_out_on && d.check_out_on > stay.check_in_on;
  return {
    replaced: decided.filter(inside),
    shortened: decided.filter((d) => overlaps(d) && !inside(d)),
  };
}

/** The Decided route's places across a stay's nights, for context. */
export function routeDuring(
  stay: Pick<TripStay, "check_in_on" | "check_out_on">,
  legs: TripLeg[],
): string[] {
  const names = legsIn(legs, "decided")
    .filter(
      (l) => l.starts_on < stay.check_out_on && l.ends_on >= stay.check_in_on,
    )
    .map((l) => l.name);
  return [...new Set(names)];
}

/* ----------------------------------------------------------------- times -- */

export function checkInAt(stay: TripStay): string {
  return zonedToUtc(
    stay.check_in_on,
    stay.check_in_time?.slice(0, 5) ?? USUAL_CHECK_IN,
    STAY_TZ,
  );
}

export function checkOutAt(stay: TripStay): string {
  return zonedToUtc(
    stay.check_out_on,
    stay.check_out_time?.slice(0, 5) ?? USUAL_CHECK_OUT,
    STAY_TZ,
  );
}

/** Free cancellation ends at the end of `cancel_by`, Tokyo time. */
export function cancelDeadline(stay: TripStay): string | null {
  return stay.cancel_by ? zonedToUtc(stay.cancel_by, "23:59", STAY_TZ) : null;
}

/** A deadline close enough that it should be the first thing you see. */
export const CANCEL_WARNING_DAYS = 7;

export function cancelIsClose(stay: TripStay, now: number): boolean {
  const deadline = cancelDeadline(stay);
  if (!deadline) return false;
  const left = new Date(deadline).getTime() - now;
  return left > 0 && left < CANCEL_WARNING_DAYS * 86_400_000;
}

/**
 * Tonight's stay if you're in one, otherwise the next one you check into.
 * Between check-out and the next check-in, that's the next one.
 */
export function currentStay(
  stays: TripStay[],
  now: number,
): { stay: TripStay; tonight: boolean } | null {
  const decided = staysIn(stays, "decided");
  const tonight = decided.find(
    (s) =>
      new Date(checkInAt(s)).getTime() <= now &&
      now < new Date(checkOutAt(s)).getTime(),
  );
  if (tonight) return { stay: tonight, tonight: true };
  const next = decided.find((s) => new Date(checkInAt(s)).getTime() > now);
  return next ? { stay: next, tonight: false } : null;
}

/* ----------------------------------------------------------------- money -- */

export function perNightYen(stay: TripStay, rate: Rate): number | null {
  if (stay.cost_amount === null) return null;
  return Math.round(costInYen(stay, rate) / nightCount(stay));
}

/**
 * Cash to have on you at check-in: a stay paid at the desk in yen, plus the
 * lodging tax some cities collect there on top.
 */
export function deskCashYen(stay: TripStay): number {
  const atDesk =
    stay.payment === "at_desk" && stay.cost_currency === "JPY"
      ? (stay.cost_amount ?? 0)
      : 0;
  return atDesk + (stay.desk_cash_yen ?? 0);
}

/* ------------------------------------------------------------------ bags -- */

/**
 * Where forwarded bags go and whether they beat you there. Takkyubin delivers
 * the next day, so bags sent the morning you move arrive a night after you do.
 */
export function bagsFor(
  stay: TripStay,
  stays: TripStay[],
): {
  outgoing: { to: TripStay | null; lateBy: number } | null;
  incoming: TripStay | null;
} {
  const decided = staysIn(stays, "decided");
  const index = decided.findIndex((s) => s.id === stay.id);
  const next = index >= 0 ? (decided[index + 1] ?? null) : null;
  const prev = index > 0 ? decided[index - 1] : null;

  return {
    outgoing: stay.forward_bags
      ? {
          to: next,
          // Sent at check-out, delivered the next day.
          lateBy: next
            ? Math.max(0, 1 - daysBetween(stay.check_out_on, next.check_in_on))
            : 0,
        }
      : null,
    incoming: prev?.forward_bags ? prev : null,
  };
}

/* ------------------------------------------------------------- checklist -- */

export function stayChecklistKey(stay: TripStay): string {
  return `stay:${stay.id}`;
}

export function suggestedForStay(stay: TripStay): string[] {
  return [
    // Hotels in Japan copy a foreign guest's passport at check-in. It's law.
    "Passports for check-in",
    ...(stay.forward_bags
      ? ["Send the bags ahead at the front desk", "Overnight bag packed"]
      : []),
    ...(deskCashYen(stay) > 0 ? ["Cash for the desk"] : []),
    ...(stay.dinner_time ? ["Tell them if we'll be late for dinner"] : []),
  ];
}
