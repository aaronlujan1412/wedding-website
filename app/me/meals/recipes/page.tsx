import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Panel } from "@/components/me/Panel";
import { FullWidth } from "@/components/me/WithSidebar";
import { getRecipes } from "@/lib/meal-queries";
import { currentUser } from "@/lib/site-user";
import { WINDOW_LABEL, type Window } from "@/lib/meal-types";

export const metadata: Metadata = { title: "Dishes", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const KINDS = [
  ["dinner", "Dinners"],
  ["lunch", "Prep-ahead lunches"],
  ["snack", "Homemade snacks"],
  ["special", "Special occasion"],
] as const;

/** How urgently a dish wants cooking after its delivery, in the skin's inks. */
const WINDOW_INK: Record<Window, string> = {
  "day0-2": "text-[var(--me-phosphor)]",
  early: "text-me-ink",
  mid: "text-me-gold",
  any: "text-me-dim",
};

export default async function RecipesPage() {
  if (!(await currentUser())) redirect("/me/meals");
  const recipes = await getRecipes();

  return (
    <FullWidth>
      <Panel title="dishes">
        <p className="text-[13px] leading-relaxed text-me-ink">
          {recipes.length} in rotation. The window is the column that does the
          work: it says how long after a delivery the dish can still be cooked,
          which is what decides where it lands in the month.
        </p>
      </Panel>

      {KINDS.map(([kind, heading]) => {
        const mine = recipes.filter((r) => r.kind === kind);
        if (!mine.length) return null;

        return (
          <Panel key={kind} title={heading.toLowerCase()} bodyClassName="p-3">
            <div className="rail-scroll overflow-x-auto">
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
                  {mine.map((r) => (
                    <tr key={r.id} className="border-t border-me-edge-lo align-top">
                      <td className="py-1.5 pr-3 text-me-ink">
                        {r.name}
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
                      {/* A dish with no ingredients recorded cannot contribute to
                          a shopping list, so the gap is worth showing rather
                          than leaving as a silent zero. */}
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
          </Panel>
        );
      })}
    </FullWidth>
  );
}
