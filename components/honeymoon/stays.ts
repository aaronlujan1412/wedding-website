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
 * The strip's columns: every night any lane has a route or a stay on — and any
 * night a finder route reaches — so a suggestion for an extra night past the
 * agreed trip still has somewhere to sit.
 */
export function stripNights(
  legs: TripLeg[],
  stays: TripStay[],
  proposed: { check_in_on: string; check_out_on: string }[] = [],
): string[] {
  const starts = [
    ...legs.map((l) => l.starts_on),
    ...stays.map((s) => s.check_in_on),
    ...proposed.map((s) => s.check_in_on),
  ].sort();
  const ends = [
    ...legs.map((l) => addDays(l.ends_on, -1)),
    ...stays.map((s) => addDays(s.check_out_on, -1)),
    ...proposed.map((s) => addDays(s.check_out_on, -1)),
  ].sort();
  if (starts.length === 0 || ends.at(-1)! < starts[0]) return [];
  return eachDay(starts[0], ends.at(-1)!);
}

/* ------------------------------------------------------------ the ribbon -- */

export type BedAnswer =
  | { kind: "bed"; stay: TripStay }
  | { kind: "plane" }
  | { kind: "none" };

/** A run of consecutive nights with the same answer. `from`/`to` index the
 *  strip's days — a night is named by the day you go to sleep on it. */
export type BedSegment = BedAnswer & {
  from: number;
  to: number;
  nights: number;
};

export type DayBeds = {
  /** Last night — where you woke up. Null on the first day of the trip. */
  woke: BedAnswer | null;
  /** Tonight. Null on the last day, the one you fly home on. */
  sleeps: BedAnswer | null;
  /** You wake up in one place and go to sleep in another. */
  moving: boolean;
};

function bedKey(answer: BedAnswer): string {
  return answer.kind === "bed" ? answer.stay.id : answer.kind;
}

/**
 * Where every night of the trip is spent — as runs, and as a lookup per day.
 *
 * A night is not a day: it sits between two of them. The night of the 1st is
 * the one you go to sleep on the 1st and wake up from on the 2nd, so a stay
 * touches its check-out day for exactly one morning. That half-day offset is
 * the whole reason beds get their own row on the strip. A day where `woke`
 * and `sleeps` disagree is a day you travel, and the leg row can never say
 * so: legs own whole days and are forbidden from overlapping, so the day you
 * move belongs entirely to wherever you're going.
 */
export function bedPlan(
  days: string[],
  stays: TripStay[],
  flights: TripFlight[],
): { segments: BedSegment[]; byDay: Map<string, DayBeds> } {
  const decided = staysIn(stays, "decided");
  const plane = planeNights(flights);
  // The last day is the one you go home on, so it has no night.
  const nights = days.slice(0, -1);

  const answers = nights.map((night): BedAnswer => {
    const stay = decided.find((s) => sleepsOn(s, night));
    if (stay) return { kind: "bed", stay };
    return plane.has(night) ? { kind: "plane" } : { kind: "none" };
  });

  const segments: BedSegment[] = [];
  for (let i = 0; i < answers.length; ) {
    let j = i;
    while (j + 1 < answers.length && bedKey(answers[j + 1]) === bedKey(answers[i]))
      j++;
    segments.push({ ...answers[i], from: i, to: j, nights: j - i + 1 });
    i = j + 1;
  }

  const byDay = new Map<string, DayBeds>(
    days.map((date, i) => {
      const woke = i > 0 ? answers[i - 1] : null;
      const sleeps = i < answers.length ? answers[i] : null;
      return [
        date,
        {
          woke,
          sleeps,
          moving:
            woke !== null && sleeps !== null && bedKey(woke) !== bedKey(sleeps),
        },
      ];
    }),
  );

  return { segments, byDay };
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

/* ----------------------------------------------------------------- meals -- */

export type MealKind = "breakfast" | "dinner";

export const MEALS: MealKind[] = ["breakfast", "dinner"];

export const MEAL_LABEL: Record<MealKind, string> = {
  breakfast: "Breakfast",
  dinner: "Dinner",
};

export type Meal = {
  kind: MealKind;
  from: string | null;
  to: string | null;
  note: string | null;
};

/**
 * The meal if the stay includes it, else null. Included with no time yet is a
 * real answer — it's why the boolean is stored rather than inferred from the
 * times — so every caller has to cope with a meal that can't be drawn on a
 * clock.
 */
export function mealOf(stay: TripStay, kind: MealKind): Meal | null {
  const on = kind === "breakfast" ? stay.has_breakfast : stay.has_dinner;
  if (!on) return null;
  return kind === "breakfast"
    ? {
        kind,
        from: stay.breakfast_from,
        to: stay.breakfast_to,
        note: stay.breakfast_note,
      }
    : {
        kind,
        from: stay.dinner_from,
        to: stay.dinner_to,
        note: stay.dinner_note,
      };
}

export function mealsOf(stay: TripStay): Meal[] {
  return MEALS.map((kind) => mealOf(stay, kind)).filter((m) => m !== null);
}

const clock = (time: string) => time.slice(0, 5);

/**
 * The window in words. Either end can be unknown: the end is the half that
 * bites ("breakfast until 09:30"), and a ryokan dinner usually only has a
 * start, so both are said on their own rather than only as a pair.
 */
export function mealWindow(meal: Meal): string | null {
  if (meal.from && meal.to) return `${clock(meal.from)}–${clock(meal.to)}`;
  if (meal.from) return `from ${clock(meal.from)}`;
  if (meal.to) return `until ${clock(meal.to)}`;
  return null;
}

/** "Dinner 18:00–20:00 · kaiseki in the room", down to plain "Breakfast". */
export function mealLine(meal: Meal): string {
  const when = mealWindow(meal);
  const head = when ? `${MEAL_LABEL[meal.kind]} ${when}` : MEAL_LABEL[meal.kind];
  return meal.note ? `${head} · ${meal.note}` : head;
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
    ...(stay.has_dinner ? ["Tell them if we'll be late for dinner"] : []),
  ];
}
