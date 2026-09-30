"use client";

import { useMemo, useState } from "react";
import {
  atGrams,
  gramsText,
  NUTRIENTS,
  nutrientText,
  type FoodDetail,
} from "@/lib/meal-types";

/**
 * What's in the amount you're actually eating.
 *
 * USDA reports per 100 g, which is correct and which nobody eats. Every lookup
 * otherwise ends in the reader doing arithmetic against a kitchen scale they
 * are not holding — which is how a diet stops being measured and goes back to
 * being a guess. So the numbers on screen are always for a stated amount, and
 * per-100 g is the footnote rather than the headline.
 *
 * Client-side because the answer has to change as fast as the number does. A
 * round trip per keystroke would make it feel like a form to fill in rather
 * than a thing to poke at.
 */

const GRAMS = "grams";

export function FoodPortion({ food }: { food: FoodDetail }) {
  /*
   * Opens on the food's most ordinary portion — FDC's own first, which is the
   * one it leads with — because '1 thigh' is the question somebody actually
   * has. Falling back to 100 g only when the source offers nothing.
   */
  const [unit, setUnit] = useState(food.portions[0]?.id ?? GRAMS);
  const [amount, setAmount] = useState(food.portions.length ? "1" : "100");

  const grams = useMemo(() => {
    const count = Number(amount.replace(/,/g, ""));
    if (!Number.isFinite(count) || count < 0) return null;
    if (unit === GRAMS) return count;
    const portion = food.portions.find((p) => p.id === unit);
    return portion ? count * portion.grams : null;
  }, [amount, unit, food.portions]);

  const kcal = grams === null ? null : atGrams(food.kcal, grams);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="font-dot text-[11px] text-me-dim">how much</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            aria-label="Amount"
            className="bevel-in w-20 bg-me-void px-2 py-1.5 text-right font-dot text-[13px] tabular-nums text-me-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
          />
        </label>

        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-dot text-[11px] text-me-dim">of</span>
          <select
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            aria-label="Unit"
            className="bevel-in w-full bg-me-void px-2 py-1.5 text-[13px] text-me-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
          >
            {food.portions.map((portion) => (
              <option key={portion.id} value={portion.id}>
                {portion.label} ({gramsText(portion.grams)})
              </option>
            ))}
            <option value={GRAMS}>grams</option>
          </select>
        </label>
      </div>

      {/* The headline. Calories are why somebody is on this page, so they get
          the size and the gold; everything else is the table underneath. */}
      <div className="bevel-in bg-me-void px-3 py-2.5">
        {grams === null ? (
          <p className="text-[13px] text-me-live">That amount doesn&apos;t read as a number.</p>
        ) : (
          <>
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-dot text-[26px] leading-none text-me-gold tabular-nums">
                {kcal === null ? "—" : Math.round(kcal).toLocaleString("en-US")}
              </span>
              <span className="font-dot text-[13px] text-me-dim">
                {kcal === null ? "no calorie figure" : "calories"}
              </span>
              {grams > 0 ? (
                <span className="text-[12px] text-me-dim">in {gramsText(grams)}</span>
              ) : null}
            </p>

            {/* Said here rather than only in a tooltip: to somebody counting,
                'about 240' and '240' are different claims. */}
            {food.kcal_is_derived && kcal !== null ? (
              <p className="mt-1 text-[11px] leading-snug text-me-dim">
                Calculated from the macros (4/9/4) — USDA records this food
                without a calorie figure. Good to within a couple of percent.
              </p>
            ) : null}

            {/* Label ABOVE value, not beside it. Side by side with
                justify-between, one cell's number sits hard against the next
                cell's word and "23.6g Carbs" scans as a pair — and it is the
                same label-over-field shape every form on this site uses. */}
            <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-me-edge-lo pt-2 sm:grid-cols-4">
              {NUTRIENTS.filter((n) => n.key !== "kcal").map((n) => {
                const value = atGrams(food[n.key] as number | null, grams);
                return (
                  <div key={n.key}>
                    <dt className="font-dot text-[11px] leading-none text-me-dim">
                      {n.label}
                    </dt>
                    <dd
                      className={`mt-0.5 font-dot text-[14px] tabular-nums ${
                        value === null ? "text-me-dim" : "text-me-ink"
                      }`}
                    >
                      {nutrientText(value, n.unit)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </>
        )}
      </div>

      {/* Per 100 g stays reachable — it is the basis everything here is scaled
          from, and it is how two foods get compared. Just not the headline. */}
      <details className="text-[12px]">
        <summary className="cursor-pointer font-dot text-[11px] text-me-link hover:text-me-ink">
          per 100 g, as recorded
        </summary>
        <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
          {NUTRIENTS.map((n) => (
            <div key={n.key}>
              <dt className="font-dot text-[11px] leading-none text-me-dim">{n.label}</dt>
              <dd className="mt-0.5 font-dot text-[13px] tabular-nums text-me-ink">
                {nutrientText(food[n.key] as number | null, n.unit)}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
