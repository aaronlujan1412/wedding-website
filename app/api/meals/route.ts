import { supabase } from "@/lib/supabase";

/**
 * The meal library, for the skill.
 *
 * The meal-plan skill runs wherever Claude runs — a laptop, claude.ai, a phone
 * — so it cannot reach the homelab and cannot hold the database key. It reads
 * from here with a token that can only read meals, which is a far smaller thing
 * to lose than one that also reads the guest list.
 *
 * Read-only on purpose. The skill's job is to choose a menu well, and choosing
 * is what a person and a model are good at; writing plans, prices and links is
 * done on the site where a human can see what changed. A skill that could
 * rewrite the price book would eventually rewrite it wrongly at 2am.
 *
 * GET /api/meals            everything: setup, rules, dishes, items, links
 * GET /api/meals?part=...   one section, for a smaller context
 *
 * The whole payload is ~60KB of JSON, which is small enough to hand a model in
 * one go and is the point — the skill previously re-derived all of this from
 * two markdown files and a 1,615-line worked example, every month.
 */

export const dynamic = "force-dynamic";

function authorised(request: Request): boolean {
  const secret = process.env.MEALS_API_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorised(request)) return new Response("Unauthorized", { status: 401 });

  const part = new URL(request.url).searchParams.get("part");
  const wants = (name: string) => !part || part === name;

  /*
   * `plan` is OPT-IN, never part of the default payload. The meal-plan skill's
   * contract is the library — dishes, items, prices — and the plan is the thing
   * it WRITES, so folding days into the default response would hand it back its
   * own output every month for no reason.
   *
   * It exists for the wall display in the kitchen, which asks exactly one
   * question: what are we eating tonight. That board cannot hold the database
   * key for the same reason the skill cannot — a token scoped to meals is a far
   * smaller thing to leave on a Chromebook than one that also reads the guest
   * list — so it comes through here.
   */
  const wantsPlan = part === "plan";

  const [settings, rules, recipes, items, links, planDays] = await Promise.all([
    wants("settings") ? supabase.from("meal_settings").select("*").maybeSingle() : null,
    wants("rules")
      ? supabase.from("meal_rules").select("label, detail, forbidden_term, applies_to").eq("active", true).order("sort_order")
      : null,
    wants("recipes")
      ? supabase
          .from("meal_recipes")
          .select("id, name, kind, serves, kcal, protein_g, method, window_when, notes, batch_friendly, last_planned_on")
          .eq("retired", false)
          .order("kind")
          .order("name")
      : null,
    wants("items")
      ? supabase
          .from("meal_items")
          .select("id, name, pack, store, category, tier, price_cents, keeps_days, notes")
          .order("category")
          .order("name")
      : null,
    wants("recipes") || wants("items")
      ? supabase.from("meal_recipe_items").select("recipe_id, item_id, quantity, unit, optional")
      : null,
    wantsPlan
      ? supabase
          .from("meal_plan_days")
          .select("on_date, kid_here, prep_day, notes, dinner:dinner_recipe_id(name), lunch:lunch_recipe_id(name)")
          // Today onward only. The board shows a fortnight and has no use for
          // what we ate three weeks ago.
          .gte("on_date", new Date().toISOString().slice(0, 10))
          .order("on_date")
      : null,
  ]);

  const failed = [settings, rules, recipes, items, links, planDays].find((r) => r?.error);
  if (failed?.error) {
    return Response.json({ ok: false, error: failed.error.message }, { status: 500 });
  }

  /*
   * Ingredients are nested under their dish rather than handed over as a
   * separate join table. The skill reasons in dishes — "what does this need,
   * and what does it cost" — and a flat list of id pairs would make it do a
   * join in prose, which is exactly the kind of bookkeeping that goes wrong
   * quietly.
   */
  const byRecipe = new Map<string, { item_id: string; quantity: number | null; unit: string | null; optional: boolean }[]>();
  for (const l of links?.data ?? []) {
    const list = byRecipe.get(l.recipe_id) ?? [];
    list.push({
      item_id: l.item_id,
      quantity: l.quantity === null ? null : Number(l.quantity),
      unit: l.unit,
      optional: l.optional,
    });
    byRecipe.set(l.recipe_id, list);
  }

  const itemName = new Map((items?.data ?? []).map((i) => [i.id, i.name]));

  /*
   * Flattened to date -> dish. PostgREST returns the embedded recipe as an
   * object (or an array, depending on how it infers the relationship), and the
   * board should not have to care which.
   */
  const name = (r: unknown): string | null => {
    const v = Array.isArray(r) ? r[0] : r;
    return v && typeof v === "object" && "name" in v ? ((v as { name: string }).name ?? null) : null;
  };

  return Response.json({
    ok: true,
    as_of: new Date().toISOString(),
    ...(planDays?.data
      ? {
          plan: planDays.data.map((d) => ({
            date: d.on_date,
            dinner: name(d.dinner),
            lunch: name(d.lunch),
            kid_here: d.kid_here,
            prep_day: d.prep_day,
            notes: d.notes,
          })),
        }
      : {}),
    ...(settings?.data ? { settings: settings.data } : {}),
    ...(rules?.data ? { rules: rules.data } : {}),
    ...(items?.data ? { items: items.data } : {}),
    ...(recipes?.data
      ? {
          recipes: recipes.data.map((r) => ({
            ...r,
            ingredients: (byRecipe.get(r.id) ?? []).map((ing) => ({
              ...ing,
              // The name too, so a dish reads on its own without the caller
              // holding the whole item table in mind.
              name: itemName.get(ing.item_id) ?? null,
            })),
          })),
        }
      : {}),
  });
}
