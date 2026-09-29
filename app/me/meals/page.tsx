import type { Metadata } from "next";
import Link from "next/link";
import { Panel, Well } from "@/components/me/Panel";
import { MonthGrid, FreshnessKey } from "@/components/me/MonthGrid";
import { ShoppingList } from "@/components/me/ShoppingList";
import { PlanControls } from "@/components/me/PlanControls";
import { NewPlanForm } from "@/components/me/NewPlanForm";
import { FullWidth, WithSidebar } from "@/components/me/WithSidebar";
import { getPlan, getRecipes } from "@/lib/meal-queries";
import { currentUser } from "@/lib/site-user";

export const metadata: Metadata = {
  title: "Meals",
  description:
    "A month of dinners for two adults and a part-time kid, on $800, delivered twice.",
};

export const dynamic = "force-dynamic";

/**
 * One route, two faces, like every tool here.
 *
 * Branch first, fetch second: `getPlan` is only called once there is a session.
 * React 19's dev mode ships server-component props to the browser as debug
 * data, so fetching and then choosing not to render would put the whole plan in
 * a page nobody signed in to.
 */
export default async function MealsPage() {
  const user = await currentUser();
  if (!user) {
    return (
      <WithSidebar>
        <MealsCaseStudy />
      </WithSidebar>
    );
  }

  const [plan, recipes] = await Promise.all([getPlan(), getRecipes()]);

  if (!plan) {
    return (
      <FullWidth>
        <Panel title="meals">
          <p className="mb-4 text-[13px] leading-relaxed text-me-ink">
            No month planned yet. A plan is a date range, two delivery days, and
            a dinner on each weeknight — everything else is worked out from
            there.
          </p>
          <NewPlanForm />
        </Panel>
      </FullWidth>
    );
  }

  // Dinners only: a lunch or a snack in the dinner picker is a wrong answer
  // offered as if it were a right one.
  const dinnerOptions = recipes
    .filter((r) => r.kind === "dinner")
    .map((r) => ({ id: r.id, name: r.name }));

  const warnings = plan.lines.filter((l) => l.coverage_warning);
  const planned = plan.days.filter((d) => d.dinner).length;

  return (
    <FullWidth>
      <Panel title={plan.name.toLowerCase()}>
        <p className="text-[13px] leading-relaxed text-me-ink">
          {planned} {planned === 1 ? "dinner" : "dinners"} across{" "}
          {plan.days.length} days, on {plan.orders.length}{" "}
          {plan.orders.length === 1 ? "delivery" : "deliveries"}. The raised days
          are when the boxes land; the number on every other day is how long its
          food has been in the house.
        </p>
        <div className="mt-3.5">
          <PlanControls planId={plan.id} />
        </div>
      </Panel>

      <Panel title="the month" bodyClassName="p-3">
        <MonthGrid days={plan.days} dinnerOptions={dinnerOptions} />
        <FreshnessKey />
      </Panel>

      {warnings.length ? (
        <Panel title="won't keep that long">
          <p className="mb-3 text-[13px] leading-relaxed text-me-ink">
            These land on one delivery and are needed after they&apos;ve gone
            off. Move the dish, buy the item frozen, or put it on the later
            order.
          </p>
          <ul className="space-y-2">
            {warnings.map((line) => (
              <li key={line.id}>
                <Well>
                  <p className="text-[12px] leading-relaxed text-me-live">
                    {line.coverage_warning}
                  </p>
                  {line.used_for ? (
                    <p className="mt-1 text-[12px] text-me-dim">{line.used_for}</p>
                  ) : null}
                </Well>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel title="the shopping">
        <ShoppingList
          lines={plan.lines}
          orders={plan.orders}
          budgetCents={plan.budget_cents}
        />
      </Panel>
    </FullWidth>
  );
}

/** What this is, for someone who cannot sign in. */
function MealsCaseStudy() {
  return (
    <>
      <Panel title="meals">
        <div className="me-prose">
          <p>
            A month of dinners for two adults and a part-time kid, on an $800
            budget, arriving as two Instacart deliveries. The hard part is not
            choosing food — it is that everything comes twice a month and starts
            going off immediately.
          </p>
          <p>
            Planned by hand, that failed the same way every time: a dinner
            scheduled around produce delivered thirteen days earlier, and a
            shopping list priced from memory that came in{" "}
            <strong>75% over budget</strong> on its first pass.
          </p>
          <p>
            So the dishes, the ingredients and the prices are a database, and the
            list is computed rather than written. Pick a menu and the shopping
            falls out of it — deduplicated, priced, split across the two
            deliveries, and checked against how long each thing actually keeps.
          </p>
        </div>
      </Panel>

      <Panel title="what it works out">
        <ul className="space-y-3 text-[13px] leading-relaxed">
          {[
            ["Which dish can go on which night", "Every recipe records how far from a delivery it can sit. Eggplant gets the first two days; a frozen stir-fry can take day fourteen."],
            ["What to buy, once", "Three dinners sharing a pack of chicken thighs is one line, not three — the single biggest lever on the budget."],
            ["What won't survive", "Each line is checked against how long the item keeps. Avocados needed twelve days after delivery is caught before the order goes in, not in the fridge."],
          ].map(([title, detail]) => (
            <li key={title}>
              <p className="font-dot text-[13px] text-me-gold">{title}</p>
              <p className="mt-1 text-me-ink">{detail}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="the library">
        <p className="text-[13px] leading-relaxed text-me-ink">
          Seeded from three years of doing this by hand: 96 priced items, 35
          recipes, and the links between them recovered from a month that
          actually worked.
        </p>
        <Link
          href="/me/meals/recipes"
          className="mt-2 inline-block text-[13px] text-me-link underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
        >
          <span aria-hidden className="text-me-gold">
            &raquo;
          </span>{" "}
          browse the dishes
        </Link>
      </Panel>
    </>
  );
}
