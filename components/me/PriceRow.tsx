"use client";

import { useActionState } from "react";
import { repriceItem } from "@/app/actions/meal-library";
import { EMPTY, FIELD, Submit } from "@/components/me/form-bits";

/**
 * A price you can change where you read it.
 *
 * Re-pricing is the thing this page is for — the book ages, its own header says
 * so — so it happens in the row rather than behind an edit screen. Every save
 * appends to the price history, which is what makes "has beef gone up?" a
 * question with an answer.
 */
export function PriceRow({
  id,
  priceCents,
}: {
  id: string;
  priceCents: number | null;
}) {
  const [state, reprice] = useActionState(repriceItem, EMPTY);

  return (
    <form action={reprice} className="flex items-center justify-end gap-1.5">
      <input type="hidden" name="id" value={id} />
      <span aria-hidden className="text-me-dim">
        $
      </span>
      <label className="sr-only" htmlFor={`price-${id}`}>
        Price
      </label>
      <input
        id={`price-${id}`}
        name="price"
        inputMode="decimal"
        defaultValue={priceCents === null ? "" : (priceCents / 100).toFixed(2)}
        className={`${FIELD} w-[5.5rem] text-right font-dot tabular-nums`}
      />
      <Submit busy="…">save</Submit>
      {state.error ? (
        <span className="text-[11px] text-me-live">{state.error}</span>
      ) : null}
    </form>
  );
}
