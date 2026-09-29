"use client";

import { useActionState, useRef } from "react";
import { setDinner } from "@/app/actions/meal-library";
import { EMPTY } from "@/components/me/form-bits";

/**
 * Change what is for dinner, in the cell where you read it.
 *
 * Submits on change rather than behind a save button: there are twenty-two of
 * these on a month, and a grid of unsaved selects is a grid you lose work in.
 *
 * Deliberately styled as text until focused. The calendar's job is to be read
 * at a glance — the raised delivery days and the freshness of each date — and
 * twenty-two visible dropdowns would bury that under furniture. The control is
 * there when you go looking for it.
 */
export function DinnerPicker({
  dayId,
  current,
  options,
}: {
  dayId: string;
  current: string | null;
  options: { id: string; name: string }[];
}) {
  const [, change] = useActionState(setDinner, EMPTY);
  const form = useRef<HTMLFormElement>(null);

  return (
    <form action={change} ref={form}>
      <input type="hidden" name="day_id" value={dayId} />
      <label className="sr-only" htmlFor={`dinner-${dayId}`}>
        Dinner
      </label>
      <select
        id={`dinner-${dayId}`}
        name="dinner_recipe_id"
        defaultValue={current ?? ""}
        onChange={() => form.current?.requestSubmit()}
        className={`w-full cursor-pointer appearance-none bg-transparent text-[12px] leading-snug focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold ${
          current ? "text-me-ink" : "text-me-dim"
        }`}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </form>
  );
}
