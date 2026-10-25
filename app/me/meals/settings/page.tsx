import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Panel, Well } from "@/components/me/Panel";
import { FreshnessKey } from "@/components/me/MonthGrid";
import { PlanCalendar } from "@/components/me/PlanCalendar";
import { PlanControls } from "@/components/me/PlanControls";
import { NEW_PLAN, PlanTabs } from "@/components/me/PlanTabs";
import { NewPlanForm } from "@/components/me/NewPlanForm";
import { RuleForm, RuleList, SettingsForm } from "@/components/me/SettingsForms";
import { FullWidth } from "@/components/me/WithSidebar";
import {
  getDayTypes,
  getPlan,
  getRecipes,
  getRules,
  getSettings,
  listPlans,
} from "@/lib/meal-queries";
import { currentUser } from "@/lib/site-user";

export const metadata: Metadata = { title: "Plan", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  if (!(await currentUser())) redirect("/me/meals");
  const [{ plan: wanted }, plans] = await Promise.all([searchParams, listPlans()]);

  // The month asked for, else the newest. Not "the one containing today" as
  // on This Month: this page is for planning, and the month being planned is
  // nearly always the latest one made.
  const starting = wanted === NEW_PLAN || !plans.length;
  const chosen = starting ? null : (plans.find((p) => p.id === wanted) ?? plans[0]);

  const [settings, rules, plan, recipes, dayTypes] = await Promise.all([
    getSettings(),
    getRules(),
    chosen ? getPlan(chosen.id) : null,
    getRecipes(),
    getDayTypes(),
  ]);

  const dinnerOptions = recipes
    .filter((r) => r.kind === "dinner" || r.kind === "special")
    .map((r) => ({ id: r.id, name: r.name }));

  // The coverage problems, whose three fixes are all on this page.
  const warnings = (plan?.lines ?? []).filter((l) => l.coverage_warning);

  return (
    <FullWidth>
      <PlanTabs plans={plans} current={plan?.id ?? NEW_PLAN} />

      {plan ? (
        <>
          <Panel title={plan.name.toLowerCase()}>
            <p className="text-[13px] leading-relaxed text-me-ink">
              Paint the days you need a dinner and what kind of day each one
              is, then place the dinners. Both buttons rewrite things: placing
              the dinners replaces the dish on every marked night the scheduler
              can fill, and building the list rebuilds it from the calendar as
              it stands.
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
            {/* Keyed on the month so the brush in hand doesn't follow you
                from one month into the next. */}
            <PlanCalendar
              key={plan.id}
              days={plan.days}
              dinnerOptions={dinnerOptions}
              dayTypes={dayTypes}
            />
            <FreshnessKey />
          </Panel>
        </>
      ) : (
        <Panel title="start a month">
          <p className="mb-4 text-[13px] leading-relaxed text-me-ink">
            Pick the dates and you get a blank calendar. Paint the days you need
            a dinner and what kind of day each one is, and the dishes and the
            shopping are worked out from there.
          </p>
          <NewPlanForm after={plans[0]?.ends_on ?? null} />
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
