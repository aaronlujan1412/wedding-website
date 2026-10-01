import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Panel } from "@/components/me/Panel";
import { FullWidth } from "@/components/me/WithSidebar";
import { CustomFoodForm } from "@/components/me/CustomFoodForm";
import { countFoods, searchFoods, unidentifiedPacks } from "@/lib/food-queries";
import { currentUser } from "@/lib/site-user";
import { atGrams, gramsText, nutrientText, type FoodHit } from "@/lib/meal-types";

export const metadata: Metadata = {
  title: "Food lookup",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function FoodsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (!(await currentUser())) redirect("/me/meals");

  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const [counts, foods, unidentified] = await Promise.all([
    countFoods(),
    searchFoods(query, 40),
    unidentifiedPacks(),
  ]);

  const total = counts.usda + counts.custom;

  return (
    <FullWidth>
      <Panel title="food lookup">
        {/* A plain GET form: the query lives in the URL, so a lookup is
            linkable, the back button works, and this page stays a server
            component. Same reasoning as the notes search. */}
        <form action="/me/meals/foods" className="flex gap-2">
          <label htmlFor="q" className="sr-only">
            Search foods
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            autoFocus
            placeholder="chicken thigh, greek yogurt, olive oil…"
            className="bevel-in min-w-0 flex-1 bg-me-void px-2.5 py-2 text-[13px] text-me-ink placeholder:text-me-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
          />
          <button
            type="submit"
            className="bevel-out bg-me-bar px-4 py-2 font-dot text-[14px] leading-none text-me-ink hover:bg-me-edge-hi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold active:bevel-in"
          >
            look up
          </button>
        </form>

        <p className="mt-2.5 text-[12px] leading-relaxed text-me-dim">
          {total === 0 ? (
            <>Nothing mirrored yet — see below.</>
          ) : (
            <>
              {counts.usda.toLocaleString("en-US")} generic foods from USDA
              FoodData Central
              {counts.custom > 0 ? (
                <> and {counts.custom} typed in by hand</>
              ) : null}
              . Misspellings are fine.
            </>
          )}
        </p>
      </Panel>

      {total === 0 ? (
        <Panel title="the mirror is empty">
          <p className="text-[13px] leading-relaxed text-me-ink">
            The food database hasn&apos;t been imported yet. It needs a free
            FoodData Central key in <code className="font-mono">.env.local</code>{" "}
            as <code className="font-mono">USDA_API_KEY</code>, then:
          </p>
          <pre className="bevel-in mt-2 overflow-x-auto bg-me-void p-2.5 font-mono text-[11px] leading-relaxed text-me-ink">
            node --env-file=.env.local scripts/pull-usda-foods.mjs
          </pre>
          <p className="mt-2 text-[12px] leading-relaxed text-me-dim">
            About 450 requests and a few minutes. It&apos;s resumable — run it
            again if it stops.
          </p>
        </Panel>
      ) : (
        <Panel
          title={query ? `“${query}”` : "recently added"}
          bodyClassName={foods.length ? "p-0" : "p-3.5"}
        >
          {foods.length ? (
            <ul>
              {foods.map((food) => (
                <FoodRow key={food.id} food={food} />
              ))}
            </ul>
          ) : (
            <p className="text-[13px] leading-relaxed text-me-ink">
              Nothing matches that. USDA&apos;s generic datasets don&apos;t carry
              branded things — no Babybel, no Quest bars — so if that&apos;s what
              this is, add it below and it&apos;ll rank above the generic foods
              from then on.
            </p>
          )}
        </Panel>
      )}

      <Panel title="add a food by hand">
        <p className="mb-3 text-[12px] leading-relaxed text-me-dim">
          For something you eat but don&apos;t shop for — a restaurant dish, a
          takeaway. If it&apos;s a pack you buy, start from{" "}
          <Link
            href="/me/meals/prices"
            className="text-me-link underline underline-offset-2 hover:text-me-ink"
          >
            the price book
          </Link>{" "}
          instead and it carries the name across for you.
        </p>
        <CustomFoodForm />
      </Panel>

      {unidentified > 0 ? (
        <Panel title="the price book">
          <p className="text-[13px] leading-relaxed text-me-ink">
            {unidentified} {unidentified === 1 ? "pack has" : "packs have"} no
            food attached yet, so {unidentified === 1 ? "it counts" : "they count"}{" "}
            toward the budget and toward nothing nutritional.{" "}
            <Link
              href="/me/meals/prices"
              className="text-me-link underline underline-offset-2 hover:text-me-ink"
            >
              Identify them on the price book
            </Link>
            , where the &ldquo;no food yet&rdquo; chip hands you the list.
          </p>
        </Panel>
      ) : null}
    </FullWidth>
  );
}

/**
 * One result.
 *
 * Carries the headline numbers so a quick lookup needs no click at all, at BOTH
 * bases: per 100 g, and per the food's own most ordinary portion. The portion
 * is the one somebody wants and the 100 g is what lets two foods be compared,
 * so leaving either out sends half the readers to a second page.
 */
function FoodRow({ food }: { food: FoodHit }) {
  const grams = food.portion_grams;
  const kcal = food.kcal;

  return (
    <li className="border-t-2 border-me-edge-lo first:border-t-0">
      <Link
        href={`/me/meals/foods/${food.id}`}
        className="block px-3.5 py-2.5 hover:bg-me-bar focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-me-gold"
      >
        <p className="flex flex-wrap items-baseline gap-x-2 text-[13px] text-me-ink">
          <span>{food.description}</span>
          {food.source === "custom" ? (
            <span className="font-dot text-[10px] text-me-gold">yours</span>
          ) : null}
        </p>

        <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[12px] text-me-dim">
          <span className="font-dot tabular-nums">
            <span className="text-me-ink">{nutrientText(kcal, "")}</span> kcal
            {food.kcal_is_derived && kcal !== null ? "*" : ""} / 100 g
          </span>
          <span className="font-dot tabular-nums">
            {nutrientText(food.protein_g, "g")} protein
          </span>
          {grams !== null && food.portion_label ? (
            <span className="font-dot tabular-nums">
              · {food.portion_label} ({gramsText(grams)}) ={" "}
              <span className="text-me-ink">
                {nutrientText(atGrams(kcal, grams), "")}
              </span>{" "}
              kcal
            </span>
          ) : null}
        </p>
      </Link>
    </li>
  );
}
