import "server-only";

import { supabase } from "./supabase";
import { currentUser } from "./site-user";
import type { Item, Plan, PlanDay, PlanLine, PlanOrder, Recipe, Window } from "./meal-types";

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
      // The embedded food comes along rather than a second round trip: a pack
      // whose food is unknown is the thing this page is for fixing, so the
      // answer has to be visible on every row.
      .select(
        "id, name, pack, category, tier, price_cents, keeps_days, notes, food_id, meal_foods(description)",
      )
      .order("category")
      .order("name"),
    supabase.from("meal_recipe_items").select("item_id"),
  ]);

  if (items.error || !items.data) return [];

  const counts = new Map<string, number>();
  for (const row of links.data ?? []) {
    counts.set(row.item_id, (counts.get(row.item_id) ?? 0) + 1);
  }

  return items.data.map(({ meal_foods, ...i }) => ({
    ...i,
    used_by: counts.get(i.id) ?? 0,
    food_description: meal_foods?.description ?? null,
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
      .select("id, ordinal, kind, delivers_on, name, store")
      .eq("plan_id", plan.id)
      .order("ordinal"),
    supabase
      .from("meal_plan_days")
      .select(
        "id, on_date, kid_here, prep_day, notes, dinner_recipe_id, dinner:dinner_recipe_id (name, window_when), lunch:lunch_recipe_id (name)",
      )
      .eq("plan_id", plan.id)
      .order("on_date"),
    supabase
      .from("meal_plan_items")
      .select(
        "id, order_id, generated, quantity, unit_price_cents, tier, used_for, notes, coverage_warning, quantity_is_a_guess, bought_at, item:item_id (name, pack, store), order:order_id (ordinal, store)",
      )
      .eq("plan_id", plan.id),
  ]);

  const orderList: PlanOrder[] = (orders.data ?? []).map((o) => ({
    id: o.id,
    ordinal: o.ordinal,
    kind: o.kind === "extras" ? "extras" : "delivery",
    delivers_on: o.delivers_on,
    name: o.name,
    store: o.store,
  }));

  /*
   * Only deliveries supply a day. An extras tab has no date — nothing brings
   * it — so it can neither be the box a Tuesday eats out of nor a delivery
   * landing on one. Filtered here rather than left to `null <= "2026-09-29"`
   * happening to be false in JavaScript.
   */
  const deliveries = orderList.filter((o) => o.kind === "delivery" && o.delivers_on);

  const dayList: PlanDay[] = (days.data ?? []).map((d) => {
    // The last delivery on or before this day. Before the first one, there is
    // no supplier yet — shown as such rather than as day 0 of something.
    const supplying = [...deliveries]
      .reverse()
      .find((o) => (o.delivers_on as string) <= d.on_date);
    const delivery = deliveries.find((o) => o.delivers_on === d.on_date);

    const dinner = d.dinner as unknown as { name: string; window_when: string } | null;
    const lunch = d.lunch as unknown as { name: string } | null;

    return {
      id: d.id,
      on_date: d.on_date,
      dinner: dinner?.name ?? null,
      dinner_recipe_id: d.dinner_recipe_id,
      dinner_window: (dinner?.window_when as Window) ?? null,
      lunch: lunch?.name ?? null,
      kid_here: d.kid_here,
      prep_day: d.prep_day,
      notes: d.notes,
      days_out: supplying ? daysBetween(supplying.delivers_on as string, d.on_date) : null,
      delivery_ordinal: delivery?.ordinal ?? null,
    };
  });

  const lineList: PlanLine[] = (lines.data ?? [])
    .map((l) => {
      const item = l.item as unknown as {
        name: string;
        pack: string | null;
        store: string | null;
      };
      const order = l.order as unknown as { ordinal: number; store: string | null };
      return {
        id: l.id,
        order_id: l.order_id,
        order_ordinal: order?.ordinal ?? 1,
        generated: l.generated,
        item_name: item?.name ?? "—",
        pack: item?.pack ?? null,
        // The item's own store wins: a line is bought where that thing is sold,
        // and the order's store is only the default for everything else on it.
        store: item?.store ?? order?.store ?? null,
        bought_at: l.bought_at,
        tier: l.tier as PlanLine["tier"],
        quantity: Number(l.quantity),
        unit_price_cents: l.unit_price_cents,
        used_for: l.used_for,
        notes: l.notes,
        coverage_warning: l.coverage_warning,
        quantity_is_a_guess: l.quantity_is_a_guess,
      };
    })
    /*
     * By UNIT price, not by line total.
     *
     * The total moves when you change a quantity, so a row would jump out from
     * under the finger that was pressing − on it — in a shop, one-handed, which
     * is exactly where this list gets used. The unit price answers the same
     * question ("what are the expensive things") and holds still while you
     * shop. Name breaks the tie, so the order is total and never depends on
     * which rows happened to cost the same.
     */
    .sort(
      (a, b) =>
        a.order_ordinal - b.order_ordinal ||
        b.unit_price_cents - a.unit_price_cents ||
        a.item_name.localeCompare(b.item_name),
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

export type RecipeDetail = {
  id: string;
  name: string;
  kind: string;
  serves: number | null;
  kcal: number | null;
  protein_g: number | null;
  method: string | null;
  window_when: Window;
  notes: string | null;
  batch_friendly: boolean;
  retired: boolean;
  ingredients: {
    item_id: string;
    name: string;
    pack: string | null;
    price_cents: number | null;
    quantity: number | null;
    unit: string | null;
    optional: boolean;
  }[];
};

/** One dish, with what goes in it. */
export async function getRecipe(id: string): Promise<RecipeDetail | null> {
  if (!(await currentUser())) return null;

  const [recipe, links] = await Promise.all([
    supabase.from("meal_recipes").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("meal_recipe_items")
      .select("item_id, quantity, unit, optional, item:item_id (name, pack, price_cents)")
      .eq("recipe_id", id),
  ]);

  if (recipe.error || !recipe.data) return null;

  const ingredients = (links.data ?? [])
    .map((l) => {
      const item = l.item as unknown as {
        name: string;
        pack: string | null;
        price_cents: number | null;
      };
      return {
        item_id: l.item_id,
        name: item?.name ?? "—",
        pack: item?.pack ?? null,
        price_cents: item?.price_cents ?? null,
        quantity: l.quantity === null ? null : Number(l.quantity),
        unit: l.unit,
        optional: l.optional,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    ...recipe.data,
    window_when: recipe.data.window_when as Window,
    ingredients,
  } as RecipeDetail;
}

/** Every item, trimmed to what an ingredient picker needs. */
export async function getItemOptions(): Promise<{ id: string; label: string }[]> {
  if (!(await currentUser())) return [];
  const { data, error } = await supabase
    .from("meal_items")
    .select("id, name, pack")
    .order("name");
  if (error || !data) return [];
  return data.map((i) => ({
    id: i.id,
    label: i.pack ? `${i.name} — ${i.pack}` : i.name,
  }));
}
