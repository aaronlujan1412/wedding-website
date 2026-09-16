"use client";

import { useSyncExternalStore } from "react";
import {
  formatClock,
  formatCost,
  formatDayLong,
  formatDuration,
  itemLength,
} from "./trip";
import type { TripItem } from "./types";

/**
 * The board's clipboard: one card, held between a Copy and a Paste.
 *
 * It is a module-level store rather than state in `HoneymoonBoard` because
 * both ends of the gesture live on leaves of the tree — the menu on a card in
 * the pile copies, the menu on a cell eighteen days away pastes — and nothing
 * in between has any use for it. The same reasoning as `BoardContext`, minus
 * the provider, since a clipboard has no props to seed it from.
 *
 * It is mirrored into `sessionStorage` so it survives a reload and a walk over
 * to another tab and back. Not `localStorage`: a card copied last Tuesday is
 * not something you meant to paste today.
 *
 * Copying also puts a readable version of the card on the SYSTEM clipboard, so
 * the same gesture that moves a card around the board is the one that pastes
 * it into a message to whoever you are meeting in Kyoto.
 */

const KEY = "honeymoon-clip";

export type Clip = {
  item: TripItem;
  /** A cut card moves when it lands; a copied one is duplicated. */
  cut: boolean;
};

let clip: Clip | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw) clip = JSON.parse(raw) as Clip;
  } catch {
    // Private windows and blocked storage both throw. A clipboard that only
    // lasts as long as the page is still a working clipboard.
  }
}

export function getClip(): Clip | null {
  load();
  return clip;
}

export function setClip(next: Clip | null) {
  load();
  clip = next;
  try {
    if (next) window.sessionStorage.setItem(KEY, JSON.stringify(next));
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // As above — the copy still works, it just won't survive a reload.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Null on the server and through hydration, then whatever was copied. */
export function useClip(): Clip | null {
  return useSyncExternalStore(subscribe, getClip, () => null);
}

/** Puts the card on the system clipboard too, for pasting somewhere else. */
export function copyToSystem(item: TripItem) {
  try {
    void navigator.clipboard?.writeText(clipText(item));
  } catch {
    // No permission, or an insecure origin. The board's own clipboard is set
    // either way, which is the half this page needs.
  }
}

/**
 * A card as a person would write it out: the name, when it is, where it is,
 * what it costs, and the link. Enough to answer "where are we meeting?"
 * without opening the planner.
 */
export function clipText(item: TripItem): string {
  const lines = [item.title];
  if (item.title_ja) lines.push(item.title_ja);

  const when = [
    item.on_date ? formatDayLong(item.on_date) : null,
    item.start_time ? formatClock(item.start_time) : null,
    formatDuration(itemLength(item)),
  ].filter(Boolean);
  if (when.length) lines.push(when.join(" · "));

  const where = item.address ?? item.city;
  if (where) lines.push(where);
  if (item.cost_amount !== null) lines.push(formatCost(item));

  const link = item.url ?? item.map_url ?? item.booking_url;
  if (link) lines.push(link);
  if (item.notes?.trim()) lines.push("", item.notes.trim());

  return lines.join("\n");
}
