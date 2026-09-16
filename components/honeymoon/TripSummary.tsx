"use client";

import { useRate } from "./RateContext";
import { describeRate, formatYen, yenAsUsd } from "./trip";
import type { TripItem } from "./types";

/**
 * How far from planned the trip is, and what it costs so far.
 *
 * This replaced a row of five numbers at equal weight — days, decided,
 * suggested, yen, dollars — none of which answered anything on its own:
 * "15 decided" out of what? The question the board is for is how many days
 * are still nobody's plan, so that is the number, with its denominator.
 */
export function TripSummary({
  days,
  items,
  spend,
}: {
  days: string[];
  items: TripItem[];
  spend: number;
}) {
  const rate = useRate();
  const planned = new Set(
    items.filter((i) => i.lane === "decided" && i.on_date).map((i) => i.on_date),
  );
  const undecided = days.filter((d) => !planned.has(d)).length;

  return (
    <dl className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
      <div title="Days with no card in Decided yet">
        <dt className="sr-only">Days with nothing decided</dt>
        <dd className="font-raleway">
          {undecided === 0 ? (
            "Every day has a plan"
          ) : (
            <>
              <span className="font-mono font-medium text-foreground tabular-nums slashed-zero">
                {undecided}
              </span>{" "}
              of {days.length} days undecided
            </>
          )}
        </dd>
      </div>

      {spend > 0 && (
        <div
          title={`${describeRate(rate)}. Costs are stored in the currency you typed them in and converted at this rate for totals.`}
        >
          <dt className="sr-only">Trip total</dt>
          <dd className="font-mono tabular-nums slashed-zero">
            <span className="text-foreground">{formatYen(spend)}</span> ≈{" "}
            {yenAsUsd(spend, rate)}
            {/* A guessed rate says so on screen, not only in a tooltip. */}
            {!rate.live && (
              <span className="ml-1 font-raleway italic">estimate</span>
            )}
          </dd>
        </div>
      )}
    </dl>
  );
}
