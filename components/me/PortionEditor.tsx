"use client";

import { useActionState } from "react";
import { addPortion, deletePortion } from "@/app/actions/foods";
import { EMPTY, FIELD, Says, Submit } from "@/components/me/form-bits";
import { gramsText, type Portion } from "@/lib/meal-types";

/**
 * The portions a food can be counted in.
 *
 * Only editable on custom foods. USDA rows are a mirror — the importer replaces
 * their portions wholesale on every run — so a form offering to edit one would
 * be offering a change that silently reverts. Said out loud rather than shown
 * disabled, because a greyed control invites a click and explains nothing.
 */
export function PortionEditor({
  foodId,
  portions,
  editable,
}: {
  foodId: string;
  portions: Portion[];
  editable: boolean;
}) {
  const [addState, add] = useActionState(addPortion, EMPTY);
  const [removeState, remove] = useActionState(deletePortion, EMPTY);

  return (
    <div className="space-y-3">
      {portions.length ? (
        <ul className="text-[13px]">
          {portions.map((portion) => (
            <li
              key={portion.id}
              className="flex items-baseline justify-between gap-3 border-t border-me-edge-lo py-1.5 first:border-t-0"
            >
              <span className="min-w-0 flex-1 text-me-ink">{portion.label}</span>
              <span className="font-dot tabular-nums text-me-dim">
                {gramsText(portion.grams)}
              </span>
              {editable ? (
                <form action={remove}>
                  <input type="hidden" name="id" value={portion.id} />
                  <Submit
                    busy="…"
                    className="rounded-xs font-dot text-[11px] text-me-link underline underline-offset-2 hover:text-me-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
                  >
                    remove
                  </Submit>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] leading-relaxed text-me-ink">
          USDA records no household portions for this one, so it can only be
          counted in grams
          {editable ? " until you add one" : ""}.
        </p>
      )}

      {editable ? (
        <form action={add} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="food_id" value={foodId} />
          <label className="flex flex-col gap-1">
            <span className="font-dot text-[11px] text-me-dim">portion</span>
            <input name="label" placeholder="1 piece" className={`${FIELD} w-36`} required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-dot text-[11px] text-me-dim">weighs (g)</span>
            <input
              name="grams"
              inputMode="decimal"
              placeholder="21"
              className={`${FIELD} w-24 text-right font-dot tabular-nums`}
              required
            />
          </label>
          <Submit busy="adding…">add</Submit>
          <Says state={addState.error || addState.note ? addState : removeState} />
        </form>
      ) : (
        <p className="text-[12px] leading-relaxed text-me-dim">
          Portions come from USDA and are replaced on every import, so they
          aren&apos;t editable here. To record one of your own, add a custom food
          beside this one.
        </p>
      )}
    </div>
  );
}
