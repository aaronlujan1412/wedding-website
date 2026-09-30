import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Panel } from "@/components/me/Panel";
import { ItemForm } from "@/components/me/ItemForm";
import { PriceBrowser } from "@/components/me/PriceBrowser";
import { FullWidth } from "@/components/me/WithSidebar";
import { getItems } from "@/lib/meal-queries";
import { currentUser } from "@/lib/site-user";
import { money } from "@/lib/meal-types";

export const metadata: Metadata = { title: "Prices", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * What you buy, what it costs, and what is in it.
 *
 * The page used to be one table per category under a paragraph about the
 * Instacart markup. It is one list narrowed by chips now — and the chips that
 * earn their place are the GAPS, because this page is maintained far more often
 * than it is read.
 */
export default async function PricesPage() {
  if (!(await currentUser())) redirect("/me/meals");
  const items = await getItems();

  const categories = [...new Set(items.map((i) => i.category ?? "other"))];
  const counted = items.filter((i) => i.tier !== "optional");
  const total = counted.reduce((n, i) => n + (i.price_cents ?? 0), 0);

  return (
    <FullWidth>
      <Panel title={`prices — ${items.length}`} bodyClassName="p-3">
        <PriceBrowser items={items} />
      </Panel>

      <Panel title="add an item">
        <ItemForm categories={categories} />
        <p className="mt-3 text-[12px] leading-relaxed text-me-dim">
          Prices carry the ~18% Instacart markup already. One of everything
          would be {money(total)}, which is why a month is a selection rather
          than a sweep.
        </p>
      </Panel>
    </FullWidth>
  );
}
