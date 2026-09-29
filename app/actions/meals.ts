"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { currentUser } from "@/lib/site-user";

/**
 * Building a month.
 *
 * Every export of a "use server" module is a public POST endpoint, so each of
 * these re-checks the session itself. `proxy.ts` does not guard /me at all —
 * those pages render for everyone — which makes the check here the only thing
 * in front of the data.
 *
 * The real work is in Postgres (`schedule_meal_plan`, `generate_meal_plan_list`,
 * `fill_meal_plan_days`). These are the buttons on top of it.
 */

export type MealState = { error: string | null; note: string | null };

const DENIED: MealState = { error: "Not signed in.", note: null };
const ok = (note: string): MealState => ({ error: null, note });

function refresh() {
  revalidatePath("/me/meals", "layout");
}

/** Start a month: the range, two deliveries, and a day row for every date. */
export async function createPlan(
  _previous: MealState,
  formData: FormData,
): Promise<MealState> {
  if (!(await currentUser())) return DENIED;

  const name = String(formData.get("name") ?? "").trim();
  const starts_on = String(formData.get("starts_on") ?? "");
  const ends_on = String(formData.get("ends_on") ?? "");
  if (!name || !starts_on || !ends_on) return { error: "Name it and give it a range.", note: null };
  if (ends_on < starts_on) return { error: "The end date is before the start.", note: null };

  const settings = await supabase.from("meal_settings").select("budget_cents").maybeSingle();

  const { data: plan, error } = await supabase
    .from("meal_plans")
    .insert({
      name,
      starts_on,
      ends_on,
      budget_cents: settings.data?.budget_cents ?? 80000,
    })
    .select("id")
    .single();

  if (error || !plan) return { error: error?.message ?? "Couldn't create it.", note: null };

  /*
   * Two deliveries, splitting the range roughly in half — the standing setup.
   * Placed rather than asked for, because the dates are the obvious ones and a
   * form that makes you type them before you can see anything is a form you
   * abandon. Both are editable afterwards.
   */
  const start = new Date(`${starts_on}T00:00:00`);
  const end = new Date(`${ends_on}T00:00:00`);
  const midpoint = new Date((start.getTime() + end.getTime()) / 2);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  await supabase.from("meal_plan_orders").insert([
    { plan_id: plan.id, ordinal: 1, delivers_on: starts_on, store: "Costco" },
    { plan_id: plan.id, ordinal: 2, delivers_on: iso(midpoint), store: "Sam's Club" },
  ]);

  await supabase.rpc("fill_meal_plan_days", { p_plan: plan.id });

  refresh();
  return ok(`${name} created.`);
}

/** Place dinners against the delivery dates, respecting recipe windows. */
export async function schedulePlan(
  _previous: MealState,
  formData: FormData,
): Promise<MealState> {
  if (!(await currentUser())) return DENIED;

  const planId = String(formData.get("plan_id") ?? "");
  if (!planId) return { error: "No plan.", note: null };

  const { data, error } = await supabase.rpc("schedule_meal_plan", { p_plan: planId });
  if (error) return { error: error.message, note: null };

  const result = (data ?? {}) as { assigned?: number; unfilled?: number; distinct_dishes?: number };
  refresh();
  return ok(
    `${result.assigned ?? 0} dinners placed, ${result.distinct_dishes ?? 0} different dishes` +
      (result.unfilled ? `. ${result.unfilled} nights had nothing that fits — add dishes or widen a window.` : "."),
  );
}

/** Turn the calendar into a costed shopping list. */
export async function buildList(
  _previous: MealState,
  formData: FormData,
): Promise<MealState> {
  if (!(await currentUser())) return DENIED;

  const planId = String(formData.get("plan_id") ?? "");
  if (!planId) return { error: "No plan.", note: null };

  const { data, error } = await supabase.rpc("generate_meal_plan_list", { p_plan: planId });
  if (error) return { error: error.message, note: null };

  const result = (data ?? {}) as { lines?: number; warnings?: number; total_cents?: number };
  const total = ((result.total_cents ?? 0) / 100).toFixed(2);
  refresh();
  return ok(
    `${result.lines ?? 0} lines, $${total}` +
      (result.warnings
        ? `. ${result.warnings} ${result.warnings === 1 ? "item won't" : "items won't"} keep that long — see the list.`
        : "."),
  );
}
