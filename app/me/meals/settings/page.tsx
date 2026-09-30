import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Panel } from "@/components/me/Panel";
import { MonthGrid, FreshnessKey } from "@/components/me/MonthGrid";
import { RuleForm, RuleList, SettingsForm } from "@/components/me/SettingsForms";
import { FullWidth } from "@/components/me/WithSidebar";
import { getPlan, getRecipes, getRules, getSettings } from "@/lib/meal-queries";
import { currentUser } from "@/lib/site-user";

export const metadata: Metadata = { title: "Setup", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!(await currentUser())) redirect("/me/meals");
  const [settings, rules, plan, recipes] = await Promise.all([
    getSettings(),
    getRules(),
    getPlan(),
    getRecipes(),
  ]);

  const dinnerOptions = recipes
    .filter((r) => r.kind === "dinner" || r.kind === "special")
    .map((r) => ({ id: r.id, name: r.name }));

  // The kinds of day already in use this month, offered before anybody types a
  // new one — after the first week the answer is nearly always one of these.
  const dayTypes = [...new Set((plan?.days ?? []).flatMap((d) => d.tags))].sort();

  return (
    <FullWidth>
      {plan ? (
        <Panel title={`${plan.name.toLowerCase()} — the calendar`} bodyClassName="p-3">
          <p className="mb-2.5 text-[12px] leading-relaxed text-me-dim">
            Tap a day to set its dinner or say what kind of day it is. Rebuild
            the shopping list afterwards — the list is computed from these.
          </p>
          <MonthGrid
            days={plan.days}
            dinnerOptions={dinnerOptions}
            mode="plan"
            dayTypes={dayTypes}
          />
          <FreshnessKey />
        </Panel>
      ) : null}

      <Panel title="the standing setup">
        <p className="mb-3.5 text-[13px] leading-relaxed text-me-ink">
          What every new month starts from. Changing the budget here changes
          what the next plan is measured against; plans already made keep the
          budget they were made with.
        </p>
        <SettingsForm settings={settings} />
      </Panel>

      <Panel title="the rules">
        <p className="mb-3.5 text-[13px] leading-relaxed text-me-ink">
          Checked against every plan. The ones with a banned word are checked
          mechanically; the rest are for whoever is cooking.
        </p>
        <RuleList rules={rules} />
      </Panel>

      <Panel title="add a rule">
        <RuleForm />
      </Panel>
    </FullWidth>
  );
}
