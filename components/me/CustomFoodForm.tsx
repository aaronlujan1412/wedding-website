"use client";

import { useActionState, useState } from "react";
import { addCustomFood } from "@/app/actions/foods";
import { EMPTY, FIELD, Says, Submit } from "@/components/me/form-bits";
import { NUTRIENTS } from "@/lib/meal-types";

/**
 * A food off a packet.
 *
 * WHY IT ASKS WHAT THE NUMBERS ARE FOR. A packet does not print per 100 g — it
 * prints "per serving (30 g): 150 cal". Asking somebody to divide by 0.3 before
 * they can type it in is asking them to introduce exactly the arithmetic error
 * this whole feature exists to remove. So the form takes the numbers AS
 * PRINTED, plus what one serving weighs, and the server scales them once.
 *
 * Every nutrient is optional. A packet that only lists calories and protein is
 * still worth having, and a blank field stays unknown rather than becoming a
 * zero — the difference matters to whoever is counting.
 */
export function CustomFoodForm() {
  const [state, add] = useActionState(addCustomFood, EMPTY);
  const [basis, setBasis] = useState("serving");

  return (
    <form action={add} className="space-y-3">
      <div className="flex flex-wrap gap-2.5">
        <label className="flex w-full flex-col gap-1 sm:w-72">
          <span className="font-dot text-[11px] text-me-dim">food</span>
          <input name="description" placeholder="Babybel Light" className={FIELD} required />
        </label>
        <label className="flex w-full flex-col gap-1 sm:w-40">
          <span className="font-dot text-[11px] text-me-dim">category</span>
          <input name="category" placeholder="snack" className={FIELD} />
        </label>
      </div>

      {/* The basis first, because it changes what every number below means. */}
      <fieldset className="bevel-in bg-me-void p-2.5">
        <legend className="px-1 font-dot text-[11px] text-me-dim">
          the numbers below are
        </legend>

        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          {[
            ["serving", "per serving"],
            ["100g", "per 100 g"],
          ].map(([value, label]) => (
            <label key={value} className="flex items-center gap-1.5 text-[13px] text-me-ink">
              <input
                type="radio"
                name="basis"
                value={value}
                checked={basis === value}
                onChange={() => setBasis(value)}
                className="size-3.5 accent-[var(--color-me-gold)]"
              />
              {label}
            </label>
          ))}

          {basis === "serving" ? (
            <>
              <label className="flex flex-col gap-1">
                <span className="font-dot text-[11px] text-me-dim">one serving is</span>
                <div className="flex items-center gap-1.5">
                  <input
                    name="serving_grams"
                    inputMode="decimal"
                    placeholder="21"
                    className={`${FIELD} w-20 text-right font-dot tabular-nums`}
                    required
                  />
                  <span className="text-[12px] text-me-dim">g</span>
                </div>
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-dot text-[11px] text-me-dim">called</span>
                <input
                  name="serving_label"
                  placeholder="1 piece"
                  className={`${FIELD} w-32`}
                />
              </label>
            </>
          ) : null}
        </div>

        {basis === "serving" ? (
          <p className="mt-2 text-[11px] leading-relaxed text-me-dim">
            Copy the figures straight off the label. They&apos;re stored per 100 g
            and the serving is kept as a portion, so it&apos;s the default the
            next time you look this up.
          </p>
        ) : null}
      </fieldset>

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
              className={`${FIELD} text-right font-dot tabular-nums`}
            />
          </label>
        ))}
      </div>

      <label className="flex flex-col gap-1">
        <span className="font-dot text-[11px] text-me-dim">note</span>
        <input name="notes" placeholder="Costco 30-pack" className={FIELD} />
      </label>

      <div className="flex items-center gap-3">
        <Submit busy="adding…">add food</Submit>
        <Says state={state} />
      </div>
    </form>
  );
}
