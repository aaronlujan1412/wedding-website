import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Panel, Well } from "@/components/me/Panel";
import { MonthGrid, FreshnessKey } from "@/components/me/MonthGrid";
import { PlanControls } from "@/components/me/PlanControls";
import { NewPlanForm } from "@/components/me/NewPlanForm";
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

  // The coverage problems, whose three fixes are all on this page.
  const warnings = (plan?.lines ?? []).filter((l) => l.coverage_warning);

  return (
    <FullWidth>
      {plan ? (
        <>
          <Panel title={plan.name.toLowerCase()}>
            <p className="text-[13px] leading-relaxed text-me-ink">
              Tap a day to set its dinner or say what kind of day it is. Both
              buttons rewrite things: placing the dinners replaces every night
              the scheduler can fill, and building the list rebuilds it from the
              calendar as it stands.
            </p>
            <div className="mt-3.5">
              <PlanControls planId={plan.id} />
            </div>
          </Panel>

          {warnings.length ? (
            <Panel title="won't keep that long">
              <p className="mb-3 text-[13px] leading-relaxed text-me-ink">
                These land on one delivery and are needed after they&apos;ve
                gone off. Move the dish, buy the item frozen, or put it on the
                later order — all three are things you do here, which is why
                this sits beside the calendar rather than on the month view.
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

          <Panel title="the calendar" bodyClassName="p-3">
            <MonthGrid
              days={plan.days}
              dinnerOptions={dinnerOptions}
              mode="plan"
              dayTypes={dayTypes}
            />
            <FreshnessKey />
          </Panel>
        </>
      ) : (
        <Panel title="start a month">
          <p className="mb-4 text-[13px] leading-relaxed text-me-ink">
            A plan is a date range, two delivery days, and a dinner on each
            weeknight — everything else is worked out from there.
          </p>
          <NewPlanForm />
        </Panel>
      )}

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
