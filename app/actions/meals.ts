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

/**
 * Tick a line off, or put it back.
 *
 * Takes the intended state rather than flipping what it finds: two taps on a
 * bad connection should land on the same answer, and a toggle would leave the
 * basket disagreeing with the screen.
 */
export async function setBought(
  _previous: MealState,
  formData: FormData,
): Promise<MealState> {
  if (!(await currentUser())) return DENIED;

  const id = String(formData.get("line_id") ?? "");
  if (!id) return { error: "No line.", note: null };

  const bought = formData.get("bought") === "true";
  const { error } = await supabase
    .from("meal_plan_items")
    .update({ bought_at: bought ? new Date().toISOString() : null })
    .eq("id", id);

  if (error) return { error: error.message, note: null };

  refresh();
  return ok(bought ? "In the basket." : "Put back.");
}

/** Clear every tick on an order, for the next time you shop it. */
export async function clearBought(
  _previous: MealState,
  formData: FormData,
): Promise<MealState> {
  if (!(await currentUser())) return DENIED;

  const orderId = String(formData.get("order_id") ?? "");
  if (!orderId) return { error: "No order.", note: null };

  const { error } = await supabase
    .from("meal_plan_items")
    .update({ bought_at: null })
    .eq("order_id", orderId);

  if (error) return { error: error.message, note: null };

  refresh();
  return ok("Ticks cleared.");
}

/* ------------------------------------------------------------------ *
 * Tabs
 * ------------------------------------------------------------------ */

/**
 * A tab of your own, for the snacks and the nice-to-haves.
 *
 * It is an order row with no delivery date — see the migration for why a tab
 * IS an order rather than a new table. The generator never touches it: it only
 * looks at deliveries, and it only deletes rows it generated itself.
 */
export async function addExtrasTab(
  _previous: MealState,
  formData: FormData,
): Promise<MealState> {
  if (!(await currentUser())) return DENIED;

  const planId = String(formData.get("plan_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!planId) return { error: "No plan.", note: null };
  if (!name) return { error: "Give the tab a name.", note: null };

  /*
   * Ordinals continue past the deliveries so the tabs read left to right in the
   * order they were made. Taken from the max rather than a count, because
   * deleting a tab must not hand its number to the next one — two tabs sharing
   * an ordinal would break `unique (plan_id, ordinal)` and, before that, would
   * make two tabs indistinguishable in a URL.
   */
  const { data: last } = await supabase
    .from("meal_plan_orders")
    .select("ordinal")
    .eq("plan_id", planId)
    .order("ordinal", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("meal_plan_orders").insert({
    plan_id: planId,
    ordinal: (last?.ordinal ?? 0) + 1,
    kind: "extras",
    delivers_on: null,
    name,
  });

  if (error) return { error: error.message, note: null };

  refresh();
  return ok(`${name} added.`);
}

/** Remove a tab you made. Its lines go with it; deliveries are refused. */
export async function deleteExtrasTab(
  _previous: MealState,
  formData: FormData,
): Promise<MealState> {
  if (!(await currentUser())) return DENIED;

  const id = String(formData.get("order_id") ?? "");
  if (!id) return { error: "No tab.", note: null };

  /*
   * `eq("kind", "extras")` in the DELETE itself rather than a read-then-check:
   * the read would be a round trip a concurrent write could slip between, and
   * this is the only thing stopping a crafted POST from deleting a delivery
   * and every line on it.
   */
  const { data, error } = await supabase
    .from("meal_plan_orders")
    .delete()
    .eq("id", id)
    .eq("kind", "extras")
    .select("id");

  if (error) return { error: error.message, note: null };
  if (!data?.length) return { error: "That's a delivery, not a tab you made.", note: null };

  refresh();
  return ok("Tab removed.");
}

/**
 * Put something from the price book on a tab.
 *
 * Priced from the item at the moment it is added, like every other line — the
 * list is what this shop costs today, not what it cost when the row was
 * written. `generated: false` is what makes it survive the next regeneration.
 */
export async function addToTab(
  _previous: MealState,
  formData: FormData,
): Promise<MealState> {
  if (!(await currentUser())) return DENIED;

  const orderId = String(formData.get("order_id") ?? "");
  const itemId = String(formData.get("item_id") ?? "");
  if (!orderId || !itemId) return { error: "Pick something to add.", note: null };

  const [order, item] = await Promise.all([
    supabase.from("meal_plan_orders").select("id, plan_id, kind").eq("id", orderId).maybeSingle(),
    supabase.from("meal_items").select("id, name, price_cents, tier").eq("id", itemId).maybeSingle(),
  ]);

  if (!order.data) return { error: "No such tab.", note: null };
  if (!item.data) return { error: "No such item.", note: null };

  // Adding the same snack twice means you want two of them, which is a more
  // useful answer than "that is already on the list".
  const { data: already } = await supabase
    .from("meal_plan_items")
    .select("id, quantity")
    .eq("order_id", orderId)
    .eq("item_id", itemId)
    .maybeSingle();

  if (already) {
    const quantity = Number(already.quantity) + 1;
    const { error } = await supabase
      .from("meal_plan_items")
      .update({ quantity })
      .eq("id", already.id);
    if (error) return { error: error.message, note: null };

    refresh();
    return ok(`${item.data.name} ×${quantity}.`);
  }

  const { error } = await supabase.from("meal_plan_items").insert({
    plan_id: order.data.plan_id,
    order_id: orderId,
    item_id: itemId,
    quantity: 1,
    unit_price_cents: item.data.price_cents ?? 0,
    tier: item.data.tier ?? "optional",
    generated: false,
    // Added by hand at a known quantity, so it is not the generator's guess.
    quantity_is_a_guess: false,
  });

  if (error) return { error: error.message, note: null };

  refresh();
  return ok(`${item.data.name} added.`);
}

/**
 * Take a hand-added line off again.
 *
 * Only ever a hand-added one. A generated line deleted here would reappear the
 * next time the list is built, which looks like the button not working — the
 * way to lose one of those is to change the menu.
 */
export async function removeFromTab(
  _previous: MealState,
  formData: FormData,
): Promise<MealState> {
  if (!(await currentUser())) return DENIED;

  const id = String(formData.get("line_id") ?? "");
  if (!id) return { error: "No line.", note: null };

  const { data, error } = await supabase
    .from("meal_plan_items")
    .delete()
    .eq("id", id)
    .eq("generated", false)
    .select("id");

  if (error) return { error: error.message, note: null };
  if (!data?.length) {
    return { error: "That line came from the menu — change the dishes to drop it.", note: null };
  }

  refresh();
  return ok("Removed.");
}
