"use client";

import { useActionState } from "react";
import { saveItem } from "@/app/actions/meal-library";
import { Choice, EMPTY, Field, Says, Submit } from "@/components/me/form-bits";

const TIERS = [
  ["core", "core — counts toward the budget"],
  ["pantry", "pantry — counts, but right-sized"],
  ["optional", "optional — not counted"],
] as const;

/**
 * Add something to the price book.
 *
 * "Keeps" is the field worth filling in even when it feels fussy: it is what
 * the coverage check runs on, and an item with no keeps recorded is never
 * warned about. Blank there is a gap, not a promise that it lasts forever.
 */
export function ItemForm({ categories }: { categories: string[] }) {
  const [state, save] = useActionState(saveItem, EMPTY);

  const categoryOptions = [
    ...categories.map((c) => [c, c.replace("-", " ")] as const),
    ["other", "other"] as const,
  ];

  return (
    <form action={save} className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <Field label="item" name="name" width="w-full sm:w-64" />
        <Field label="pack" name="pack" placeholder="10 lb bag" width="w-32" />
        <Field label="price" name="price" placeholder="12.99" width="w-24" />
        <Field label="keeps (days)" name="keeps_days" placeholder="14" width="w-28" />
        <Choice label="category" name="category" options={categoryOptions} width="w-40" />
        <Choice label="counts as" name="tier" options={TIERS} defaultValue="core" width="w-56" />
        <Field label="store" name="store" placeholder="Costco" width="w-32" />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="note" name="notes" width="w-full sm:w-96" />
        <Submit busy="adding…">add to the book</Submit>
      </div>
      <Says state={state} />
    </form>
  );
}
