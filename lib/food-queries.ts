import "server-only";

import { supabase } from "./supabase";
import { currentUser } from "./site-user";
import type { FoodDetail, FoodHit, Portion } from "./meal-types";

/**
 * Reads of the food database.
 *
 * Same posture as `meal-queries.ts` and for the same reason: NOT a `"use
 * server"` module, because every export of one becomes a public POST endpoint,
 * and `/me` pages render for signed-out visitors. Each function checks the
 * session itself so a page cannot leak by forgetting to.
 *
 * Both accounts reach this. Nutrition is the point of the meals tool, and a
 * `meals` account that can plan a month but not look up what is in a chicken
 * thigh would be a strange half of a thing.
 */

/**
 * PostgREST hands `numeric` back as a JSON number most of the time and as a
 * string when the value is wide enough, and `numeric(8,2)` is comfortably
 * inside the safe range either way. Coercing once here means no component has
 * to wonder, and `atGrams` never multiplies a string.
 */
const num = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);

/**
 * One line, one literal. supabase-js parses the select string in the TYPE
 * system to work out the row shape, so splitting it with `+` turns every
 * column into `GenericStringError` — which typechecks as a mistake rather than
 * failing at runtime, and is the only reason this is not wrapped.
 */
const FOOD_COLUMNS =
  "id, source, dataset, description, category, kcal, protein_g, fat_g, saturated_fat_g, carbs_g, fiber_g, sugar_g, sodium_mg, kcal_is_derived, notes";

function hit(row: Record<string, unknown>): FoodHit {
  return {
    id: String(row.id),
    source: row.source === "custom" ? "custom" : "usda",
    dataset: (row.dataset as string | null) ?? null,
    description: String(row.description),
    category: (row.category as string | null) ?? null,
    kcal: num(row.kcal),
    protein_g: num(row.protein_g),
    fat_g: num(row.fat_g),
    saturated_fat_g: num(row.saturated_fat_g),
    carbs_g: num(row.carbs_g),
    fiber_g: num(row.fiber_g),
    sugar_g: num(row.sugar_g),
    sodium_mg: num(row.sodium_mg),
    kcal_is_derived: row.kcal_is_derived === true,
    portion_label: (row.portion_label as string | null) ?? null,
    portion_grams: num(row.portion_grams),
    portion_count: Number(row.portion_count ?? 0),
  };
}

/**
 * Foods matching what was typed, best first.
 *
 * The ranking is `search_meal_foods` in Postgres — full text, trigram, a prefix
 * bonus, a boost for hand-typed foods and a penalty on FDC's endless
 * qualifiers. See 20260930045650_food_search.sql for why each arm is there.
 */
export async function searchFoods(query: string, limit = 40): Promise<FoodHit[]> {
  if (!(await currentUser())) return [];

  const { data, error } = await supabase.rpc("search_meal_foods", {
    p_query: query ?? "",
    p_limit: limit,
  });

  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(hit);
}

/** One food, with every portion and any pack identified as it. */
export async function getFood(id: string): Promise<FoodDetail | null> {
  if (!(await currentUser())) return null;

  const [food, portions, packs] = await Promise.all([
    supabase
      .from("meal_foods")
      .select(FOOD_COLUMNS)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("meal_food_portions")
      .select("id, label, grams")
      .eq("food_id", id)
      .order("sort_order")
      .order("grams"),
    supabase
      .from("meal_items")
      .select("id, name, store, pack, price_cents, pack_grams")
      .eq("food_id", id)
      .order("name"),
  ]);

  if (food.error || !food.data) return null;

  const list: Portion[] = (portions.data ?? []).map((p) => ({
    id: String(p.id),
    label: p.label,
    grams: Number(p.grams),
  }));

  return {
    ...hit(food.data as Record<string, unknown>),
    notes: (food.data as { notes: string | null }).notes ?? null,
    portion_label: list[0]?.label ?? null,
    portion_grams: list[0]?.grams ?? null,
    portion_count: list.length,
    portions: list,
    packs: (packs.data ?? []).map((p) => ({
      id: String(p.id),
      name: p.name,
      store: p.store,
      pack: p.pack,
      price_cents: p.price_cents,
      pack_grams: p.pack_grams === null ? null : Number(p.pack_grams),
    })),
  };
}

/**
 * How much is in here, for the page to say so honestly.
 *
 * `head: true` with an exact count rather than reading rows and measuring the
 * array — PostgREST caps a select at 1,000 and would report exactly that
 * forever, which is the mistake the brain hub shipped with.
 */
export async function countFoods(): Promise<{ usda: number; custom: number }> {
  if (!(await currentUser())) return { usda: 0, custom: 0 };

  const [usda, custom] = await Promise.all([
    supabase
      .from("meal_foods")
      .select("id", { count: "exact", head: true })
      .eq("source", "usda"),
    supabase
      .from("meal_foods")
      .select("id", { count: "exact", head: true })
      .eq("source", "custom"),
  ]);

  return { usda: usda.count ?? 0, custom: custom.count ?? 0 };
}

/**
 * The price book's own view of this: which packs still have no food on them.
 *
 * Surfaced because an unidentified pack is the reason a dish has no macros, and
 * that is invisible until somebody counts.
 */
export async function unidentifiedPacks(): Promise<number> {
  if (!(await currentUser())) return 0;
  const { count } = await supabase
    .from("meal_items")
    .select("id", { count: "exact", head: true })
    .is("food_id", null);
  return count ?? 0;
}
