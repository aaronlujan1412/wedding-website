"use client";

import { createContext, useContext, useMemo } from "react";
import { RateProvider } from "./RateContext";
import type { Rate, TripItem, TripLeg, TripStay, TripTransit } from "./types";

/**
 * The rest of the board, for the cards that need to look past themselves.
 *
 * Blockouts and the card menu use it. A rest band resolves the stay covering
 * its night, a wander band counts the pile ideas in its city, a travel band
 * names the ride it points at, and a right-click offers every day of the trip
 * to send the card to. All of them are reads across the whole board from
 * inside a single card, which is exactly the shape that would otherwise thread
 * five more props through the grid, every lane cell and every sortable card to
 * reach one line of small print.
 *
 * It carries the rate through as well rather than sitting beside RateProvider,
 * so the board keeps one wrapper instead of two. The other two tabs have no
 * board to read and still use RateProvider on its own.
 *
 * `items` is the board's optimistic mirror, not the server copy — drag the last
 * Shimokitazawa idea onto a day and the wander band's count drops with it
 * rather than a revalidation later.
 */
type BoardData = {
  stays: TripStay[];
  items: TripItem[];
  transit: TripTransit[];
  /** Every day of the trip, in order — the days a card can be sent to. */
  days: string[];
  legs: TripLeg[];
};

const BoardContext = createContext<BoardData>({
  stays: [],
  items: [],
  transit: [],
  days: [],
  legs: [],
});

export function BoardProvider({
  rate,
  stays,
  items,
  transit,
  days,
  legs,
  children,
}: BoardData & { rate: Rate; children: React.ReactNode }) {
  const value = useMemo(
    () => ({ stays, items, transit, days, legs }),
    [stays, items, transit, days, legs],
  );
  return (
    <RateProvider rate={rate}>
      <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
    </RateProvider>
  );
}

export function useBoardData() {
  return useContext(BoardContext);
}
