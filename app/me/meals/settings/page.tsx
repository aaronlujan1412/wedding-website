import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Panel } from "@/components/me/Panel";
import { RuleForm, RuleList, SettingsForm } from "@/components/me/SettingsForms";
import { FullWidth } from "@/components/me/WithSidebar";
import { getRules, getSettings } from "@/lib/meal-queries";
import { currentUser } from "@/lib/site-user";

export const metadata: Metadata = { title: "Setup", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!(await currentUser())) redirect("/me/meals");
  const [settings, rules] = await Promise.all([getSettings(), getRules()]);

  return (
    <FullWidth>
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
