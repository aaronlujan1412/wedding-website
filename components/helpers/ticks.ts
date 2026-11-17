import "server-only";

import type { Line } from "@/components/schedule/schedule";
import { supabase } from "@/lib/supabase";
import { cardsOn, type CardId } from "./cards";
import { cleanUpList, packingList } from "./lists";
import { shotList } from "./shots";
import { tickKey } from "./tick-key";

/**
 * The cards with boxes to tick, and the lines they're drawn from — the same
 * lists `HelperView` and `ShotList` hand to `Lines` with a `tick`. Adding a
 * checklist to a card means adding it here too, or its ticks won't save.
 */
const TICKED_LISTS: Partial<Record<CardId, readonly Line[][]>> = {
  packing: [packingList],
  "clean-up": [cleanUpList],
  shots: shotList.map((section) => section.shots),
};

/** Every line's key, at every depth. A superset of the boxes — headings
    have keys too — which is all a check against made-up items needs. */
function keysOf(lines: readonly Line[], path: readonly string[] = []): string[] {
  return lines.flatMap((line) => {
    const item = typeof line === "string" ? { text: line } : line;
    const here = [...path, item.text];
    return [tickKey(here), ...keysOf(item.lines ?? [], here)];
  });
}

const KEYS = new Map(
  Object.entries(TICKED_LISTS).map(([card, lists]) => [
    card,
    new Set(lists.flatMap((lines) => keysOf(lines))),
  ]),
);

/** Whether a card has boxes to tick. */
export function hasTicks(card: string): card is CardId {
  return KEYS.has(card);
}

/** Whether `item` is a real line on `card`: the actions take nothing else,
    since the open page's boxes can be ticked by anyone with the link. */
export function isTickItem(card: CardId, item: string) {
  return KEYS.get(card)?.has(item) ?? false;
}

/** Ticks on a card on the open page can be read and written by anyone;
    the rest (the shot list) need the helpers' code. */
export function isOpenCard(card: CardId) {
  return cardsOn(null).some((c) => c.id === card);
}

/**
 * What's ticked on a card. No access check: callers check first. Empty on
 * a failed read, so the page still draws; the boxes' poll tries again.
 */
export async function loadTicks(card: CardId): Promise<string[]> {
  const { data, error } = await supabase
    .from("helper_ticks")
    .select("item")
    .eq("card", card);
  if (error) {
    console.error("helper_ticks read failed", error.message);
    return [];
  }
  return data.map((row) => row.item);
}
