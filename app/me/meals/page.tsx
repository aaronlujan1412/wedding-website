import type { Metadata } from "next";
import Link from "next/link";
import { Panel } from "@/components/me/Panel";
import { MonthGrid, FreshnessKey } from "@/components/me/MonthGrid";
import { ShoppingList } from "@/components/me/ShoppingList";
import { FullWidth, WithSidebar } from "@/components/me/WithSidebar";
import { getItems, getPlan, getRecipes } from "@/lib/meal-queries";
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

  const [plan, recipes, items] = await Promise.all([getPlan(), getRecipes(), getItems()]);

  if (!plan) {
    return (
      <FullWidth>
        <Panel title="meals">
          <p className="text-[13px] leading-relaxed text-me-ink">
            No month planned yet. A plan is a date range, two delivery days, and
            a dinner on each weeknight — everything else is worked out from
            there.{" "}
            <Link
              href="/me/meals/settings"
              className="text-me-link underline underline-offset-2 hover:text-me-ink"
            >
              Start one on Plan
            </Link>
            .
          </p>
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
  // Deliveries, not tabs. `orders` now also carries the extras tabs somebody
  // made for snacks, and counting those here said "on 3 deliveries" about a
  // month with two boxes coming.
  const deliveries = plan.orders.filter((o) => o.kind === "delivery").length;

  return (
    <FullWidth>
      <Panel title={plan.name.toLowerCase()}>
        <p className="text-[13px] leading-relaxed text-me-ink">
          {planned} {planned === 1 ? "dinner" : "dinners"} across{" "}
          {plan.days.length} days, on {deliveries}{" "}
          {deliveries === 1 ? "delivery" : "deliveries"}. Today is the raised
          day; gold marks a box landing, and the number on every other day is
          how long its food has been in the house.
        </p>
        {/* Placing dinners and building the list are planning, and planning
            lives on Plan. This page is the quick view. */}
        <p className="mt-2 text-[12px] leading-relaxed text-me-dim">
          <Link
            href="/me/meals/settings"
            className="text-me-link underline underline-offset-2 hover:text-me-ink"
          >
            Change the month on Plan
          </Link>
          {warnings.length ? (
            <>
              {" "}— {warnings.length}{" "}
              {warnings.length === 1 ? "item won't keep" : "items won't keep"}{" "}
              long enough for the night that needs {warnings.length === 1 ? "it" : "them"}.
            </>
          ) : null}
        </p>
      </Panel>

      <Panel title="the month" bodyClassName="p-3">
        {/* Read-only here. Changing a month is a sit-down job and belongs on
            Plan; this page is opened mid-week to find out what is for dinner,
            usually on a phone, where a stray tap should never rewrite the
            plan. The dish title links into cook mode instead. */}
        <MonthGrid days={plan.days} dinnerOptions={dinnerOptions} mode="read" />
        <FreshnessKey />
      </Panel>

      <Panel title="the shopping">
        <ShoppingList
          planId={plan.id}
          lines={plan.lines}
          orders={plan.orders}
          items={items}
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
