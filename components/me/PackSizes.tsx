import Link from "next/link";
import { centsText, money, type FoodDetail } from "@/lib/meal-types";

/**
 * The same food, in every size you can buy it.
 *
 * WHY THIS IS THE FOOD'S PAGE AND NOT THE PRICE BOOK'S. A 3 lb bag and a 1 lb
 * bag have always been two price-book rows — the key is (name, store, pack) —
 * and that is right, because they are two different things to put in a basket
 * at two different prices. What they share is the food, so the food is where
 * they can finally be compared.
 *
 * The comparison is cost per 100 g, which is the only honest way to answer
 * "is the big bag better value": $6.99 against $4.00 says nothing until you
 * know one is three times the other. Rows nobody has weighed cannot join in
 * and say so, rather than being ranked on a number that does not exist.
 */
export function PackSizes({ packs }: { packs: FoodDetail["packs"] }) {
  const priced = packs
    .map((pack) => ({
      ...pack,
      per100g:
        pack.price_cents && pack.pack_grams && pack.pack_grams > 0
          ? (pack.price_cents / pack.pack_grams) * 100
          : null,
    }))
    .sort(
      (a, b) =>
        (a.per100g ?? Infinity) - (b.per100g ?? Infinity) ||
        a.name.localeCompare(b.name),
    );

  const best = priced.find((p) => p.per100g !== null);
  const comparable = priced.filter((p) => p.per100g !== null).length;

  return (
    <>
      <ul className="text-[13px]">
        {priced.map((pack) => {
          const cheapest = comparable > 1 && pack.id === best?.id;
          return (
            <li
              key={pack.id}
              className="flex flex-wrap items-baseline gap-x-2 border-t border-me-edge-lo py-1.5 first:border-t-0"
            >
              <span className="text-me-ink">{pack.name}</span>
              {pack.pack ? (
                <span className="text-[12px] text-me-dim">{pack.pack}</span>
              ) : null}
              {pack.store ? (
                <span className="font-dot text-[11px] text-me-dim">{pack.store}</span>
              ) : null}

              <span className="ml-auto flex items-baseline gap-3 font-dot text-[12px] tabular-nums">
                {pack.price_cents !== null ? (
                  <span className="text-me-dim">{money(pack.price_cents)}</span>
                ) : null}
                {pack.per100g !== null ? (
                  <span className={cheapest ? "text-me-gold" : "text-me-dim"}>
                    {centsText(pack.per100g)}/100g
                  </span>
                ) : (
                  <span className="text-me-dim">not weighed</span>
                )}
              </span>

              {cheapest ? (
                <span className="w-full font-dot text-[10px] text-me-gold">
                  best value of the {comparable} weighed
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      <p className="mt-2 text-[12px] leading-relaxed text-me-dim">
        {comparable > 1 ? (
          <>
            Compared by weight, which is the only way a bigger bag and a smaller
            one can be.{" "}
          </>
        ) : packs.length > 1 ? (
          <>
            Give these a weight on{" "}
            <Link
              href="/me/meals/prices"
              className="text-me-link underline underline-offset-2 hover:text-me-ink"
            >
              the price book
            </Link>{" "}
            and they can be compared by cost per 100 g.{" "}
          </>
        ) : null}
        Anything costed from these counts nutritionally too.
      </p>
    </>
  );
}
