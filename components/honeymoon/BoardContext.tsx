"use client";

import { createContext, useContext, useMemo } from "react";
import { RateProvider } from "./RateContext";
import type { Rate, TripItem, TripStay, TripTransit } from "./types";

/**
 * The rest of the board, for the cards that need to look past themselves.
 *
 * Only blockouts use this: a rest band resolves the stay covering its night,
 * a wander band counts the pile ideas in its city, and a travel band names the
 * ride it points at. All three are reads across the whole board from inside a
 * single card, which is exactly the shape that would otherwise thread three
 * more props through the grid, every lane cell and every sortable card to
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
};

const BoardContext = createContext<BoardData>({
  stays: [],
  items: [],
  transit: [],
});

export function BoardProvider({
  rate,
  stays,
  items,
  transit,
  children,
}: BoardData & { rate: Rate; children: React.ReactNode }) {
  const value = useMemo(
    () => ({ stays, items, transit }),
    [stays, items, transit],
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
