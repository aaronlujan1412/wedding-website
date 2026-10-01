"use client";

import { useActionState } from "react";
import { setIngredientAmount } from "@/app/actions/meal-library";
import { EMPTY, FIELD, Submit } from "@/components/me/form-bits";
import { UNIT_OPTIONS, weightText } from "@/lib/meal-units";
import type { Leftover } from "@/lib/meal-queries";

/**
 * What the month buys minus what it cooks.
 *
 * THIS PAGE IS ALSO WHERE THE GAPS GET FILLED, and that is the whole design.
 * A surplus is only as true as the amounts underneath it, and those were
 * recorded on two ingredient links out of a hundred and one — so a leftovers
 * page that only reported would have said "you have all of everything left",
 * which is worse than saying nothing. The rows that cannot be counted are the
 * rows you need to type into, so the typing happens here rather than on a
 * second screen somebody has to be told about.
 *
 * Amounts are never guessed. A use with no amount, or one in cloves or cups,
 * counts as zero used and says so — the figure beside it is a floor, and the
 * page says the word.
 */
export function Leftovers({ rows }: { rows: Leftover[] }) {
  const counted = rows.filter((r) => r.uncounted === 0);
  const partial = rows.filter((r) => r.uncounted > 0);

  if (!rows.length) {
    return (
      <p className="text-[13px] leading-relaxed text-me-ink">
        Nothing to work out yet — this month has no dinners on the calendar, so
        nothing is using anything.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[13px] leading-relaxed text-me-ink">
        What the month buys, minus what its dishes use.{" "}
        {partial.length ? (
          <>
            {partial.length} of {rows.length}{" "}
            {partial.length === 1 ? "item has a use" : "items have uses"} with no
            amount recorded, so {partial.length === 1 ? "its" : "their"} leftover
            is a ceiling rather than a figure. Fill them in below and it becomes
            real.
          </>
        ) : (
          <>Every use has an amount, so these are the real numbers.</>
        )}
      </p>

      {partial.length ? (
        <section>
          <h3 className="border-b-2 border-me-edge-lo pb-1.5 font-dot text-[13px] text-me-gold">
            needs an amount
          </h3>
          <ul>
            {partial.map((row) => (
              <Row key={row.item_id} row={row} />
            ))}
          </ul>
        </section>
      ) : null}

      {counted.length ? (
        <section>
          <h3 className="border-b-2 border-me-edge-lo pb-1.5 font-dot text-[13px] text-me-gold">
            what&apos;s left over
          </h3>
          <ul>
            {counted.map((row) => (
              <Row key={row.item_id} row={row} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Row({ row }: { row: Leftover }) {
  const left =
    row.grams_bought === null ? null : row.grams_bought - row.grams_used;
  const packsLeft =
    left !== null && row.pack_grams ? left / row.pack_grams : null;

  return (
    <li className="border-t border-me-edge-lo py-2.5 first:border-t-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-[13px] text-me-ink">
          {row.name}
          {row.pack ? (
            <span className="ml-2 text-[12px] text-me-dim">{row.pack}</span>
          ) : null}
        </span>

        <span className="flex items-baseline gap-3 font-dot text-[12px] tabular-nums">
          <span className="text-me-dim">
            {row.packs_bought}× bought
            {row.grams_bought !== null ? ` (${weightText(row.grams_bought)})` : ""}
          </span>
          <span className="text-me-dim">{weightText(row.grams_used)} used</span>
          {left === null ? (
            <span className="text-me-dim">not weighed</span>
          ) : (
            <span className={left < 0 ? "text-me-live" : "text-me-gold"}>
              {left < 0 ? `${weightText(-left)} short` : `${weightText(left)} left`}
            </span>
          )}
        </span>
      </div>

      {/* What to do with the surplus, which is the reason anybody opened this.
          Said only where all three facts are known. */}
      {packsLeft !== null && packsLeft > 0.15 && row.keeps_days ? (
        <p className="mt-0.5 text-[11px] leading-snug text-me-dim">
          {Math.round(packsLeft * 100)}% of a pack spare — it keeps about{" "}
          {row.keeps_days} days, so {row.keeps_days <= 7 ? "freeze it or " : ""}
          plan something else around it.
        </p>
      ) : null}

      {row.grams_bought === null ? (
        <p className="mt-0.5 text-[11px] leading-snug text-me-dim">
          Give this pack a weight on the price book and its leftover can be
          worked out.
        </p>
      ) : null}

      <ul className="mt-1.5 space-y-1">
        {row.uses.map((use) => (
          <Use key={`${use.recipe_id}-${row.item_id}`} row={row} use={use} />
        ))}
      </ul>
    </li>
  );
}

function Use({ row, use }: { row: Leftover; use: Leftover["uses"][number] }) {
  const [state, save] = useActionState(setIngredientAmount, EMPTY);

  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
      <span className="min-w-0 flex-1 text-me-dim">
        {use.recipe}
        {use.times > 1 ? (
          <span className="ml-1.5 font-dot text-[11px] text-me-gold">
            ×{use.times}
          </span>
        ) : null}
      </span>

      {use.grams !== null ? (
        <span className="font-dot text-[11px] tabular-nums text-me-dim">
          {weightText(use.grams)}
        </span>
      ) : null}

      {/* The form is on every use, not only the blank ones: correcting a wrong
          amount is the same gesture as filling a missing one, and hiding it
          behind an edit toggle would make the common case two clicks. */}
      <form action={save} className="flex items-center gap-1">
        <input type="hidden" name="recipe_id" value={use.recipe_id} />
        <input type="hidden" name="item_id" value={row.item_id} />
        <label className="sr-only" htmlFor={`q-${use.recipe_id}-${row.item_id}`}>
          Amount of {row.name} in {use.recipe}
        </label>
        <input
          id={`q-${use.recipe_id}-${row.item_id}`}
          name="quantity"
          inputMode="decimal"
          defaultValue={use.quantity ?? ""}
          placeholder="1.5"
          className={`${FIELD} w-16 text-right font-dot !text-[11px] tabular-nums`}
        />
        <label className="sr-only" htmlFor={`u-${use.recipe_id}-${row.item_id}`}>
          Unit
        </label>
        <select
          id={`u-${use.recipe_id}-${row.item_id}`}
          name="unit"
          defaultValue={use.unit ?? "lb"}
          className={`${FIELD} !text-[11px]`}
        >
          {UNIT_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Submit
          busy="…"
          className="rounded-xs px-1 font-dot text-[11px] text-me-link underline underline-offset-2 hover:text-me-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
        >
          set
        </Submit>
        {state.error ? <span className="text-[11px] text-me-live">{state.error}</span> : null}
      </form>
    </li>
  );
}
