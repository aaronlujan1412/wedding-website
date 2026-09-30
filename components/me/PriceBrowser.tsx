"use client";

import { useMemo, useState } from "react";
import { PriceRow } from "@/components/me/PriceRow";
import { PackFood } from "@/components/me/PackFood";
import { centsText, packValue, type Item } from "@/lib/meal-types";

/**
 * The price book, as one list you narrow.
 *
 * **The chips are the gaps.** A category chip tells you where a thing is; a gap
 * chip tells you what needs doing — 46 packs with no food on them, the ones
 * with no price, the ones nobody has weighed. This page is maintained far more
 * than it is read, so the filter that earns its place is the one that hands you
 * the work. They carry live counts for the same reason the dish chips do: a
 * filter that can drop you on an empty table is one you stop trusting.
 *
 * **Every row shows what is in it.** Linking a pack to a food used to produce
 * nothing visible anywhere, which is precisely why the price book and the food
 * database read as two separate filing cabinets. The kcal and protein sit on
 * the row now, and where a pack has been weighed, so does what it costs per
 * 100 g and per gram of protein — the question a household on a budget that is
 * also counting protein actually asks, and the one neither table could answer
 * alone.
 */

type Sort = "name" | "price" | "per100g" | "protein";

const SORTS: [Sort, string][] = [
  ["name", "name"],
  ["price", "price"],
  ["per100g", "cost per 100g"],
  ["protein", "cost per g protein"],
];

export function PriceBrowser({ items }: { items: Item[] }) {
  const [category, setCategory] = useState<string | null>(null);
  const [gaps, setGaps] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("name");

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of items) {
      const key = i.category ?? "other";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.keys()].sort();
  }, [items]);

  /*
   * Each gap is a predicate, so the chip, its count and the filter are one
   * definition. Three copies of "what counts as missing a price" is three
   * chances for the count to disagree with the rows underneath it.
   */
  const GAPS: [string, string, (i: Item) => boolean][] = useMemo(
    () => [
      ["food", "no food yet", (i) => !i.food_id],
      ["price", "no price", (i) => i.price_cents === null],
      ["weight", "not weighed", (i) => i.pack_grams === null],
      ["keeps", "no keeps set", (i) => i.keeps_days === null],
      ["unused", "no dish uses it", (i) => i.used_by === 0],
    ],
    [],
  );

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (i: Item, skip?: string) =>
      (!category || (i.category ?? "other") === category) &&
      GAPS.every(([key, , test]) => key === skip || !gaps.includes(key) || test(i)) &&
      (!needle ||
        i.name.toLowerCase().includes(needle) ||
        (i.food_description ?? "").toLowerCase().includes(needle));
  }, [category, gaps, query, GAPS]);

  const shown = useMemo(() => {
    const list = items.filter((i) => matches(i));

    // Cheapest first on the money sorts: the question is always "which is the
    // best value", never "which is the most expensive". Rows that cannot
    // answer sink to the bottom rather than sorting as zero and taking the
    // top spot they have not earned.
    const rank = (i: Item) => {
      const { centsPer100g, centsPerProteinGram } = packValue(i);
      if (sort === "price") return i.price_cents ?? Infinity;
      if (sort === "per100g") return centsPer100g ?? Infinity;
      if (sort === "protein") return centsPerProteinGram ?? Infinity;
      return 0;
    };

    return list.sort(
      (a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name),
    );
  }, [items, matches, sort]);

  const filtering = category !== null || gaps.length > 0 || query.trim() !== "";
  const clear = () => {
    setCategory(null);
    setGaps([]);
    setQuery("");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {categories.map((value) => {
          const on = category === value;
          const n = items.filter(
            (i) => (i.category ?? "other") === value && matches(i),
          ).length;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={on}
              onClick={() => setCategory(on ? null : value)}
              className={`bevel-out px-2.5 py-1.5 font-dot text-[12px] leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold active:bevel-in ${
                on ? "bg-me-edge-hi text-me-gold" : "bg-me-bar text-me-ink hover:bg-me-edge-hi"
              }`}
            >
              {value.replace("-", " ")}{" "}
              <span className={`tabular-nums ${on ? "text-me-gold" : "text-me-dim"}`}>
                {on ? items.filter((i) => (i.category ?? "other") === value).length : n}
              </span>
            </button>
          );
        })}

        <label className="ml-auto flex items-center gap-1.5">
          <span className="sr-only">Search the price book</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            type="search"
            placeholder="chicken, babybel…"
            className="bevel-in w-44 bg-me-void px-2 py-1.5 text-[12px] text-me-ink placeholder:text-me-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {GAPS.map(([key, label, test]) => {
          const on = gaps.includes(key);
          const n = items.filter((i) => test(i) && matches(i, key)).length;
          if (!n && !on) return null;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() =>
                setGaps((current) =>
                  current.includes(key) ? current.filter((g) => g !== key) : [...current, key],
                )
              }
              className={`border px-2 py-1 font-dot text-[11px] leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold ${
                on
                  ? "border-me-gold bg-me-gold/15 text-me-gold"
                  : "border-me-edge-lo text-me-dim hover:border-me-edge-hi hover:text-me-ink"
              }`}
            >
              {label} <span className="tabular-nums">{n}</span>
            </button>
          );
        })}

        <label className="ml-auto flex items-center gap-1.5 text-[11px] text-me-dim">
          <span className="font-dot">cheapest by</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as Sort)}
            className="bevel-in bg-me-void px-1.5 py-1 font-dot text-[11px] text-me-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
          >
            {SORTS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtering ? (
        <p className="flex flex-wrap items-baseline gap-2 text-[12px] text-me-dim">
          <span>
            {shown.length} of {items.length}
          </span>
          <button
            type="button"
            onClick={clear}
            className="rounded-xs text-me-link underline underline-offset-2 hover:text-me-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
          >
            show all
          </button>
        </p>
      ) : null}

      <div className="rail-scroll relative overflow-x-auto">
        <table className="w-full min-w-[640px] text-[12px]">
          <thead>
            <tr className="text-me-dim">
              {["Item", "Pack", "Price", "Keeps", "Dishes"].map((h, i) => (
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
            {shown.map((item) => (
              <tr key={item.id} className="border-t border-me-edge-lo align-top">
                <td className="py-1.5 pr-3 text-me-ink">
                  {item.name}
                  {item.tier !== "core" ? (
                    <span className="ml-1.5 font-dot text-[10px] text-me-dim">{item.tier}</span>
                  ) : null}
                  <PackFood
                    itemId={item.id}
                    itemName={item.name}
                    foodId={item.food_id}
                    foodDescription={item.food_description}
                  />
                  <Nutrition item={item} />
                </td>
                <td className="py-1.5 pr-3 text-me-dim">
                  {item.pack ?? "—"}
                  {item.pack_grams ? (
                    <span className="block font-dot text-[10px] tabular-nums text-me-dim">
                      {Math.round(item.pack_grams).toLocaleString("en-US")} g
                    </span>
                  ) : null}
                </td>
                <td className="py-1.5 pr-3 text-right">
                  <PriceRow id={item.id} priceCents={item.price_cents} />
                </td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-me-dim">
                  {item.keeps_days ? `${item.keeps_days}d` : "—"}
                </td>
                <td
                  className={`py-1.5 text-right tabular-nums ${
                    item.used_by ? "text-me-dim" : "text-me-live"
                  }`}
                >
                  {item.used_by || "none"}
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
            onClick={clear}
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

/**
 * What is in the pack, and what that costs.
 *
 * Shown only where it is known. A pack with no food attached says nothing here
 * rather than a row of dashes — the gap chips above are where you go looking
 * for those, and repeating the absence on every row would be noise on the
 * forty-six that have it.
 */
function Nutrition({ item }: { item: Item }) {
  const { centsPer100g, centsPerProteinGram } = packValue(item);
  const hasFood = item.kcal_per_100g !== null || item.protein_per_100g !== null;
  if (!hasFood && centsPer100g === null) return null;

  return (
    <span className="mt-0.5 flex flex-wrap items-baseline gap-x-3 font-dot text-[10px] tabular-nums text-me-dim">
      {item.kcal_per_100g !== null ? (
        <span>{Math.round(item.kcal_per_100g)} kcal/100g</span>
      ) : null}
      {item.protein_per_100g !== null ? (
        <span>{Math.round(item.protein_per_100g * 10) / 10}g protein</span>
      ) : null}
      {centsPer100g !== null ? <span>{centsText(centsPer100g)}/100g</span> : null}
      {/* The one figure worth a colour: cheapest protein in the shop is the
          question this page was extended to answer. */}
      {centsPerProteinGram !== null ? (
        <span className="text-me-gold">
          {centsText(centsPerProteinGram)} per g protein
        </span>
      ) : null}
    </span>
  );
}
