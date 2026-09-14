"use client";

import { cn } from "@/lib/utils";
import { useRate } from "./RateContext";
import { CURRENCIES, formatCostConverted, parseCostInput } from "./trip";
import type { Currency } from "./types";

/**
 * A price in whichever currency it was quoted in.
 *
 * The toggle changes what the number means, never the number itself: flipping
 * "9300" from ¥ to $ doesn't convert it to 60, because the person typing was
 * reading it off a page in one currency and just picked the wrong button.
 */
export function CostField({
  value,
  currency,
  onValueChange,
  onCurrencyChange,
}: {
  value: string;
  currency: Currency;
  onValueChange: (value: string) => void;
  onCurrencyChange: (currency: Currency) => void;
}) {
  const rate = useRate();
  const amount = parseCostInput(value, currency);
  const unreadable = value.trim() !== "" && amount === null;

  return (
    <div>
      <div className="flex">
        <div
          role="radiogroup"
          aria-label="Currency"
          className="flex overflow-hidden rounded-l-md border border-r-0 border-input"
        >
          {(Object.keys(CURRENCIES) as Currency[]).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={currency === c}
              aria-label={CURRENCIES[c].label}
              onClick={() => onCurrencyChange(c)}
              className={cn(
                "w-9 font-mono text-sm transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
                currency === c
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-primary",
              )}
            >
              {CURRENCIES[c].symbol}
            </button>
          ))}
        </div>
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={currency === "JPY" ? "9300" : "60.00"}
          aria-invalid={unreadable || undefined}
          className="h-9 w-full min-w-0 rounded-r-md border border-input bg-background px-3 font-mono text-sm tabular-nums text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
        />
      </div>
      <p
        className={cn(
          "mt-1 font-mono text-[0.65rem] tabular-nums",
          unreadable ? "text-destructive" : "text-muted-foreground",
        )}
        aria-live="polite"
      >
        {unreadable
          ? "That isn't a number."
          : amount !== null
            ? formatCostConverted(
                { cost_amount: amount, cost_currency: currency },
                rate,
              )
            : " "}
      </p>
    </div>
  );
}
