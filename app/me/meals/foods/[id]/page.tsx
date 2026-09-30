import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Panel } from "@/components/me/Panel";
import { FullWidth } from "@/components/me/WithSidebar";
import { FoodPortion } from "@/components/me/FoodPortion";
import { PortionEditor } from "@/components/me/PortionEditor";
import { CustomFoodEditor } from "@/components/me/CustomFoodEditor";
import { PackSizes } from "@/components/me/PackSizes";
import { getFood } from "@/lib/food-queries";
import { currentUser } from "@/lib/site-user";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function FoodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await currentUser())) redirect("/me/meals");

  const { id } = await params;
  const food = await getFood(id);
  if (!food) notFound();

  return (
    <FullWidth>
      <Panel title={food.source === "custom" ? "your food" : "usda food"}>
        <h3 className="text-[15px] leading-snug text-me-ink">{food.description}</h3>

        <p className="mt-1 flex flex-wrap items-baseline gap-x-2.5 text-[12px] text-me-dim">
          {food.category ? <span>{food.category}</span> : null}
          {food.dataset ? (
            <span className="font-dot text-[11px]">{food.dataset}</span>
          ) : null}
          <Link
            href="/me/meals/foods"
            className="text-me-link underline underline-offset-2 hover:text-me-ink"
          >
            look up another
          </Link>
        </p>

        {food.notes ? (
          <p className="mt-2 text-[12px] leading-relaxed text-me-dim">{food.notes}</p>
        ) : null}

        <div className="mt-3">
          <FoodPortion food={food} />
        </div>
      </Panel>

      {food.source === "custom" ? (
        <Panel title="the numbers">
          <CustomFoodEditor food={food} />
        </Panel>
      ) : null}

      {/* Foundation and SR Legacy carry no portions for some foods, and every
          custom food starts with none. Saying so — and offering the fix in the
          same breath — beats a silent "grams" dropdown with one option. */}
      <Panel title="portions">
        <PortionEditor
          foodId={food.id}
          portions={food.portions}
          editable={food.source === "custom"}
        />
      </Panel>

      {food.packs.length ? (
        <Panel title={food.packs.length > 1 ? "the sizes it comes in" : "what you buy it as"}>
          <PackSizes packs={food.packs} />
        </Panel>
      ) : null}
    </FullWidth>
  );
}
