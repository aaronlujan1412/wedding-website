"use client";

import { useActionState } from "react";
import { saveRecipe } from "@/app/actions/meal-library";
import { Choice, EMPTY, Field, Says, Submit } from "@/components/me/form-bits";
import type { RecipeDetail } from "@/lib/meal-queries";

const KINDS = [
  ["dinner", "dinner"],
  ["lunch", "prep-ahead lunch"],
  ["snack", "homemade snack"],
  ["special", "special occasion"],
] as const;

/**
 * The window options, worded as what they let you do rather than as codes.
 * "day0-2" means nothing to someone adding a dish; "cook it within 2 days of
 * delivery" is the decision they are actually making.
 */
const WINDOWS = [
  ["day0-2", "within 2 days of delivery — won't wait"],
  ["early", "first week — needs fresh produce"],
  ["mid", "up to ~12 days"],
  ["any", "any time — frozen or hardy"],
] as const;

export function RecipeForm({ recipe }: { recipe?: RecipeDetail }) {
  const [state, save] = useActionState(saveRecipe, EMPTY);

  return (
    <form action={save} className="space-y-3">
      {recipe ? <input type="hidden" name="id" value={recipe.id} /> : null}

      <div className="flex flex-wrap gap-3">
        <Field label="dish" name="name" defaultValue={recipe?.name} width="w-full sm:w-80" />
        <Choice label="kind" name="kind" options={KINDS} defaultValue={recipe?.kind ?? "dinner"} width="w-48" />
        <Choice
          label="when it can be cooked"
          name="window_when"
          options={WINDOWS}
          defaultValue={recipe?.window_when ?? "any"}
          width="w-full sm:w-72"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Field label="serves" name="serves" defaultValue={recipe?.serves} width="w-24" />
        <Field label="kcal" name="kcal" defaultValue={recipe?.kcal} width="w-24" />
        <Field label="protein (g)" name="protein_g" defaultValue={recipe?.protein_g} width="w-28" />
        <Field label="method" name="method" defaultValue={recipe?.method} placeholder="Oven 425F" width="w-full sm:w-52" />
      </div>

      <Field label="note" name="notes" defaultValue={recipe?.notes} width="w-full" />

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-[12px] text-me-ink">
          <input
            type="checkbox"
            name="batch_friendly"
            defaultChecked={recipe?.batch_friendly}
            className="size-4 accent-[var(--color-me-gold)]"
          />
          doubles and freezes well
        </label>
        <Submit busy="saving…">{recipe ? "save the dish" : "add the dish"}</Submit>
      </div>

      <Says state={state} />
    </form>
  );
}
