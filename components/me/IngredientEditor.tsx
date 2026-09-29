"use client";

import { useActionState } from "react";
import { addIngredient, removeIngredient } from "@/app/actions/meal-library";
import { EMPTY, FIELD, Says, Submit } from "@/components/me/form-bits";
import { money } from "@/lib/meal-types";
import type { RecipeDetail } from "@/lib/meal-queries";

/**
 * What goes in a dish.
 *
 * The most consequential screen in the whole tool, and the least obviously so:
 * a dish with no ingredients can still be scheduled onto a Tuesday and will
 * contribute nothing to the shopping list, so you arrive at Tuesday with a plan
 * and no food. The empty state says that rather than saying "no ingredients".
 *
 * Quantity is optional on purpose. Most links were recovered from a month that
 * recorded which dish used an item, not how much, and a required field there
 * would have meant either inventing numbers or losing the links.
 */
export function IngredientEditor({
  recipe,
  items,
}: {
  recipe: RecipeDetail;
  items: { id: string; label: string }[];
}) {
  const [addState, add] = useActionState(addIngredient, EMPTY);
  const [removeState, remove] = useActionState(removeIngredient, EMPTY);

  const used = new Set(recipe.ingredients.map((i) => i.item_id));
  const available = items.filter((i) => !used.has(i.id));

  const priced = recipe.ingredients.filter((i) => i.price_cents !== null);
  const packTotal = priced.reduce((n, i) => n + (i.price_cents ?? 0), 0);

  return (
    <div className="space-y-4">
      {recipe.ingredients.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-me-live">
          Nothing in it yet. Until this dish has ingredients it can still be put
          on a night, but it adds nothing to the shopping list — so you&apos;d
          get to that night with no food for it.
        </p>
      ) : (
        <div className="rail-scroll overflow-x-auto">
          <table className="w-full min-w-[520px] text-[12px]">
            <thead>
              <tr className="text-me-dim">
                {["Item", "How much", "A pack costs", ""].map((h, i) => (
                  <th
                    key={h || "act"}
                    scope="col"
                    className={`pb-1.5 pr-3 font-dot text-[11px] font-normal ${
                      i === 2 ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recipe.ingredients.map((ing) => (
                <tr key={ing.item_id} className="border-t border-me-edge-lo align-middle">
                  <td className="py-1.5 pr-3 text-me-ink">
                    {ing.name}
                    {ing.optional ? (
                      <span className="ml-1.5 font-dot text-[10px] text-me-dim">optional</span>
                    ) : null}
                    {ing.pack ? (
                      <span className="mt-0.5 block text-[11px] text-me-dim">{ing.pack}</span>
                    ) : null}
                  </td>
                  <td className="py-1.5 pr-3 text-me-dim">
                    {ing.quantity ? `${ing.quantity}${ing.unit ? ` ${ing.unit}` : ""}` : "not recorded"}
                  </td>
                  <td className="py-1.5 pr-3 text-right font-dot tabular-nums text-me-dim">
                    {ing.price_cents === null ? "—" : money(ing.price_cents)}
                  </td>
                  <td className="py-1.5">
                    <form action={remove}>
                      <input type="hidden" name="recipe_id" value={recipe.id} />
                      <input type="hidden" name="item_id" value={ing.item_id} />
                      <Submit busy="…">remove</Submit>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {priced.length ? (
        <p className="text-[12px] leading-relaxed text-me-dim">
          A pack of each is {money(packTotal)} — most of which feeds several
          dinners, so this is not what the dish costs.
        </p>
      ) : null}

      <Says state={removeState} />

      <form action={add} className="flex flex-wrap items-end gap-3 border-t-2 border-me-edge-lo pt-3.5">
        <input type="hidden" name="recipe_id" value={recipe.id} />
        <label className="flex w-full flex-col gap-1 sm:w-80">
          <span className="font-dot text-[11px] text-me-dim">add an item</span>
          <select name="item_id" className={FIELD} defaultValue="">
            <option value="" disabled>
              pick one…
            </option>
            {available.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex w-24 flex-col gap-1">
          <span className="font-dot text-[11px] text-me-dim">how much</span>
          <input name="quantity" inputMode="decimal" placeholder="1.5" className={FIELD} />
        </label>

        <label className="flex w-24 flex-col gap-1">
          <span className="font-dot text-[11px] text-me-dim">unit</span>
          <input name="unit" placeholder="lb" className={FIELD} />
        </label>

        <label className="flex items-center gap-2 pb-2 text-[12px] text-me-ink">
          <input type="checkbox" name="optional" className="size-4 accent-[var(--color-me-gold)]" />
          optional
        </label>

        <Submit busy="adding…">add</Submit>
      </form>

      <Says state={addState} />

      {available.length === 0 ? (
        <p className="text-[12px] text-me-dim">
          Everything in the price book is already in this dish. Add a new item on
          the prices page first.
        </p>
      ) : null}
    </div>
  );
}
