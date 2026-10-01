"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { createFoodFromPack, findFoods, setPackFood } from "@/app/actions/foods";
import { EMPTY, FIELD, Submit } from "@/components/me/form-bits";
import type { FoodHit } from "@/lib/meal-types";

/**
 * Which food is in this pack.
 *
 * This is the replacement for a fuzzy matcher writing nutrition onto the pack
 * row and hoping. A person picking from a list gets it right; when they don't,
 * it is one click to change, and it is visible rather than a number in a column
 * nobody can audit.
 *
 * Collapsed until asked. The price book's job is prices, and 96 open search
 * boxes would bury them — so an unidentified pack shows one quiet word, and the
 * search only exists once somebody means to use it.
 */
export function PackFood({
  itemId,
  itemName,
  foodId,
  foodDescription,
}: {
  itemId: string;
  itemName: string;
  foodId: string | null;
  foodDescription: string | null;
}) {
  const [open, setOpen] = useState(false);
  // Seeded with the pack's own name, because that is nearly always the search
  // somebody was about to type.
  const [query, setQuery] = useState(itemName);
  const [hits, setHits] = useState<FoodHit[] | null>(null);
  const [pending, start] = useTransition();

  function look() {
    start(async () => setHits(await findFoods(query)));
  }

  function choose(id: string | null) {
    start(async () => {
      const data = new FormData();
      data.set("item_id", itemId);
      if (id) data.set("food_id", id);
      await setPackFood({ error: null, note: null }, data);
      setOpen(false);
      setHits(null);
    });
  }

  if (!open) {
    return (
      <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-[11px]">
        {foodId && foodDescription ? (
          <>
            <Link
              href={`/me/meals/foods/${foodId}`}
              className="text-me-link underline underline-offset-2 hover:text-me-ink"
            >
              {foodDescription}
            </Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-xs font-dot text-me-dim underline underline-offset-2 hover:text-me-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
            >
              change
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-xs font-dot text-me-gold underline underline-offset-2 hover:text-me-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
          >
            identify
          </button>
        )}
      </p>
    );
  }

  return (
    <div className="mt-1 space-y-1.5">
      {/* Not a <form>: this sits inside the price table, whose own row already
          carries the re-pricing form, and nested forms are invalid HTML — the
          inner one silently never submits. Enter is wired up by hand instead. */}
      <div className="flex gap-1.5">
        <label className="sr-only" htmlFor={`food-q-${itemId}`}>
          Search foods for {itemName}
        </label>
        <input
          id={`food-q-${itemId}`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              look();
            }
            if (event.key === "Escape") setOpen(false);
          }}
          autoFocus
          className={`${FIELD} min-w-0 flex-1 !text-[12px]`}
        />
        <button
          type="button"
          onClick={look}
          disabled={pending}
          className="bevel-out bg-me-bar px-2 py-1 font-dot text-[11px] leading-none text-me-ink hover:bg-me-edge-hi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold active:bevel-in disabled:opacity-60"
        >
          {pending ? "…" : "find"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xs px-1 font-dot text-[11px] text-me-dim hover:text-me-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
        >
          cancel
        </button>
      </div>

      {hits === null ? null : hits.length ? (
        <ul className="bevel-in bg-me-void">
          {hits.map((hit) => (
            <li key={hit.id} className="border-t border-me-edge-lo first:border-t-0">
              <button
                type="button"
                onClick={() => choose(hit.id)}
                disabled={pending}
                className="block w-full px-2 py-1.5 text-left text-[12px] text-me-ink hover:bg-me-bar focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-me-gold"
              >
                {hit.description}
                <span className="ml-1.5 font-dot text-[10px] tabular-nums text-me-dim">
                  {hit.kcal === null ? "no kcal" : `${Math.round(hit.kcal)} kcal`}/100g
                  {hit.source === "custom" ? " · yours" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <MakeFood itemId={itemId} itemName={itemName} />
      )}

      {foodId ? (
        <button
          type="button"
          onClick={() => choose(null)}
          disabled={pending}
          className="rounded-xs font-dot text-[11px] text-me-dim underline underline-offset-2 hover:text-me-live focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
        >
          nobody knows — clear it
        </button>
      ) : null}
    </div>
  );
}

/**
 * The escape hatch, and the reason the price book and the food database stopped
 * feeling like two filing cabinets.
 *
 * USDA's generic datasets carry no branded food, so searching them for "Babybel
 * Light" will never work however the query is spelled. Rather than sending
 * somebody to the other tab to retype a name they have already typed here, this
 * makes the food from the pack, links the two, and lands on the one form where
 * the label's numbers go.
 */
function MakeFood({ itemId, itemName }: { itemId: string; itemName: string }) {
  const [state, make] = useActionState(createFoodFromPack, EMPTY);

  return (
    <div className="text-[11px] leading-snug text-me-dim">
      <p>Nothing in USDA matches — branded food isn&apos;t in its generic datasets.</p>
      <form action={make} className="mt-1">
        <input type="hidden" name="item_id" value={itemId} />
        <Submit
          busy="making…"
          className="rounded-xs font-dot text-me-link underline underline-offset-2 hover:text-me-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
        >
          Make &ldquo;{itemName}&rdquo; a food of its own
        </Submit>
      </form>
      {state.error ? <p className="mt-1 text-me-live">{state.error}</p> : null}
    </div>
  );
}
