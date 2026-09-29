"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { currentUser } from "@/lib/site-user";

/**
 * Editing the library: items, prices, recipes, the links between them, and the
 * standing setup.
 *
 * Every export of a "use server" module is a public POST endpoint and nothing
 * under /me is gated by `proxy.ts`, so each of these re-checks the session
 * itself. That check is the only thing in front of the data.
 */

export type LibraryState = { error: string | null; note: string | null };

const DENIED: LibraryState = { error: "Not signed in.", note: null };
const ok = (note: string): LibraryState => ({ error: null, note });
const fail = (error: string): LibraryState => ({ error, note: null });

function refresh() {
  revalidatePath("/me/meals", "layout");
}

/** "$12.99", "12.99", "1,299" -> cents. Null for anything that isn't money. */
function cents(raw: FormDataEntryValue | null): number | null {
  const text = String(raw ?? "").replace(/[$,\s]/g, "");
  if (!text) return null;
  const value = Number(text);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

function int(raw: FormDataEntryValue | null): number | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const value = Number(text);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

const text = (raw: FormDataEntryValue | null) => String(raw ?? "").trim() || null;

/* ---------------------------------------------------------------- items -- */

export async function saveItem(
  _previous: LibraryState,
  formData: FormData,
): Promise<LibraryState> {
  if (!(await currentUser())) return DENIED;

  const id = text(formData.get("id"));
  const name = text(formData.get("name"));
  if (!name) return fail("Give it a name.");

  const price = cents(formData.get("price"));
  if (formData.get("price") && price === null) {
    return fail("That price doesn't read as money.");
  }

  const row = {
    name,
    pack: text(formData.get("pack")),
    store: text(formData.get("store")),
    category: text(formData.get("category")) ?? "other",
    tier: String(formData.get("tier") ?? "core"),
    keeps_days: int(formData.get("keeps_days")),
    price_cents: price,
    priced_on: price === null ? null : new Date().toISOString().slice(0, 10),
    notes: text(formData.get("notes")),
    updated_at: new Date().toISOString(),
  };

  // Read the old price before writing, so a change can be recorded rather than
  // just overwritten — the whole point of keeping a price book in a database
  // instead of a markdown table is being able to ask what beef used to cost.
  const before = id
    ? (await supabase.from("meal_items").select("price_cents").eq("id", id).maybeSingle()).data
    : null;

  const { data, error } = id
    ? await supabase.from("meal_items").update(row).eq("id", id).select("id").single()
    : await supabase.from("meal_items").insert(row).select("id").single();

  if (error) {
    if (error.code === "23505") return fail("That item, pack and store already exist.");
    return fail(error.message);
  }

  if (price !== null && before?.price_cents !== price) {
    await supabase.from("meal_item_prices").insert({
      item_id: data.id,
      price_cents: price,
      source: "edited on the site",
    });
  }

  refresh();
  return ok(id ? `${name} updated.` : `${name} added.`);
}

/**
 * The one-field edit the price book actually needs every month.
 *
 * Separate from saveItem because re-pricing is a different act from editing an
 * item: it happens on a whole page of rows at once, it should not require
 * re-submitting every other field, and it is the one that appends history.
 */
export async function repriceItem(
  _previous: LibraryState,
  formData: FormData,
): Promise<LibraryState> {
  if (!(await currentUser())) return DENIED;

  const id = text(formData.get("id"));
  const price = cents(formData.get("price"));
  if (!id) return fail("No item.");
  if (price === null) return fail("That price doesn't read as money.");

  const before = await supabase
    .from("meal_items")
    .select("name, price_cents")
    .eq("id", id)
    .maybeSingle();

  if (before.data?.price_cents === price) return ok("Unchanged.");

  const { error } = await supabase
    .from("meal_items")
    .update({
      price_cents: price,
      priced_on: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return fail(error.message);

  await supabase.from("meal_item_prices").insert({
    item_id: id,
    price_cents: price,
    source: "edited on the site",
  });

  refresh();
  const was = before.data?.price_cents;
  return ok(
    was == null
      ? `${before.data?.name ?? "Item"} priced.`
      : `${before.data?.name}: $${(was / 100).toFixed(2)} → $${(price / 100).toFixed(2)}.`,
  );
}

export async function deleteItem(
  _previous: LibraryState,
  formData: FormData,
): Promise<LibraryState> {
  if (!(await currentUser())) return DENIED;
  const id = text(formData.get("id"));
  if (!id) return fail("No item.");

  const { error } = await supabase.from("meal_items").delete().eq("id", id);
  if (error) return fail(error.message);

  refresh();
  return ok("Removed.");
}

/* -------------------------------------------------------------- recipes -- */

export async function saveRecipe(
  _previous: LibraryState,
  formData: FormData,
): Promise<LibraryState> {
  if (!(await currentUser())) return DENIED;

  const id = text(formData.get("id"));
  const name = text(formData.get("name"));
  if (!name) return fail("Give it a name.");

  const row = {
    name,
    kind: String(formData.get("kind") ?? "dinner"),
    window_when: String(formData.get("window_when") ?? "any"),
    serves: int(formData.get("serves")),
    kcal: int(formData.get("kcal")),
    protein_g: int(formData.get("protein_g")),
    method: text(formData.get("method")),
    notes: text(formData.get("notes")),
    batch_friendly: formData.get("batch_friendly") === "on",
    updated_at: new Date().toISOString(),
  };

  const { error } = id
    ? await supabase.from("meal_recipes").update(row).eq("id", id)
    : await supabase.from("meal_recipes").insert(row);

  if (error) {
    if (error.code === "23505") return fail("There is already a dish with that name.");
    return fail(error.message);
  }

  refresh();
  return ok(id ? `${name} updated.` : `${name} added — now give it ingredients.`);
}

/** Out of rotation, not deleted: a retired dish stays on old plans. */
export async function retireRecipe(
  _previous: LibraryState,
  formData: FormData,
): Promise<LibraryState> {
  if (!(await currentUser())) return DENIED;
  const id = text(formData.get("id"));
  if (!id) return fail("No dish.");

  const retire = formData.get("retired") === "true";
  const { error } = await supabase
    .from("meal_recipes")
    .update({ retired: retire })
    .eq("id", id);

  if (error) return fail(error.message);
  refresh();
  return ok(retire ? "Out of rotation." : "Back in rotation.");
}

/* ----------------------------------------------------------- ingredients -- */

/**
 * Put an item in a dish.
 *
 * This is the link the whole system turns on: a dish with no ingredients
 * contributes nothing to a shopping list, so it can be scheduled and still
 * leave you with nothing to cook it from.
 */
export async function addIngredient(
  _previous: LibraryState,
  formData: FormData,
): Promise<LibraryState> {
  if (!(await currentUser())) return DENIED;

  const recipe_id = text(formData.get("recipe_id"));
  const item_id = text(formData.get("item_id"));
  if (!recipe_id || !item_id) return fail("Pick an item.");

  const rawQty = String(formData.get("quantity") ?? "").trim();
  const quantity = rawQty ? Number(rawQty) : null;
  if (rawQty && (!Number.isFinite(quantity) || (quantity ?? 0) <= 0)) {
    return fail("That quantity doesn't read as a number.");
  }

  const { error } = await supabase.from("meal_recipe_items").upsert(
    {
      recipe_id,
      item_id,
      quantity,
      unit: text(formData.get("unit")),
      optional: formData.get("optional") === "on",
      // Deliberately not the seed's marker: a link added here is a person's,
      // and re-running the seed must not clear it.
      notes: text(formData.get("notes")) ?? "added on the site",
    },
    { onConflict: "recipe_id,item_id" },
  );

  if (error) return fail(error.message);
  refresh();
  return ok("Added.");
}

export async function removeIngredient(
  _previous: LibraryState,
  formData: FormData,
): Promise<LibraryState> {
  if (!(await currentUser())) return DENIED;

  const recipe_id = text(formData.get("recipe_id"));
  const item_id = text(formData.get("item_id"));
  if (!recipe_id || !item_id) return fail("No link.");

  const { error } = await supabase
    .from("meal_recipe_items")
    .delete()
    .eq("recipe_id", recipe_id)
    .eq("item_id", item_id);

  if (error) return fail(error.message);
  refresh();
  return ok("Removed.");
}

/* ------------------------------------------------------ setup and rules -- */

export async function saveSettings(
  _previous: LibraryState,
  formData: FormData,
): Promise<LibraryState> {
  if (!(await currentUser())) return DENIED;

  const budget = cents(formData.get("budget"));
  if (budget === null || budget <= 0) return fail("The budget has to be an amount.");

  const { error } = await supabase.from("meal_settings").upsert({
    id: true,
    budget_cents: budget,
    orders_per_month: int(formData.get("orders_per_month")) ?? 2,
    aaron_kcal: int(formData.get("aaron_kcal")) ?? 1900,
    savea_kcal: int(formData.get("savea_kcal")) ?? 1200,
    kid_cycle_days: int(formData.get("kid_cycle_days")) ?? 14,
    notes: text(formData.get("notes")),
    updated_at: new Date().toISOString(),
  });

  if (error) return fail(error.message);
  refresh();
  return ok("Saved.");
}

export async function saveRule(
  _previous: LibraryState,
  formData: FormData,
): Promise<LibraryState> {
  if (!(await currentUser())) return DENIED;

  const id = text(formData.get("id"));
  const label = text(formData.get("label"));
  const detail = text(formData.get("detail"));
  if (!label || !detail) return fail("A rule needs a name and what it means.");

  const row = {
    label,
    detail,
    forbidden_term: text(formData.get("forbidden_term"))?.toLowerCase() ?? null,
    applies_to: text(formData.get("applies_to")),
  };

  const { error } = id
    ? await supabase.from("meal_rules").update(row).eq("id", id)
    : await supabase.from("meal_rules").insert(row);

  if (error) return fail(error.message);
  refresh();
  return ok(id ? "Rule updated." : "Rule added.");
}

export async function toggleRule(
  _previous: LibraryState,
  formData: FormData,
): Promise<LibraryState> {
  if (!(await currentUser())) return DENIED;
  const id = text(formData.get("id"));
  if (!id) return fail("No rule.");

  const active = formData.get("active") === "true";
  const { error } = await supabase.from("meal_rules").update({ active }).eq("id", id);
  if (error) return fail(error.message);

  refresh();
  return ok(active ? "Back on." : "Switched off.");
}

/* ----------------------------------------------------------------- plan -- */

/** Swap what is for dinner on one night. */
export async function setDinner(
  _previous: LibraryState,
  formData: FormData,
): Promise<LibraryState> {
  if (!(await currentUser())) return DENIED;

  const day_id = text(formData.get("day_id"));
  if (!day_id) return fail("No day.");

  const recipe = text(formData.get("dinner_recipe_id"));
  const { error } = await supabase
    .from("meal_plan_days")
    .update({ dinner_recipe_id: recipe })
    .eq("id", day_id);

  if (error) return fail(error.message);
  refresh();
  return ok(recipe ? "Changed — rebuild the list." : "Cleared — rebuild the list.");
}

/** Move a delivery. Everything downstream is recomputed from these dates. */
export async function setOrderDate(
  _previous: LibraryState,
  formData: FormData,
): Promise<LibraryState> {
  if (!(await currentUser())) return DENIED;

  const id = text(formData.get("order_id"));
  const delivers_on = text(formData.get("delivers_on"));
  if (!id || !delivers_on) return fail("Needs a date.");

  const { error } = await supabase
    .from("meal_plan_orders")
    .update({ delivers_on, store: text(formData.get("store")) })
    .eq("id", id);

  if (error) return fail(error.message);
  refresh();
  return ok("Delivery moved — rebuild the list.");
}
