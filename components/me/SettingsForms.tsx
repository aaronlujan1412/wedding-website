"use client";

import { useActionState } from "react";
import { saveRule, saveSettings, toggleRule } from "@/app/actions/meal-library";
import { EMPTY, Field, FIELD, Says, Submit } from "@/components/me/form-bits";
import type { MealSettings, Rule } from "@/lib/meal-queries";

export function SettingsForm({ settings }: { settings: MealSettings | null }) {
  const [state, save] = useActionState(saveSettings, EMPTY);

  return (
    <form action={save} className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <Field
          label="budget"
          name="budget"
          defaultValue={settings ? (settings.budget_cents / 100).toFixed(2) : "800.00"}
          width="w-28"
        />
        <Field
          label="deliveries a month"
          name="orders_per_month"
          defaultValue={settings?.orders_per_month ?? 2}
          width="w-36"
        />
        <Field label="Aaron, cal/day" name="aaron_kcal" defaultValue={settings?.aaron_kcal ?? 1900} width="w-32" />
        <Field label="Savea, cal/day" name="savea_kcal" defaultValue={settings?.savea_kcal ?? 1200} width="w-32" />
        <Field
          label="kid cycle (days)"
          name="kid_cycle_days"
          defaultValue={settings?.kid_cycle_days ?? 14}
          width="w-32"
        />
      </div>

      <label className="flex flex-col gap-1">
        <span className="font-dot text-[11px] text-me-dim">how the month runs</span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={settings?.notes ?? ""}
          className={`${FIELD} leading-relaxed`}
        />
      </label>

      <Submit busy="saving…">save the setup</Submit>
      <Says state={state} />
    </form>
  );
}

/**
 * A rule can be switched off but not deleted.
 *
 * Rules are the accumulated record of things that went wrong once — a dislike,
 * a food-safety step, someone's plate. Deleting one loses why it was there;
 * switching it off says it stopped applying.
 */
export function RuleList({ rules }: { rules: Rule[] }) {
  const [state, toggle] = useActionState(toggleRule, EMPTY);

  return (
    <div className="space-y-2">
      {rules.map((rule) => (
        <div
          key={rule.id}
          className={`bevel-in bg-me-void p-3 ${rule.active ? "" : "opacity-60"}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-dot text-[13px] leading-snug text-me-gold">{rule.label}</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-me-ink">{rule.detail}</p>
              {rule.forbidden_term ? (
                <p className="mt-1.5 font-dot text-[11px] text-me-dim">
                  never: {rule.forbidden_term}
                  {rule.applies_to ? ` (${rule.applies_to})` : ""}
                </p>
              ) : null}
            </div>
            <form action={toggle} className="shrink-0">
              <input type="hidden" name="id" value={rule.id} />
              <input type="hidden" name="active" value={rule.active ? "false" : "true"} />
              <Submit busy="…">{rule.active ? "switch off" : "switch on"}</Submit>
            </form>
          </div>
        </div>
      ))}
      <Says state={state} />
    </div>
  );
}

export function RuleForm() {
  const [state, save] = useActionState(saveRule, EMPTY);

  return (
    <form action={save} className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <Field label="rule" name="label" placeholder="No mushrooms" width="w-full sm:w-64" />
        <Field
          label="banned word (optional)"
          name="forbidden_term"
          placeholder="mushroom"
          width="w-44"
        />
        <Field label="whose (optional)" name="applies_to" placeholder="savea" width="w-36" />
      </div>
      <label className="flex flex-col gap-1">
        <span className="font-dot text-[11px] text-me-dim">what it means</span>
        <textarea name="detail" rows={2} className={`${FIELD} leading-relaxed`} />
      </label>
      <Submit busy="adding…">add the rule</Submit>
      <p className="text-[12px] leading-relaxed text-me-dim">
        A banned word is checked against every plan automatically. Leave it blank
        for anything only a person can judge.
      </p>
      <Says state={state} />
    </form>
  );
}
