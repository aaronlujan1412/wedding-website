"use client";

import { createContext, useContext } from "react";
import { FALLBACK_YEN_PER_USD } from "./trip";
import type { Rate } from "./types";

/**
 * The exchange rate, read once on the server and shared with every card and
 * dialog below the board. A context rather than a prop because it would
 * otherwise thread through the grid, every lane cell and every sortable card
 * just to reach a tooltip.
 */
const RateContext = createContext<Rate>({
  yenPerUsd: FALLBACK_YEN_PER_USD,
  asOf: null,
  live: false,
});

export function RateProvider({
  rate,
  children,
}: {
  rate: Rate;
  children: React.ReactNode;
}) {
  return <RateContext.Provider value={rate}>{children}</RateContext.Provider>;
}

export function useRate() {
  return useContext(RateContext);
}
