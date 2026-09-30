import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Panel } from "@/components/me/Panel";
import { ItemForm } from "@/components/me/ItemForm";
import { PriceRow } from "@/components/me/PriceRow";
import { PackFood } from "@/components/me/PackFood";
import { FullWidth } from "@/components/me/WithSidebar";
import { getItems } from "@/lib/meal-queries";
import { currentUser } from "@/lib/site-user";
import { money } from "@/lib/meal-types";

export const metadata: Metadata = { title: "Prices", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PricesPage() {
  if (!(await currentUser())) redirect("/me/meals");
  const items = await getItems();

  const categories = [...new Set(items.map((i) => i.category ?? "other"))];
  const counted = items.filter((i) => i.tier !== "optional");
  const total = counted.reduce((n, i) => n + (i.price_cents ?? 0), 0);

  return (
    <FullWidth>
      <Panel title="prices">
        <p className="text-[13px] leading-relaxed text-me-ink">
          {items.length} things worth buying, at Costco and Sam&apos;s with the
          ~18% Instacart markup already in. One of everything counted would be{" "}
          {money(total)} — which is why a month is a selection, not a sweep.
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-me-dim">
          Keeps is the number the coverage check runs on. An item with no keeps
          recorded is never warned about, so a blank there is a gap rather than
          a permission.
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-me-dim">
          Under each name is which food is in the pack. That&apos;s what connects
          a price to nutrition — a pack nobody has identified counts toward the
          budget and toward nothing else.
        </p>
      </Panel>

      <Panel title="add an item">
        <ItemForm categories={categories} />
      </Panel>

      {categories.map((category) => {
        const mine = items.filter((i) => (i.category ?? "other") === category);
        return (
          <Panel key={category} title={category.replace("-", " ")} bodyClassName="p-3">
            <div className="rail-scroll overflow-x-auto">
              <table className="w-full min-w-[560px] text-[12px]">
                <thead>
                  <tr className="text-me-dim">
                    {["Item", "Pack", "Price", "Keeps", "Dishes"].map((h, i) => (
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
                  {mine.map((i) => (
                    <tr key={i.id} className="border-t border-me-edge-lo align-top">
                      <td className="py-1.5 pr-3 text-me-ink">
                        {i.name}
                        {i.tier !== "core" ? (
                          <span className="ml-1.5 font-dot text-[10px] text-me-dim">
                            {i.tier}
                          </span>
                        ) : null}
                        <PackFood
                          itemId={i.id}
                          itemName={i.name}
                          foodId={i.food_id}
                          foodDescription={i.food_description}
                        />
                      </td>
                      <td className="py-1.5 pr-3 text-me-dim">{i.pack ?? "—"}</td>
                      <td className="py-1.5 pr-3 text-right">
                        <PriceRow id={i.id} priceCents={i.price_cents} />
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-me-dim">
                        {i.keeps_days ? `${i.keeps_days}d` : "—"}
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-me-dim">
                        {i.used_by || "—"}
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
