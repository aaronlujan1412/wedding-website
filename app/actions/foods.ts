"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { currentUser } from "@/lib/site-user";
import { searchFoods } from "@/lib/food-queries";
import type { FoodHit } from "@/lib/meal-types";
import type { LibraryState } from "./meal-library";

/**
 * Custom foods, portions, and saying which food is in a pack.
 *
 * Every export of a `"use server"` module is a public POST endpoint and nothing
 * under /me is gated by `proxy.ts`, so each of these re-checks the session
 * itself — the same rule as `meal-library.ts`.
 *
 * USDA rows are deliberately NOT editable here. They are a mirror: the importer
 * would overwrite an edit on the next run, so a form offering one would be
 * lying. Correcting a USDA figure means adding a custom food beside it.
 */

const DENIED: LibraryState = { error: "Not signed in.", note: null };
const ok = (note: string): LibraryState => ({ error: null, note });
const fail = (error: string): LibraryState => ({ error, note: null });

function refresh() {
  revalidatePath("/me/meals", "layout");
}

const text = (raw: FormDataEntryValue | null) => String(raw ?? "").trim() || null;

/** A nutrition figure: a non-negative number, or null for "not stated". */
function amount(raw: FormDataEntryValue | null): number | null | "bad" {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const n = Number(value.replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return "bad";
  return n;
}

const FIELDS = [
  "kcal", "protein_g", "carbs_g", "fiber_g",
  "sugar_g", "fat_g", "saturated_fat_g", "sodium_mg",
] as const;

/**
 * Add a food by hand, from whatever the packet says.
 *
 * WHY THE FORM TAKES A BASIS. A packet does not print per 100 g — it prints
 * "per serving (30 g): 150 cal". Asking someone to divide by 0.3 before they
 * can type it in is asking them to introduce the arithmetic error this whole
 * thing exists to remove. So the form takes the numbers AS PRINTED plus the
 * grams they refer to, and the conversion happens here, once, in code that can
 * be read.
 *
 * The serving is then also stored as a portion, because a packet's own serving
 * is nearly always the portion you go on to eat.
 */
export async function addCustomFood(
  _previous: LibraryState,
  formData: FormData,
): Promise<LibraryState> {
  if (!(await currentUser())) return DENIED;

  const description = text(formData.get("description"));
  if (!description) return fail("Give it a name.");

  const basis = String(formData.get("basis") ?? "100g");
  let grams = 100;

  if (basis === "serving") {
    const stated = amount(formData.get("serving_grams"));
    if (stated === "bad" || stated === null || stated <= 0) {
      return fail("How many grams is one serving? That's what the numbers get scaled by.");
    }
    grams = stated;
  }

  const row: Record<string, unknown> = {
    source: "custom",
    fdc_id: null,
    description,
    category: text(formData.get("category")),
    notes: text(formData.get("notes")),
    // Typed in by hand from a label, so the calories are as measured as
    // anything here — not reconstructed by us.
    kcal_is_derived: false,
  };

  for (const field of FIELDS) {
    const value = amount(formData.get(field));
    if (value === "bad") return fail(`"${field.replace(/_g$|_mg$/, "")}" needs to be a number.`);
    // Scale to per 100 g. Null stays null: a figure the packet omits is
    // unknown, and storing a zero would be inventing one.
    row[field] = value === null ? null : (value * 100) / grams;
  }

  const { data, error } = await supabase
    .from("meal_foods")
    .insert(row as never)
    .select("id")
    .single();

  if (error) {
    // The partial unique index on lower(description) where source = 'custom'.
    if (error.code === "23505") {
      return fail(`"${description}" is already in here. Search for it instead.`);
    }
    return fail(error.message);
  }

  // The serving the numbers came from IS a portion, and the useful one.
  if (basis === "serving" && data) {
    const label = text(formData.get("serving_label")) ?? "1 serving";
    await supabase
      .from("meal_food_portions")
      .insert({ food_id: data.id, label, grams, sort_order: 0 });
  }

  refresh();
  return ok(
    `${description} added${basis === "serving" ? `, scaled from ${grams} g to per-100 g` : ""}.`,
  );
}

/** Change a custom food. USDA rows are refused, not silently ignored. */
export async function editCustomFood(
  _previous: LibraryState,
  formData: FormData,
): Promise<LibraryState> {
  if (!(await currentUser())) return DENIED;

  const id = text(formData.get("id"));
  if (!id) return fail("No food.");

  const description = text(formData.get("description"));
  if (!description) return fail("Give it a name.");

  const patch: Record<string, unknown> = {
    description,
    category: text(formData.get("category")),
    notes: text(formData.get("notes")),
    updated_at: new Date().toISOString(),
  };

  for (const field of FIELDS) {
    const value = amount(formData.get(field));
    if (value === "bad") return fail(`"${field.replace(/_g$|_mg$/, "")}" needs to be a number.`);
    patch[field] = value;
  }

  /*
   * `eq("source", "custom")` in the UPDATE itself, not a read-then-check. The
   * read would be a separate round trip that a concurrent write could slip
   * between, and this is the only guard stopping a crafted POST from rewriting
   * a mirrored USDA row — which the next import would then silently revert,
   * making the damage look like a bug in the importer.
   */
  const { data, error } = await supabase
    .from("meal_foods")
    .update(patch as never)
    .eq("id", id)
    .eq("source", "custom")
    .select("id");

  if (error) {
    if (error.code === "23505") return fail(`Another food is already called "${description}".`);
    return fail(error.message);
  }
  if (!data?.length) return fail("That's a USDA food — add a custom one beside it instead.");

  refresh();
  return ok("Saved.");
}

/** Remove a custom food. Packs pointing at it go back to unidentified. */
export async function deleteCustomFood(
  _previous: LibraryState,
  formData: FormData,
): Promise<LibraryState> {
  if (!(await currentUser())) return DENIED;

  const id = text(formData.get("id"));
  if (!id) return fail("No food.");

  const { data, error } = await supabase
    .from("meal_foods")
    .delete()
    .eq("id", id)
    .eq("source", "custom")
    .select("id");

  if (error) return fail(error.message);
  if (!data?.length) return fail("That's a USDA food — the mirror owns it.");

  refresh();
  return ok("Deleted. Any pack that pointed at it is unidentified again.");
}

/** '1 piece = 21 g', so the food can be counted in something you can hold. */
export async function addPortion(
  _previous: LibraryState,
  formData: FormData,
): Promise<LibraryState> {
  if (!(await currentUser())) return DENIED;

  const foodId = text(formData.get("food_id"));
  const label = text(formData.get("label"));
  if (!foodId || !label) return fail("A portion needs a name.");

  const grams = amount(formData.get("grams"));
  if (grams === "bad" || grams === null || grams <= 0) {
    return fail("How many grams is it? That's the whole point of a portion.");
  }

  const { error } = await supabase
    .from("meal_food_portions")
    .insert({ food_id: foodId, label, grams, sort_order: 100 });

  if (error) {
    if (error.code === "23505") return fail(`There's already a "${label}" on this food.`);
    return fail(error.message);
  }

  refresh();
  return ok(`${label} = ${grams} g.`);
}

export async function deletePortion(
  _previous: LibraryState,
  formData: FormData,
): Promise<LibraryState> {
  if (!(await currentUser())) return DENIED;

  const id = text(formData.get("id"));
  if (!id) return fail("No portion.");

  const { error } = await supabase.from("meal_food_portions").delete().eq("id", id);
  if (error) return fail(error.message);

  refresh();
  return ok("Portion removed.");
}

/**
 * Say which food is in a pack — or take the answer back.
 *
 * This is the replacement for the fuzzy matcher writing nutrition columns onto
 * meal_items and hoping. A person picking from a search box gets it right, and
 * when they don't, it is visible and one click to change.
 */
export async function setPackFood(
  _previous: LibraryState,
  formData: FormData,
): Promise<LibraryState> {
  if (!(await currentUser())) return DENIED;

  const itemId = text(formData.get("item_id"));
  if (!itemId) return fail("No item.");

  // An empty food_id is the "actually, nobody knows" case, which is a real
  // answer and has to be expressible.
  const foodId = text(formData.get("food_id"));

  const { error } = await supabase
    .from("meal_items")
    .update({ food_id: foodId })
    .eq("id", itemId);

  if (error) return fail(error.message);

  refresh();
  return ok(foodId ? "Identified." : "Cleared.");
}

/**
 * Search, callable from the browser.
 *
 * A thin wrapper over `searchFoods` so the price book's picker can look things
 * up without a page navigation. Safe by construction: `searchFoods` checks the
 * session itself and answers an empty list to a stranger, which is why this can
 * be a one-line export in a `"use server"` module without its own guard.
 */
export async function findFoods(query: string): Promise<FoodHit[]> {
  return searchFoods(String(query ?? "").slice(0, 120), 8);
}
