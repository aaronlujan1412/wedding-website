"use client";

import { createContext, useContext, useMemo } from "react";
import { RateProvider } from "./RateContext";
import type { Rate, TripItem, TripStay } from "./types";

/**
 * The rest of the board, for the cards that need to look past themselves.
 *
 * Only blockouts use this: a rest band resolves the stay covering its night
 * and a wander band counts the pile ideas in its city. Both are reads across
 * the whole board from inside a single card, which is exactly the shape that
 * would otherwise thread `stays` and `items` through the grid, every lane cell
 * and every sortable card to reach one line of small print.
 *
 * It carries the rate through as well rather than sitting beside RateProvider,
 * so the board keeps one wrapper instead of two. The other two tabs have no
 * board to read and still use RateProvider on its own.
 *
 * `items` is the board's optimistic mirror, not the server copy — drag the last
 * Shimokitazawa idea onto a day and the wander band's count drops with it
 * rather than a revalidation later.
 */
type BoardData = { stays: TripStay[]; items: TripItem[] };

const BoardContext = createContext<BoardData>({ stays: [], items: [] });

export function BoardProvider({
  rate,
  stays,
  items,
  children,
}: BoardData & { rate: Rate; children: React.ReactNode }) {
  const value = useMemo(() => ({ stays, items }), [stays, items]);
  return (
    <RateProvider rate={rate}>
      <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
    </RateProvider>
  );
}

export function useBoardData() {
  return useContext(BoardContext);
}
