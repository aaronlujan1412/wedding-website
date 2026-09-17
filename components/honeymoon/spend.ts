import { staysIn } from "./stays";
import { payableRides, transitIn } from "./transit";
import { sumYen } from "./trip";
import type { Rate, TripBoard } from "./types";

/**
 * What the agreed trip costs, in yen: Decided's cards, the papers, every
 * flight, the rides that aren't on the rail pass, and the agreed stays.
 *
 * One formula for every page that states the total. The Itinerary used to add
 * up cards, papers and stays only, so it quoted ¥340,000 less than the Board
 * for the same trip — the flights were simply never counted.
 */
export function tripSpend(
  board: Pick<TripBoard, "items" | "docs" | "flights" | "transit" | "stays">,
  rate: Rate,
): number {
  return (
    sumYen(
      board.items.filter((i) => i.lane === "decided"),
      rate,
    ) +
    sumYen(board.docs, rate) +
    sumYen(board.flights, rate) +
    // Rides the rail pass covers cost nothing on the day — the pass itself is
    // a trip_docs row and its price is counted there instead.
    sumYen(payableRides(transitIn(board.transit, "decided")), rate) +
    sumYen(staysIn(board.stays, "decided"), rate)
  );
}
