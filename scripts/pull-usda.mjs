/**
 * Put USDA nutrition on the price book.
 *
 * The recipe library's calories and protein were typed in by hand and cannot be
 * checked. FoodData Central is the reference the rest of the world uses, it is
 * free, and its Foundation and SR Legacy datasets are generic ingredients —
 * "Chicken, thigh, boneless, skinless, raw" — which is exactly what a price
 * book is full of.
 *
 * WHAT THIS CANNOT DO YET. Nutrition is per 100g; a dish's numbers need the
 * grams it uses, and most recipe→item links carry no quantity. So this is the
 * half that can be had now. It is also the half that has to come first.
 *
 * MATCHES ARE PROPOSED, NOT APPLIED BLIND. Every one is printed with both names
 * side by side, and `--min-score` raises the bar. A shopping list says "Chicken
 * thighs, boneless skinless" and the database says "Chicken, thigh, boneless,
 * skinless, raw"; it also says "Babybel Light", which the generic datasets have
 * never heard of and should not be forced to answer.
 *
 * Needs a key — free and instant at https://fdc.nal.usda.gov/api-key-signup.html
 * DEMO_KEY works but allows 30 requests an hour, which is one item in three.
 *
 * Usage:
 *   USDA_API_KEY=... node --env-file=.env.local  scripts/pull-usda.mjs --dry-run
 *   USDA_API_KEY=... node --env-file=.env.remote scripts/pull-usda.mjs --production
 *   ... --only "chicken"   just the items whose name contains this
 *   ... --limit 10         stop after this many lookups
 */

import { createClient } from "@supabase/supabase-js";
import { assertSafeTarget, target } from "./db-target.mjs";
import { queryFor, score } from "./usda-match.mjs";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const value = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};

const DRY = flags.has("--dry-run");
const KEY = process.env.USDA_API_KEY || "DEMO_KEY";
const ONLY = value("--only", null);
const LIMIT = Number(value("--limit", "500"));
const MIN_SCORE = Number(value("--min-score", "0.5"));

/* ------------------------------------------------------------------ *
 * FoodData Central
 * ------------------------------------------------------------------ */

const API = "https://api.nal.usda.gov/fdc/v1";

/**
 * Foundation and SR Legacy only, and in that order of preference.
 *
 * Branded is deliberately excluded. It is a catalogue of packages — every
 * supermarket's own-brand chicken thigh is in there separately — so searching
 * it returns a hundred near-identical rows whose differences are packaging,
 * not food.
 */
async function search(query) {
  const url =
    `${API}/foods/search?query=${encodeURIComponent(queryFor(query))}` +
    `&dataType=Foundation,SR%20Legacy&pageSize=8&api_key=${KEY}`;

  const response = await fetch(url);
  if (response.status === 429) {
    throw new Error(
      "rate limited — DEMO_KEY allows 30 requests an hour. Get a free key at " +
        "https://fdc.nal.usda.gov/api-key-signup.html and set USDA_API_KEY.",
    );
  }
  if (!response.ok) throw new Error(`search failed: HTTP ${response.status}`);
  const body = await response.json();
  return body.foods ?? [];
}

const NUTRIENT = {
  Energy: "kcal",
  Protein: "protein",
  "Total lipid (fat)": "fat",
  "Carbohydrate, by difference": "carbs",
};

/**
 * The four numbers, from a search result.
 *
 * Energy appears twice on many foods, once in kJ and once in kcal, so the unit
 * is checked rather than the name — taking the first Energy gives a number four
 * times too large on about half the database.
 */
function nutrients(food) {
  const out = {};
  for (const n of food.foodNutrients ?? []) {
    const key = NUTRIENT[n.nutrientName];
    if (!key) continue;
    if (key === "kcal" && String(n.unitName).toUpperCase() !== "KCAL") continue;
    if (out[key] === undefined) out[key] = Number(n.value);
  }
  return out;
}

/**
 * Foundation and SR Legacy only, and in that order of preference.
 *
 * Branded is deliberately excluded. It is a catalogue of packages — every
 * supermarket's own-brand chicken thigh is in there separately — so searching
 * it for "chicken thighs" returns a hundred near-identical rows whose
 * differences are packaging, not food. Generic datasets are smaller, curated,
 * and the right answer for a price book.
 */
/** The best generic food for a shopping-list name, or null. */
async function bestFood(itemName) {
  const foods = await search(itemName);
  let best = null;
  let bestScore = 0;

  for (const food of foods) {
    const s = score(itemName, food.description);
    // A tie goes to Foundation: measured rather than carried over from the
    // older SR Legacy tables.
    const preferred = food.dataType === "Foundation" ? 0.02 : 0;
    if (s + preferred > bestScore) {
      bestScore = s + preferred;
      best = food;
    }
  }

  return best ? { food: best, score: bestScore } : null;
}

/*
 * Three answers, not two.
 *
 * A wrong nutrition figure is worse than a missing one — it looks like data and
 * it is silently false — so anything short of confident is reported for a human
 * rather than written. "Whole milk (cooking)" scoring 0.57 against "Cheese,
 * ricotta, whole milk" is exactly the case: two words agree and the food is not
 * the same food.
 */
const CONFIDENT = Number(value("--confident", "0.8"));

/* ------------------------------------------------------------------ */

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set.");
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

const supabase = client();

let query = supabase
  .from("meal_items")
  .select("id, name, category, fdc_id")
  .order("category")
  .order("name");
if (ONLY) query = query.ilike("name", `%${ONLY}%`);

const { data: items, error } = await query;
if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(`${items.length} items${ONLY ? ` matching "${ONLY}"` : ""}`);
console.log(`Key: ${KEY === "DEMO_KEY" ? "DEMO_KEY (30 requests an hour)" : "set"}`);
console.log();

const matched = [];
const uncertain = [];
const missed = [];
let looked = 0;

for (const item of items) {
  if (looked >= LIMIT) break;
  looked += 1;

  let hit;
  try {
    hit = await bestFood(item.name);
  } catch (exc) {
    console.error(`\n${exc.message}`);
    break;
  }

  if (!hit || hit.score < MIN_SCORE) {
    missed.push(item);
    console.log(`  —    ${item.name}`);
    continue;
  }

  const n = nutrients(hit.food);
  // Foundation Foods are measured, and many carry no Energy at all. Atwater
  // (4/9/4) reconstructs it from the macros to within a couple of percent,
  // which beats leaving the field empty on the best entries in the database.
  const derived = n.kcal === undefined;
  const kcal = derived
    ? Math.round((n.protein ?? 0) * 4 + (n.fat ?? 0) * 9 + (n.carbs ?? 0) * 4)
    : Math.round(n.kcal);

  const record = { item, food: hit.food, score: hit.score, n, kcal, derived };
  const sure = hit.score >= CONFIDENT;
  (sure ? matched : uncertain).push(record);

  console.log(
    `  ${sure ? "ok " : "?? "}${hit.score.toFixed(2)} ${item.name}\n` +
      `       -> ${hit.food.description}\n` +
      `          ${kcal} kcal${derived ? " (derived)" : ""}, ` +
      `${n.protein ?? "?"}g protein per 100g`,
  );

  // Courtesy, and it keeps a real key well inside its limits.
  await new Promise((r) => setTimeout(r, 120));
}

console.log(
  `\n${matched.length} confident, ${uncertain.length} uncertain, ${missed.length} not found.`,
);

if (uncertain.length) {
  console.log(
    `\nUncertain — NOT written. Two words agreeing is not the same food.\n` +
      `Check these, then --include-uncertain to accept them, or fix the item name:`,
  );
  for (const u of uncertain) {
    console.log(`  ${u.score.toFixed(2)} ${u.item.name}\n       -> ${u.food.description}`);
  }
}

if (missed.length) {
  console.log("\nNot in the generic datasets (usually branded):");
  for (const m of missed) console.log(`  ${m.name}`);
}

const toWrite = flags.has("--include-uncertain") ? [...matched, ...uncertain] : matched;

if (DRY) {
  console.log("\n--dry-run: nothing written.");
  process.exit(0);
}

console.log(`\nDatabase: ${target().url}`);
assertSafeTarget("write nutrition onto the price book", {
  production: flags.has("--production"),
});

let written = 0;
for (const m of toWrite) {
  const { error: writeError } = await supabase
    .from("meal_items")
    .update({
      fdc_id: m.food.fdcId,
      fdc_description: m.food.description,
      kcal_per_100g: m.kcal,
      protein_per_100g: m.n.protein ?? null,
      fat_per_100g: m.n.fat ?? null,
      carbs_per_100g: m.n.carbs ?? null,
      kcal_is_derived: m.derived,
      nutrition_updated_at: new Date().toISOString(),
    })
    .eq("id", m.item.id);

  if (writeError) console.error(`  ${m.item.name}: ${writeError.message}`);
  else written += 1;
}

console.log(`\nWrote nutrition onto ${written} items.`);
