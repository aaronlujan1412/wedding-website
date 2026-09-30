"use client";

import { useActionState, useMemo, useState } from "react";
import { addToTab, deleteExtrasTab } from "@/app/actions/meals";
import { EMPTY_MEAL, FIELD, Submit } from "@/components/me/form-bits";
import { money, type Item, type PlanOrder } from "@/lib/meal-types";

/**
 * Putting things on a tab you made.
 *
 * The price book is already the list of everything worth buying, so this picks
 * from it rather than offering a second place to type a snack's name and price
 * — two spellings of "Kettle chips" at two prices is exactly the drift the
 * database replaced.
 *
 * Optional-tier items come first because that is what a tab like this is for,
 * but everything is reachable: the search is over the whole book, since "the
 * snacks" is a habit rather than a rule and the day you want a second bag of
 * rice on a separate trip should not need a schema change.
 */
export function TabItems({
  order,
  items,
  onList,
}: {
  order: PlanOrder;
  items: Item[];
  /** Line ids already on this tab, so the picker can say so. */
  onList: string[];
}) {
  const [query, setQuery] = useState("");
  const [addState, add] = useActionState(addToTab, EMPTY_MEAL);
  const [removeState, remove] = useActionState(deleteExtrasTab, EMPTY_MEAL);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items
      .filter((i) => !needle || i.name.toLowerCase().includes(needle))
      .sort(
        (a, b) =>
          // What this tab is for, first — then alphabetical, which is a stable
          // and unique enough key that the order never shifts between renders.
          Number(a.tier !== "optional") - Number(b.tier !== "optional") ||
          a.name.localeCompare(b.name),
      )
      .slice(0, 24);
  }, [items, query]);

  return (
    <div className="mt-3 border-t-2 border-me-edge-lo pt-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-dot text-[13px] text-me-dim">add from the price book</h3>
        <form action={remove}>
          <input type="hidden" name="order_id" value={order.id} />
          <Submit
            busy="…"
            className="rounded-xs font-dot text-[11px] text-me-dim underline underline-offset-2 hover:text-me-live focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
          >
            delete this tab
          </Submit>
        </form>
      </div>

      {!onList.length ? (
        <p className="mt-1 text-[12px] leading-relaxed text-me-dim">
          Empty so far. Snacks and the nice-to-haves live here — anything marked
          optional stays out of the budget wherever you put it.
        </p>
      ) : null}

      <label className="sr-only" htmlFor={`pick-${order.id}`}>
        Search the price book
      </label>
      <input
        id={`pick-${order.id}`}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="kettle chips, quest, yasso…"
        className={`${FIELD} mt-2 w-full sm:w-72`}
      />

      <ul className="mt-2 flex flex-wrap gap-1.5">
        {shown.map((item) => (
          <li key={item.id}>
            {/* One form per item rather than a shared one with a hidden field:
                a form's submitter is what carries the value, and two buttons
                writing the same input is a race nobody can see. */}
            <form action={add}>
              <input type="hidden" name="order_id" value={order.id} />
              <input type="hidden" name="item_id" value={item.id} />
              <Submit
                busy="…"
                className="bevel-out bg-me-bar px-2 py-1 text-left font-dot text-[11px] leading-tight text-me-ink hover:bg-me-edge-hi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold active:bevel-in disabled:opacity-60"
              >
                + {item.name}
                {item.price_cents !== null ? (
                  <span className="ml-1 text-me-dim">{money(item.price_cents)}</span>
                ) : null}
              </Submit>
            </form>
          </li>
        ))}
      </ul>

      {!shown.length ? (
        <p className="mt-2 text-[12px] text-me-dim">
          Nothing in the price book matches that.
        </p>
      ) : null}

      {addState.error || addState.note || removeState.error ? (
        <p aria-live="polite" className="mt-2 text-[12px]">
          <span className={addState.error || removeState.error ? "text-me-live" : "text-me-dim"}>
            {addState.error ?? removeState.error ?? addState.note}
          </span>
        </p>
      ) : null}
    </div>
  );
}
