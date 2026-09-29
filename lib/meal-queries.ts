import "server-only";

import { supabase } from "./supabase";
import { currentUser } from "./site-user";
import type { Item, Plan, PlanDay, PlanLine, Recipe, Window } from "./meal-types";

/**
 * Reads of the meal library and the plans.
 *
 * Deliberately NOT in a `"use server"` module, for the same reason as
 * `brain-queries.ts`: every export of one becomes a public POST endpoint, and
 * these pages render for signed-out visitors too. Each function checks the
 * session itself, so a page cannot leak by forgetting to.
 */

export type MealSettings = {
  budget_cents: number;
  orders_per_month: number;
  aaron_kcal: number;
  savea_kcal: number;
  kid_cycle_anchor: string | null;
  kid_cycle_days: number;
  notes: string | null;
};

export type Rule = {
  id: string;
  label: string;
  detail: string;
  forbidden_term: string | null;
  applies_to: string | null;
  active: boolean;
};

export async function getSettings(): Promise<MealSettings | null> {
  if (!(await currentUser())) return null;
  const { data, error } = await supabase.from("meal_settings").select("*").maybeSingle();
  if (error || !data) return null;
  return data as MealSettings;
}

export async function getRules(): Promise<Rule[]> {
  if (!(await currentUser())) return [];
  const { data, error } = await supabase
    .from("meal_rules")
    .select("id, label, detail, forbidden_term, applies_to, active")
    .order("sort_order");
  if (error || !data) return [];
  return data as Rule[];
}

/** The dish library, with how many ingredients each one has recorded. */
export async function getRecipes(): Promise<Recipe[]> {
  if (!(await currentUser())) return [];

  const [recipes, links] = await Promise.all([
    supabase
      .from("meal_recipes")
      .select("id, name, kind, serves, kcal, protein_g, method, window_when, notes, batch_friendly")
      .eq("retired", false)
      .order("kind")
      .order("name"),
    supabase.from("meal_recipe_items").select("recipe_id"),
  ]);

  if (recipes.error || !recipes.data) return [];

  const counts = new Map<string, number>();
  for (const row of links.data ?? []) {
    counts.set(row.recipe_id, (counts.get(row.recipe_id) ?? 0) + 1);
  }

  return recipes.data.map((r) => ({
    ...r,
    window_when: r.window_when as Window,
    ingredient_count: counts.get(r.id) ?? 0,
  })) as Recipe[];
}

/** The price book, with how many dishes use each item. */
export async function getItems(): Promise<Item[]> {
  if (!(await currentUser())) return [];

  const [items, links] = await Promise.all([
    supabase
      .from("meal_items")
      .select("id, name, pack, category, tier, price_cents, keeps_days, notes")
      .order("category")
      .order("name"),
    supabase.from("meal_recipe_items").select("item_id"),
  ]);

  if (items.error || !items.data) return [];

  const counts = new Map<string, number>();
  for (const row of links.data ?? []) {
    counts.set(row.item_id, (counts.get(row.item_id) ?? 0) + 1);
  }

  return items.data.map((i) => ({
    ...i,
    used_by: counts.get(i.id) ?? 0,
  })) as Item[];
}

export async function listPlans() {
  if (!(await currentUser())) return [];
  const { data, error } = await supabase
    .from("meal_plans")
    .select("id, name, starts_on, ends_on, budget_cents, status")
    .order("starts_on", { ascending: false });
  if (error || !data) return [];
  return data;
}

/**
 * One plan, whole: calendar, deliveries and the costed list.
 *
 * `days_out` is computed here rather than stored, because it is a function of
 * two things that both move while a plan is a draft — the day and its supplying
 * delivery. A stored copy would be wrong the moment an order date shifted, and
 * wrong quietly.
 */
export async function getPlan(id?: string): Promise<Plan | null> {
  if (!(await currentUser())) return null;

  const plans = await supabase
    .from("meal_plans")
    .select("id, name, starts_on, ends_on, budget_cents, status")
    .order("starts_on", { ascending: false });

  if (plans.error || !plans.data?.length) return null;
  const plan = id ? plans.data.find((p) => p.id === id) : plans.data[0];
  if (!plan) return null;

  const [orders, days, lines] = await Promise.all([
    supabase
      .from("meal_plan_orders")
      .select("id, ordinal, delivers_on, store")
      .eq("plan_id", plan.id)
      .order("delivers_on"),
    supabase
      .from("meal_plan_days")
      .select(
        "id, on_date, kid_here, prep_day, notes, dinner:dinner_recipe_id (name, window_when), lunch:lunch_recipe_id (name)",
      )
      .eq("plan_id", plan.id)
      .order("on_date"),
    supabase
      .from("meal_plan_items")
      .select(
        "id, quantity, unit_price_cents, tier, used_for, coverage_warning, quantity_is_a_guess, item:item_id (name, pack), order:order_id (ordinal)",
      )
      .eq("plan_id", plan.id),
  ]);

  const orderList = (orders.data ?? []).map((o) => ({
    id: o.id,
    ordinal: o.ordinal,
    delivers_on: o.delivers_on,
    store: o.store,
  }));

  const dayList: PlanDay[] = (days.data ?? []).map((d) => {
    // The last delivery on or before this day. Before the first one, there is
    // no supplier yet — shown as such rather than as day 0 of something.
    const supplying = [...orderList]
      .reverse()
      .find((o) => o.delivers_on <= d.on_date);
    const delivery = orderList.find((o) => o.delivers_on === d.on_date);

    const dinner = d.dinner as unknown as { name: string; window_when: string } | null;
    const lunch = d.lunch as unknown as { name: string } | null;

    return {
      id: d.id,
      on_date: d.on_date,
      dinner: dinner?.name ?? null,
      dinner_window: (dinner?.window_when as Window) ?? null,
      lunch: lunch?.name ?? null,
      kid_here: d.kid_here,
      prep_day: d.prep_day,
      notes: d.notes,
      days_out: supplying ? daysBetween(supplying.delivers_on, d.on_date) : null,
      delivery_ordinal: delivery?.ordinal ?? null,
    };
  });

  const lineList: PlanLine[] = (lines.data ?? [])
    .map((l) => {
      const item = l.item as unknown as { name: string; pack: string | null };
      const order = l.order as unknown as { ordinal: number };
      return {
        id: l.id,
        order_ordinal: order?.ordinal ?? 1,
        item_name: item?.name ?? "—",
        pack: item?.pack ?? null,
        tier: l.tier as PlanLine["tier"],
        quantity: Number(l.quantity),
        unit_price_cents: l.unit_price_cents,
        used_for: l.used_for,
        coverage_warning: l.coverage_warning,
        quantity_is_a_guess: l.quantity_is_a_guess,
      };
    })
    .sort(
      (a, b) =>
        a.order_ordinal - b.order_ordinal ||
        b.unit_price_cents * b.quantity - a.unit_price_cents * a.quantity,
    );

  return {
    ...plan,
    status: plan.status as Plan["status"],
    orders: orderList,
    days: dayList,
    lines: lineList,
  };
}

/** Whole days between two ISO dates, on the calendar rather than the clock. */
function daysBetween(from: string, to: string): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}
