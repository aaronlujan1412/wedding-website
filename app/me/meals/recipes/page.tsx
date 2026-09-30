import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Panel } from "@/components/me/Panel";
import { RecipeForm } from "@/components/me/RecipeForm";
import { DishBrowser } from "@/components/me/DishBrowser";
import { FullWidth } from "@/components/me/WithSidebar";
import { getRecipes } from "@/lib/meal-queries";
import { currentUser } from "@/lib/site-user";

export const metadata: Metadata = { title: "Dishes", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * The library, as one list you narrow.
 *
 * The page opened with a paragraph explaining what the Window column meant.
 * It is gone: the column is colour-coded and says "first 2 days" in words, so
 * the paragraph was explaining something the table already said, at the top of
 * every visit, to the one person who wrote it.
 */
export default async function RecipesPage() {
  if (!(await currentUser())) redirect("/me/meals");
  const recipes = await getRecipes();

  return (
    <FullWidth>
      <Panel title={`dishes — ${recipes.length}`} bodyClassName="p-3">
        <DishBrowser recipes={recipes} />
      </Panel>

      <Panel title="add a dish">
        <RecipeForm />
      </Panel>
    </FullWidth>
  );
}
