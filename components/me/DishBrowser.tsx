"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { WINDOW_LABEL, type Recipe, type Window } from "@/lib/meal-types";

/**
 * Finding a dish among thirty-five.
 *
 * It used to be four tables under four headings — dinner, lunch, snack,
 * special — which are boxes decided before anyone had cooked from the library.
 * The questions actually asked of it cut across those: what is high protein,
 * what is quick tonight, what is light. So: ONE alphabetical list, narrowed by
 * chips.
 *
 * **The chips carry counts.** `high protein 9` says what clicking will leave
 * you with, so a filter never lands you on an empty table by surprise — which
 * is the one thing a filter row does that makes people stop trusting it.
 *
 * **Two kinds of chip, told apart by shape rather than a label.** Kind is a
 * bevelled button, the skin's word for "this is a control"; a tag is a quiet
 * outlined pill. Putting a heading over each row would have said the same thing
 * in more space.
 *
 * **Selected chips narrow together.** High protein AND quick is the question
 * somebody has; high protein OR quick is not.
 */

const KINDS: [string, string][] = [
  ["dinner", "dinners"],
  ["lunch", "lunches"],
  ["snack", "snacks"],
  ["special", "special"],
];

/** How urgently a dish wants cooking after its delivery, in the skin's inks. */
const WINDOW_INK: Record<Window, string> = {
  "day0-2": "text-[var(--me-phosphor)]",
  early: "text-me-ink",
  mid: "text-me-gold",
  any: "text-me-dim",
};

export function DishBrowser({ recipes }: { recipes: Recipe[] }) {
  const [kind, setKind] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of recipes) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [recipes]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return recipes.filter(
      (r) =>
        (!kind || r.kind === kind) &&
        picked.every((t) => r.tags.includes(t)) &&
        (!needle ||
          r.name.toLowerCase().includes(needle) ||
          (r.notes ?? "").toLowerCase().includes(needle)),
    );
  }, [recipes, kind, picked, query]);

  /*
   * Counts are of what you would get IF you clicked, not of the whole library —
   * so once "dinner" is on, "light 14" means fourteen light dinners. A count
   * that ignored the other chips would promise rows the click cannot deliver.
   */
  const wouldGive = (extra: { kind?: string; tag?: string }) =>
    recipes.filter(
      (r) =>
        (extra.kind ? r.kind === extra.kind : !kind || r.kind === kind) &&
        picked.every((t) => r.tags.includes(t)) &&
        (!extra.tag || r.tags.includes(extra.tag)),
    ).length;

  const filtering = kind !== null || picked.length > 0 || query.trim() !== "";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {KINDS.map(([value, label]) => {
          const on = kind === value;
          const n = wouldGive({ kind: value });
          return (
            <button
              key={value}
              type="button"
              aria-pressed={on}
              onClick={() => setKind(on ? null : value)}
              className={`bevel-out px-2.5 py-1.5 font-dot text-[12px] leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold active:bevel-in ${
                on ? "bg-me-edge-hi text-me-gold" : "bg-me-bar text-me-ink hover:bg-me-edge-hi"
              }`}
            >
              {label}{" "}
              <span className={`tabular-nums ${on ? "text-me-gold" : "text-me-dim"}`}>{n}</span>
            </button>
          );
        })}

        <label className="ml-auto flex items-center gap-1.5">
          <span className="sr-only">Search dishes</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            type="search"
            placeholder="souvlaki, crunchwrap…"
            className="bevel-in w-44 bg-me-void px-2 py-1.5 text-[12px] text-me-ink placeholder:text-me-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
          />
        </label>
      </div>

      {allTags.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {allTags.map(([tag, total]) => {
            const on = picked.includes(tag);
            const n = on ? total : wouldGive({ tag });
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={on}
                disabled={!on && n === 0}
                onClick={() =>
                  setPicked((current) =>
                    current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
                  )
                }
                className={`border px-2 py-1 font-dot text-[11px] leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold ${
                  on
                    ? "border-me-gold bg-me-gold/15 text-me-gold"
                    : n === 0
                      ? "border-me-edge-lo text-me-dim opacity-40"
                      : "border-me-edge-lo text-me-dim hover:border-me-edge-hi hover:text-me-ink"
                }`}
              >
                {tag} <span className="tabular-nums">{n}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-[12px] leading-relaxed text-me-dim">
          No categories yet. Open a dish and add one — high protein, quick,
          light, whatever you actually sort by — and it turns up here as a chip.
        </p>
      )}

      {filtering ? (
        <p className="flex flex-wrap items-baseline gap-2 text-[12px] text-me-dim">
          <span>
            {shown.length} of {recipes.length}
          </span>
          <button
            type="button"
            onClick={() => {
              setKind(null);
              setPicked([]);
              setQuery("");
            }}
            className="rounded-xs text-me-link underline underline-offset-2 hover:text-me-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
          >
            show all
          </button>
        </p>
      ) : null}

      <div className="rail-scroll relative overflow-x-auto">
        <table className="w-full min-w-[620px] text-[12px]">
          <thead>
            <tr className="text-me-dim">
              {["Dish", "Window", "Serves", "kcal", "Protein", "Ingredients"].map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  className={`pb-1.5 pr-3 font-dot text-[11px] font-normal ${
                    i > 1 ? "text-right" : "text-left"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-t border-me-edge-lo align-top">
                <td className="py-1.5 pr-3 text-me-ink">
                  <Link
                    href={`/me/meals/recipes/${r.id}`}
                    className="text-me-link underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
                  >
                    {r.name}
                  </Link>
                  {r.tags.length ? (
                    <span className="mt-0.5 block font-dot text-[10px] text-me-dim">
                      {r.tags.join("  ")}
                    </span>
                  ) : null}
                  {r.notes ? (
                    <span className="mt-0.5 block text-[11px] leading-snug text-me-dim">
                      {r.notes}
                    </span>
                  ) : null}
                </td>
                <td className={`py-1.5 pr-3 ${WINDOW_INK[r.window_when]}`}>
                  {WINDOW_LABEL[r.window_when]}
                </td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-me-dim">
                  {r.serves ?? "—"}
                </td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-me-dim">
                  {r.kcal ?? "—"}
                </td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-me-dim">
                  {r.protein_g ? `${r.protein_g}g` : "—"}
                </td>
                {/* A dish with no ingredients cannot contribute to a shopping
                    list, so the gap is worth showing rather than left as a
                    silent zero. */}
                <td
                  className={`py-1.5 text-right tabular-nums ${
                    r.ingredient_count ? "text-me-dim" : "text-me-live"
                  }`}
                >
                  {r.ingredient_count || "none yet"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!shown.length ? (
        <p className="text-[13px] leading-relaxed text-me-ink">
          Nothing matches all of that at once. Drop a chip, or{" "}
          <button
            type="button"
            onClick={() => {
              setKind(null);
              setPicked([]);
              setQuery("");
            }}
            className="rounded-xs text-me-link underline underline-offset-2 hover:text-me-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
          >
            start over
          </button>
          .
        </p>
      ) : null}
    </div>
  );
}
