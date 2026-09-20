import { compare, isBlockout, kindOf } from "./trip";
import { sleepsOn } from "./stays";
import { arrivesClock, departsClock } from "./transit";
import type { TripItem, TripStay, TripTransit } from "./types";

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

/** Must-dos first, then drag order, with a tiebreak both engines agree on. */
function byInterest(a: TripItem, b: TripItem): number {
  return (
    Number(b.must_do) - Number(a.must_do) ||
    a.position - b.position ||
    // Positions are floats and can tie after enough drags; the id keeps the
    // comparator consistent so the server and both engines agree on order.
    compare(a.id, b.id)
  );
}

/**
 * The cards attached to a wander block — its actual list.
 *
 * Attached explicitly, because the first version of this derived the list from
 * matching `city` across the pile and that turned out to be a list nobody
 * could see or add to: almost no card has a city, and the ones that do
 * disagree about what to call the same neighbourhood.
 *
 * A card that has since been given its own day drops off: it is no longer
 * something to do *if you feel like it* that afternoon, it is the afternoon.
 */
export function wanderIdeas(item: TripItem, all: TripItem[]): TripItem[] {
  return all
    .filter((i) => i.wander_id === item.id && i.on_date === null)
    .sort(byInterest);
}

/**
 * The wander block a card is drawn inside, if it is drawn inside one.
 *
 * An attached card is shown in its block's band rather than as its own row in
 * the pile — the whole point of gathering them is that they stop taking up a
 * hundred rows of scroll.
 *
 * Same lane only. A card can be attached across lanes, and hiding one of those
 * would take it off the pile it lives in to draw it in a row this view might
 * not even be showing. A card in two places is a smudge; a card in no place is
 * a bug report.
 *
 * A card with a day of its own is never nested: `wanderIdeas` drops it, because
 * it is no longer something to do if you feel like it that afternoon.
 */
export function nestedIn(item: TripItem, all: TripItem[]): TripItem | null {
  if (!item.wander_id || item.on_date !== null) return null;
  const parent = all.find((i) => i.id === item.wander_id);
  if (!parent || parent.lane !== item.lane) return null;
  return parent;
}

/**
 * Cards worth offering in the picker but not attached yet.
 *
 * This is where matching on `city` still earns its place: as a suggestion it
 * can be wrong or empty without costing anything, whereas as the whole list it
 * silently showed nothing. Everything loose in a pile is offered; anything in
 * the block's city floats to the top.
 */
export function wanderCandidates(item: TripItem, all: TripItem[]): TripItem[] {
  const city = item.city?.trim().toLowerCase();

  return all
    .filter(
      (i) =>
        i.id !== item.id &&
        i.on_date === null &&
        !isBlockout(i) &&
        i.wander_id !== item.id,
    )
    .sort((a, b) => {
      if (city) {
        const inCity = (x: TripItem) =>
          Number(x.city?.trim().toLowerCase() === city);
        const byCity = inCity(b) - inCity(a);
        if (byCity !== 0) return byCity;
      }
      return byInterest(a, b);
    });
}

export function blockoutDetail(
  item: TripItem,
  {
    stays,
    items,
    transit = [],
  }: { stays: TripStay[]; items: TripItem[]; transit?: TripTransit[] },
): BlockoutDetail {
  const links = kindOf(item.kind).links;

  if (links === "stay") {
    const stay = restStay(item, stays);
    return { text: stay ? stay.name : null, ideas: [] };
  }

  if (links === "city") {
    const ideas = wanderIdeas(item, items);
    const count = ideas.length
      ? `${ideas.length} to check out`
      : "nothing picked yet";
    return {
      text: item.city ? `${item.city} · ${count}` : count,
      ideas,
    };
  }

  // Travel. Linked to a ride on the transit tab when one has been picked;
  // until then the card carries its own route in its title, which is why the
  // link is optional rather than required.
  const ride = item.linked_transit_id
    ? (transit.find((r) => r.id === item.linked_transit_id) ?? null)
    : null;
  if (!ride) return { text: null, ideas: [] };

  return {
    text: `${ride.service ? `${ride.service} · ` : ""}${departsClock(ride)} ${ride.from_place} → ${arrivesClock(ride)} ${ride.to_place}`,
    ideas: [],
  };
}
