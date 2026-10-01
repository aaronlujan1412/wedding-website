import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Panel } from "@/components/me/Panel";
import { CookView } from "@/components/me/CookView";
import { DishMode } from "@/components/me/DishMode";
import { FullWidth } from "@/components/me/WithSidebar";
import { getRecipe } from "@/lib/meal-queries";
import { currentUser } from "@/lib/site-user";

export const metadata: Metadata = { title: "Dish", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Cook mode, and the dish's own address.
 *
 * A dish is opened far more often to cook from than to change, so cooking is
 * what the bare URL does. Editing is a place you go on purpose.
 */
export default async function CookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await currentUser())) redirect("/me/meals");

  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  return (
    <FullWidth>
      <Panel title={recipe.name.toLowerCase()}>
        <DishMode id={recipe.id} mode="cook" />
        <div className="mt-3">
          <CookView recipe={recipe} />
        </div>
      </Panel>
    </FullWidth>
  );
}
