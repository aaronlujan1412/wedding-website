/**
 * Propose which food is in each pack on the price book.
 *
 * REPLACES pull-usda.mjs, which matched a pack name against the FDC API and
 * wrote nutrition columns straight onto meal_items. Those columns are gone (see
 * 20260930045039_food_database.sql); a pack now POINTS at a food.
 *
 * WHAT CHANGED BESIDES THE TARGET. The old script had to be clever because it
 * was the only judge -- a 0.85 guess became a number in a column that no page
 * could show you and nobody could audit, and it shipped seven confidently wrong
 * matches. Here:
 *
 *   * Postgres does the recall.  search_meal_foods ranks the whole mirror.
 *   * The scorer does precision. usda-match.mjs, unchanged and still tested.
 *   * A person does the deciding. Anything short of confident is printed, not
 *     written, and every pack has an `identify` control on the price book.
 *
 * It also needs no API key and no network: the foods are already local, so
 * there are no rate limits, no Lucene syntax errors from a stray slash, and a
 * re-run costs nothing. That whole class of bug went with the mirror.
 *
 * Usage:
 *   node --env-file=.env.local  scripts/link-item-foods.mjs            # propose only
 *   node --env-file=.env.local  scripts/link-item-foods.mjs --write
 *   node --env-file=.env.remote scripts/link-item-foods.mjs --write --production --force
 *   ... --only "chicken"        just packs whose name contains this
 *   ... --relink                reconsider packs that already have a food
 *   ... --confident 0.9         raise the bar for writing
 */

import { createClient } from "@supabase/supabase-js";
import { assertSafeTarget, target } from "./db-target.mjs";
import { score } from "./usda-match.mjs";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const value = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};

const WRITE = flags.has("--write");
const RELINK = flags.has("--relink");
const ONLY = value("--only", null);
const CONFIDENT = Number(value("--confident", "0.8"));

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set.");
    console.error("Run with --env-file=.env.local (or .env.remote).");
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

const supabase = client();

console.log(`Database: ${target().url}`);

const { count: mirrored } = await supabase
  .from("meal_foods")
  .select("id", { count: "exact", head: true });

if (!mirrored) {
  console.error("\nNo foods mirrored yet. Run scripts/pull-usda-foods.mjs first.");
  process.exit(1);
}
console.log(`${mirrored.toLocaleString("en-US")} foods to match against.\n`);

let query = supabase.from("meal_items").select("id, name, category, food_id").order("name");
if (!RELINK) query = query.is("food_id", null);
if (ONLY) query = query.ilike("name", `%${ONLY}%`);

const { data: items, error } = await query;
if (error) {
  console.error(error.message);
  process.exit(1);
}

if (!items.length) {
  console.log(
    RELINK ? "No packs match that." : "Every pack already has a food. Use --relink to reconsider.",
  );
  process.exit(0);
}

const sure = [];
const unsure = [];
const none = [];

for (const item of items) {
  // Postgres for recall: full text, trigram, prefix and length, all ranked.
  const { data: candidates, error: searchError } = await supabase.rpc("search_meal_foods", {
    p_query: item.name,
    p_limit: 8,
  });

  if (searchError) {
    console.error(`  ${item.name}: ${searchError.message}`);
    continue;
  }

  // The tested scorer for precision -- it is the thing that knows a part of a
  // food is not the food: chicken SKIN is not chicken, quinoa flour is not
  // quinoa, meatless bacon is not bacon.
  let best = null;
  for (const food of candidates ?? []) {
    const s = score(item.name, food.description);
    // A tie goes to Foundation: measured rather than carried over from the
    // older SR Legacy tables. Same rule the old script used.
    const preferred = food.dataset === "Foundation" ? 0.02 : 0;
    if (!best || s + preferred > best.score) best = { food, score: s + preferred };
  }

  if (!best || best.score < 0.5) {
    none.push(item);
    console.log(`  —    ${item.name}`);
    continue;
  }

  const confident = best.score >= CONFIDENT;
  (confident ? sure : unsure).push({ item, ...best });
  console.log(
    `  ${confident ? "ok " : "?? "}${best.score.toFixed(2)} ${item.name}\n` +
      `       -> ${best.food.description}` +
      `${best.food.kcal === null ? "" : ` (${Math.round(best.food.kcal)} kcal/100g)`}`,
  );
}

console.log(`\n${sure.length} confident, ${unsure.length} uncertain, ${none.length} no match.`);

if (unsure.length) {
  console.log(
    "\nUncertain — NOT written. Two words agreeing is not the same food.\n" +
      "Identify these on the price book, where you can see both names at once:",
  );
  for (const u of unsure) {
    console.log(`  ${u.score.toFixed(2)} ${u.item.name}\n       -> ${u.food.description}`);
  }
}

if (none.length) {
  console.log("\nNo generic food matched (usually branded — add a custom food):");
  for (const m of none) console.log(`  ${m.name}`);
}

if (!WRITE) {
  console.log(`\nNothing written. Add --write to link the ${sure.length} confident matches.`);
  process.exit(0);
}

assertSafeTarget("link packs to foods", { production: flags.has("--production") });

let written = 0;
for (const m of sure) {
  const { error: writeError } = await supabase
    .from("meal_items")
    .update({ food_id: m.food.id })
    .eq("id", m.item.id);

  if (writeError) console.error(`  ${m.item.name}: ${writeError.message}`);
  else written += 1;
}

console.log(`\nLinked ${written} packs. The rest are waiting on the price book.`);
