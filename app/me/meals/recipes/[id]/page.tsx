import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Panel } from "@/components/me/Panel";
import { RecipeForm } from "@/components/me/RecipeForm";
import { IngredientEditor } from "@/components/me/IngredientEditor";
import { FullWidth } from "@/components/me/WithSidebar";
import { getItemOptions, getRecipe } from "@/lib/meal-queries";
import { currentUser } from "@/lib/site-user";

export const metadata: Metadata = { title: "Dish", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await currentUser())) redirect("/me/meals");

  const { id } = await params;
  const [recipe, items] = await Promise.all([getRecipe(id), getItemOptions()]);
  if (!recipe) notFound();

  return (
    <FullWidth>
      <Panel title={recipe.name.toLowerCase()}>
        <Link
          href="/me/meals/recipes"
          className="text-[12px] text-me-link underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
        >
          <span aria-hidden className="text-me-gold">
            &laquo;
          </span>{" "}
          all dishes
        </Link>
      </Panel>

      <Panel title="what goes in it">
        <IngredientEditor recipe={recipe} items={items} />
      </Panel>

      <Panel title="the dish">
        <RecipeForm recipe={recipe} />
      </Panel>
    </FullWidth>
  );
}
