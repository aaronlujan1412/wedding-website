"use client";

import { useActionState } from "react";
import { deleteCustomFood, editCustomFood } from "@/app/actions/foods";
import { EMPTY, FIELD, Says, Submit } from "@/components/me/form-bits";
import { NUTRIENTS, type FoodDetail } from "@/lib/meal-types";

/**
 * Editing a food you typed in.
 *
 * Per 100 g, unlike the add form, which offers to scale from a serving. That
 * asymmetry is deliberate: adding happens with a packet in hand, so the numbers
 * arrive in the packet's units; editing happens later against what is stored,
 * and re-deriving a serving to show numbers back would mean two conversions
 * between the label and the database instead of one.
 *
 * USDA foods never reach this. They are a mirror — the importer replaces them
 * wholesale on its next run — so a form offering to change one would be
 * offering a change that silently reverts.
 */
export function CustomFoodEditor({ food }: { food: FoodDetail }) {
  const [state, save] = useActionState(editCustomFood, EMPTY);
  const [removeState, remove] = useActionState(deleteCustomFood, EMPTY);

  return (
    <div className="space-y-3">
      <form action={save} className="space-y-3">
        <input type="hidden" name="id" value={food.id} />

        <div className="flex flex-wrap gap-2.5">
          <label className="flex w-full flex-col gap-1 sm:w-72">
            <span className="font-dot text-[11px] text-me-dim">food</span>
            <input name="description" defaultValue={food.description} className={FIELD} required />
          </label>
          <label className="flex w-full flex-col gap-1 sm:w-40">
            <span className="font-dot text-[11px] text-me-dim">category</span>
            <input name="category" defaultValue={food.category ?? ""} className={FIELD} />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {NUTRIENTS.map((n) => (
            <label key={n.key} className="flex w-[8.5rem] flex-col gap-1">
              <span className="font-dot text-[11px] text-me-dim">
                {n.label}
                {n.unit ? ` (${n.unit})` : ""}
              </span>
              <input
                name={n.key}
                inputMode="decimal"
                defaultValue={food[n.key] === null ? "" : String(food[n.key])}
                className={`${FIELD} text-right font-dot tabular-nums`}
              />
            </label>
          ))}
        </div>
        <p className="text-[11px] leading-snug text-me-dim">
          All per 100 g. A blank stays unknown — it is not a zero, and the pages
          that read these draw the difference.
        </p>

        <label className="flex flex-col gap-1">
          <span className="font-dot text-[11px] text-me-dim">note</span>
          <input name="notes" defaultValue={food.notes ?? ""} className={FIELD} />
        </label>

        <div className="flex items-center gap-3">
          <Submit busy="saving…">save changes</Submit>
          <Says state={state} />
        </div>
      </form>

      <form action={remove} className="border-t-2 border-me-edge-lo pt-2.5">
        <input type="hidden" name="id" value={food.id} />
        <Submit
          busy="deleting…"
          className="rounded-xs font-dot text-[11px] text-me-dim underline underline-offset-2 hover:text-me-live focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
        >
          delete this food
        </Submit>
        {removeState.error ? (
          <span className="ml-2 text-[12px] text-me-live">{removeState.error}</span>
        ) : null}
        <p className="mt-1 text-[11px] leading-snug text-me-dim">
          Any pack pointing at it goes back to unidentified; the pack itself
          stays.
        </p>
      </form>
    </div>
  );
}
