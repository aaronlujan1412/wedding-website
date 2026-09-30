import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Panel } from "@/components/me/Panel";
import { RecipeForm } from "@/components/me/RecipeForm";
import { IngredientEditor } from "@/components/me/IngredientEditor";
import { DishMode } from "@/components/me/DishMode";
import { FullWidth } from "@/components/me/WithSidebar";
import { getItemOptions, getRecipe } from "@/lib/meal-queries";
import { currentUser } from "@/lib/site-user";

export const metadata: Metadata = { title: "Edit dish", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function EditDishPage({
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
        <DishMode id={recipe.id} mode="edit" />
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
