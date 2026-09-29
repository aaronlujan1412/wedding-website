import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Panel, Well } from "@/components/me/Panel";
import { FullWidth } from "@/components/me/WithSidebar";
import { getRules, getSettings } from "@/lib/meal-queries";
import { currentUser } from "@/lib/site-user";
import { money } from "@/lib/meal-types";

export const metadata: Metadata = { title: "Setup", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!(await currentUser())) redirect("/me/meals");
  const [settings, rules] = await Promise.all([getSettings(), getRules()]);

  return (
    <FullWidth>
      <Panel title="the standing setup">
        {settings ? (
          <dl className="space-y-2.5 text-[13px]">
            {[
              ["Budget", `${money(settings.budget_cents)} a month`],
              ["Deliveries", `${settings.orders_per_month} a month`],
              ["Aaron", `~${settings.aaron_kcal} cal a day`],
              ["Savea", `~${settings.savea_kcal} cal a day`],
              ["Daniel", `every ${settings.kid_cycle_days} days, Wednesday dinner through Saturday morning`],
            ].map(([field, value]) => (
              <div key={field} className="sm:flex sm:gap-4">
                <dt className="font-dot text-[12px] text-me-gold sm:w-28 sm:shrink-0">
                  {field}
                </dt>
                <dd className="text-me-ink">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-[13px] text-me-dim">Nothing set up yet.</p>
        )}
        {settings?.notes ? (
          <p className="mt-3 border-t-2 border-me-edge-lo pt-3 text-[12px] leading-relaxed text-me-dim">
            {settings.notes}
          </p>
        ) : null}
      </Panel>

      <Panel title="the rules">
        <p className="mb-3 text-[13px] leading-relaxed text-me-ink">
          Checked against every plan. The ones with a banned word are checked
          mechanically; the rest are for whoever is cooking.
        </p>
        <ul className="space-y-2">
          {rules.map((rule) => (
            <li key={rule.id}>
              <Well>
                <p className="font-dot text-[13px] leading-snug text-me-gold">
                  {rule.label}
                </p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-me-ink">
                  {rule.detail}
                </p>
                {rule.forbidden_term ? (
                  <p className="mt-1.5 font-dot text-[11px] text-me-dim">
                    never: {rule.forbidden_term}
                    {rule.applies_to ? ` (${rule.applies_to})` : ""}
                  </p>
                ) : null}
              </Well>
            </li>
          ))}
        </ul>
      </Panel>
    </FullWidth>
  );
}
