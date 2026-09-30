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
import { extraWords, packScore } from "./usda-match.mjs";

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

  /*
   * The tested scorer for precision. It knows a part of a food is not the food
   * (chicken SKIN, quinoa FLOUR, MEATLESS bacon) and, as packScore, that a pack
   * you buy is raw -- dry quinoa at 368 kcal rather than cooked at 120.
   *
   * Then a real tiebreak, because scores tie constantly: every word of "Sweet
   * potatoes" is matched perfectly by both the raw entry and the frozen
   * french-fried one. Without a second key the winner was whichever row
   * Postgres returned first.
   */
  const TIE = 0.02;
  const bucket = (value) => Math.round(value / TIE);

  const ranked = (candidates ?? [])
    .map((food) => ({
      food,
      /*
       * A tie goes to Foundation: measured, rather than carried over from the
       * older SR Legacy tables -- but NOT when the Foundation row has no
       * calorie figure at all. "Prefer the measured one" says nothing about a
       * row with nothing measured, and the nudge was actively picking the
       * worse answer: watermelon went to Foundation's "flesh only" entry,
       * which reports protein and no energy, over SR Legacy's plain
       * "Watermelon, raw" at 30 kcal.
       */
      score:
        packScore(item.name, food.description) +
        (food.dataset === "Foundation" && food.kcal !== null ? 0.02 : 0),
      extra: extraWords(item.name, food.description),
      // A food with no calories cannot answer the question this is asked for.
      hasKcal: food.kcal !== null ? 0 : 1,
    }))
    .sort(
      (a, b) =>
        /*
         * Quantised so the comparator stays TRANSITIVE. Comparing raw scores
         * with a tolerance -- "within 0.02 counts as equal" -- is exactly the
         * inconsistent comparator this repo has been bitten by before: V8 and
         * SpiderMonkey order such ties differently. A linker that proposes a
         * different food depending on which engine ran it is worse than one
         * that is merely wrong, because it is wrong irreproducibly.
         */
        bucket(b.score) - bucket(a.score) ||
        a.hasKcal - b.hasKcal ||
        a.extra - b.extra ||
        a.food.description.localeCompare(b.food.description),
    );

  const best = ranked[0] ?? null;

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
