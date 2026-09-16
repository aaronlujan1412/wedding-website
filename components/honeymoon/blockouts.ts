import { compare, isBlockout, kindOf } from "./trip";
import { sleepsOn } from "./stays";
import type { TripItem, TripStay } from "./types";

/**
 * What a blockout points at.
 *
 * Two of the three resolve to a record on another tab, and the third does not
 * resolve to anything at all: a wander blockout names a city, and the ideas
 * worth seeing there are looked up live from the pile every render. That is
 * the whole reason wandering needs no schema — the list cannot go stale,
 * because there is no list, and a card dragged out of the pile onto a day
 * leaves the wander block on its own.
 */
export type BlockoutDetail = {
  /** The line under the label on the band. Null when there is nothing to say. */
  text: string | null;
  /** Pile ideas in this city, for a wander block. Empty for the other two. */
  ideas: TripItem[];
};

/**
 * The stay a rest block sits inside.
 *
 * Normally inferred: a rest block on the 29th already knows which stay covers
 * that night, so asking anyone to pick one would be busywork. The explicit
 * link is only an override for a day with two stays on it — check-in day, when
 * you are leaving one and arriving at another.
 */
export function restStay(item: TripItem, stays: TripStay[]): TripStay | null {
  if (item.linked_stay_id) {
    return stays.find((s) => s.id === item.linked_stay_id) ?? null;
  }
  if (!item.on_date) return null;

  const night = item.on_date;
  const covering = stays.filter(
    (s) => s.lane === item.lane && sleepsOn(s, night),
  );
  // Two stays covering one night is exactly the case the override exists for,
  // so infer nothing rather than pick the wrong one silently.
  return covering.length === 1 ? covering[0] : null;
}

/**
 * Ideas in the city a wander block names, still sitting in a pile.
 *
 * Scoped to cards with no day of their own: something already scheduled for
 * Tuesday is not a suggestion for Tuesday's wander, it is Tuesday. Deliberately
 * not scoped to a lane — on the afternoon itself you want everything either of
 * you ever flagged in that city, not just the half that got agreed. Matching is
 * case- and space-insensitive because these cities are typed by hand on both
 * sides.
 */
export function wanderIdeas(item: TripItem, all: TripItem[]): TripItem[] {
  const city = item.city?.trim().toLowerCase();
  if (!city) return [];

  return all
    .filter(
      (i) =>
        i.id !== item.id &&
        i.on_date === null &&
        !isBlockout(i) &&
        i.city?.trim().toLowerCase() === city,
    )
    .sort(
      (a, b) =>
        Number(b.must_do) - Number(a.must_do) ||
        a.position - b.position ||
        // Positions are floats and can tie after enough drags; the id keeps the
        // comparator consistent so the server and both engines agree on order.
        compare(a.id, b.id),
    );
}

export function blockoutDetail(
  item: TripItem,
  { stays, items }: { stays: TripStay[]; items: TripItem[] },
): BlockoutDetail {
  const links = kindOf(item.kind).links;

  if (links === "stay") {
    const stay = restStay(item, stays);
    return { text: stay ? stay.name : null, ideas: [] };
  }

  if (links === "city") {
    const ideas = wanderIdeas(item, items);
    if (!item.city) return { text: null, ideas };
    return {
      text: ideas.length
        ? `${item.city} · ${ideas.length} ${ideas.length === 1 ? "idea" : "ideas"} nearby`
        : item.city,
      ideas,
    };
  }

  // Travel. The transit tab does not exist yet, so the card carries its own
  // route in the title and this stays empty rather than inventing a link.
  return { text: null, ideas: [] };
}
