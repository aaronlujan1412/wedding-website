/**
 * Seed the meal library from the skill's own reference files.
 *
 * The meal-plan skill kept three things on disk: a price book, a recipe
 * library, and one fully worked month. All three are good data that took real
 * calibration to produce — the price book's header records that pricing from
 * intuition instead came in 75% over budget — so the library starts from them
 * rather than from empty tables.
 *
 * The interesting part is the third file. Neither markdown file links a dish to
 * the items it needs, but the worked month does, sideways: every shopping line
 * carries a "Used for" field naming the dishes it was bought for
 * ("Greek sheet-pan 9/1 | Souvlaki 9/7 | Street tacos 9/9"). Reversing that
 * gives a recipe -> item graph recovered from a month that actually worked,
 * which beats inventing one.
 *
 * Idempotent: re-running updates rather than duplicating, so it can be pointed
 * at a database that already has edits without flattening them. Prices are the
 * exception — a changed price appends to meal_item_prices so the history
 * survives.
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-meal-library.mjs [--skill <dir>]
 *   node --env-file=.env.remote scripts/seed-meal-library.mjs --production
 *   ... --dry-run   parse and report, write nothing
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { assertSafeTarget, target } from "./db-target.mjs";

/** Tags rows this script owns, so a re-run can clear them without touching
 * anything a person added by hand. */
const SEED_MARKER = "recovered from Sept 2026 plan";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const DRY = flags.has("--dry-run");

const skillArg = args.indexOf("--skill");
const SKILL =
  skillArg !== -1 && args[skillArg + 1]
    ? args[skillArg + 1]
    : findSkill();

function findSkill() {
  const base = `${process.env.HOME}/.claude/skills/synced`;
  if (!existsSync(base)) return null;
  for (const dir of readdirSync(base)) {
    const candidate = join(base, dir, "meal-plan-monthly");
    if (existsSync(join(candidate, "SKILL.md"))) return candidate;
  }
  return null;
}

if (!SKILL || !existsSync(SKILL)) {
  console.error("Could not find the meal-plan-monthly skill.");
  console.error("Pass it explicitly:  --skill /path/to/meal-plan-monthly");
  process.exit(1);
}

const read = (p) => readFileSync(join(SKILL, p), "utf8");

/* ------------------------------------------------------------------ *
 * Parsing
 * ------------------------------------------------------------------ */

const money = (s) => {
  const m = String(s).match(/\$?\s*([\d,]+(?:\.\d{1,2})?)/);
  return m ? Math.round(parseFloat(m[1].replace(/,/g, "")) * 100) : null;
};

/** Strip the markdown emphasis the reference files use for emphasis, not data. */
const plain = (s) =>
  String(s)
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();

/** Rows of a markdown table, as arrays of cells. Header and rule dropped. */
function tableRows(block) {
  return block
    .split("\n")
    .filter((line) => line.trim().startsWith("|"))
    .map((line) =>
      line
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((c) => plain(c)),
    )
    .filter((cells) => !cells.every((c) => /^-*:?-*$/.test(c) || c === ""))
    .slice(1);
}

/** Everything under a `## Heading` up to the next one. */
function section(markdown, heading) {
  const re = new RegExp(`^## ${heading}\\s*$`, "im");
  const start = markdown.search(re);
  if (start === -1) return "";
  const after = markdown.slice(start);
  const next = after.slice(1).search(/^## /m);
  return next === -1 ? after : after.slice(0, next + 1);
}

/** "3+ weeks", "10 days", "Full month" -> days. */
function keepsDays(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  if (t.includes("full month")) return 30;
  const m = t.match(/(\d+)\s*(\+)?\s*(day|week)/);
  if (!m) return null;
  const n = Number(m[1]);
  return m[3] === "week" ? n * 7 : n;
}

/** The price book, as items. */
function parsePriceBook() {
  const md = read("references/price_book.md");

  // Heading -> the category and tier every row under it inherits.
  const groups = [
    ["Protein", "protein", "core"],
    ["Dairy", "dairy", "core"],
    ["Produce - keeps 2\\+ weeks, buy once per month", "produce-hardy", "core"],
    ["Produce - week-one only, buy on both orders", "produce-fresh", "core"],
    ["Frozen - the coverage fix", "frozen", "core"],
    ["Grains, beans, wraps", "grain", "core"],
    ["Pantry and condiment - right-size these", "pantry", "pantry"],
    ["Optional-tier snacks", "snack", "optional"],
  ];

  const items = [];
  for (const [heading, category, tier] of groups) {
    for (const cells of tableRows(section(md, heading))) {
      const [name, pack, price, ...rest] = cells;
      if (!name || !price) continue;
      const cents = money(price);
      if (cents === null) continue;

      // The two produce tables put "Keeps"/"Use within" where the others put
      // notes, so the column means different things by section.
      const keeps = category.startsWith("produce")
        ? keepsDays(rest[0])
        : keepsDays(rest.join(" "));

      items.push({
        name,
        store: null,
        pack: pack || null,
        category,
        tier,
        price_cents: cents,
        keeps_days: keeps,
        notes: (category.startsWith("produce") ? rest.slice(1) : rest)
          .filter(Boolean)
          .join(" ") || null,
      });
    }
  }
  return items;
}

/** The recipe library, as recipes. */
function parseRecipes() {
  const md = read("references/recipe_library.md");
  const out = [];

  const windowOf = (raw) => {
    const t = (raw || "").toLowerCase();
    if (t.includes("day 0-2") || t.includes("day0-2")) return "day0-2";
    if (t.includes("early")) return "early";
    if (t.includes("mid")) return "mid";
    return "any";
  };
  const int = (s) => {
    const m = String(s).match(/\d+/);
    return m ? Number(m[0]) : null;
  };

  for (const cells of tableRows(section(md, "Dinners"))) {
    const [name, serves, kcal, protein, method, window, notes] = cells;
    if (!name) continue;
    out.push({
      name,
      kind: "dinner",
      serves: int(serves),
      kcal: int(kcal),
      protein_g: int(protein),
      method: method || null,
      window_when: windowOf(window),
      notes: notes || null,
      batch_friendly: /double it and freeze|freezes/i.test(notes || ""),
    });
  }

  for (const cells of tableRows(section(md, "Special occasion"))) {
    const [name, serves, kcal, , notes] = cells;
    if (!name) continue;
    out.push({
      name: name.replace(/\s*-\s*.*$/, "").trim(),
      kind: "special",
      serves: int(serves),
      kcal: int(kcal),
      protein_g: null,
      method: null,
      window_when: "any",
      notes: notes || null,
      batch_friendly: false,
    });
  }

  for (const cells of tableRows(section(md, "Prep-ahead lunches - no orzo"))) {
    const [name, serves, kcal, protein, holds, window] = cells;
    if (!name) continue;
    out.push({
      name,
      kind: "lunch",
      serves: int(serves),
      kcal: int(kcal),
      protein_g: int(protein),
      method: null,
      window_when: windowOf(window),
      notes: holds ? `Holds ${holds}.` : null,
      batch_friendly: /freeze/i.test(holds || ""),
    });
  }

  for (const cells of tableRows(section(md, "Homemade batch snacks"))) {
    const [name, yieldCol, kcal, protein, method] = cells;
    if (!name) continue;
    out.push({
      name,
      kind: "snack",
      serves: int(yieldCol),
      kcal: int(kcal),
      protein_g: int(protein),
      method: method || null,
      window_when: "any",
      notes: yieldCol ? `Yield: ${yieldCol}.` : null,
      batch_friendly: true,
    });
  }

  return out;
}

/**
 * The recipe -> item graph, recovered from the worked month.
 *
 * Each shopping tuple's 8th element is the "Used for" string. The dish names in
 * it are abbreviated and carry dates ("Greek sheet-pan 9/1"), so they are
 * matched back to the library by longest-prefix rather than equality.
 */
function parseLinks(recipeNames) {
  const src = read("assets/plan_data_example_sept2026.py");

  // Each entry is a parenthesised tuple of 9 fields; the quoted strings in
  // order are: order, item, store, pack, priority, [price], [qty], used-for,
  // notes. Pulling the tuples out by brackets is more robust than trying to
  // parse Python.
  const links = new Map(); // recipe -> Set(item)
  const tupleRe = /\(\s*'(Order [12])',\s*((?:.|\n)*?)\)\s*(?=,\s*\(|\s*\])/g;

  let match;
  let tuples = 0;
  while ((match = tupleRe.exec(src)) !== null) {
    tuples += 1;
    const body = match[2];
    const strings = [...body.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)].map(
      (m) => (m[1] ?? m[2] ?? "").replace(/\\'/g, "'").replace(/\\"/g, '"'),
    );
    if (strings.length < 3) continue;

    /*
     * Counted from the START, never the end. The tuple is a fixed shape --
     * (order, item, store, pack, tier, price, qty, used-for, notes) -- but the
     * notes routinely contain quoted text of their own ("labeled '9/9 tacos'"),
     * so the number of quoted strings per line varies between 6 and 8. Taking
     * the second-from-last landed on the notes for every such line, which is
     * why the first pass recovered 17 links instead of 90.
     */
    const item = strings[0];
    const usedFor = strings[4];
    if (!item || !usedFor) continue;

    for (const raw of usedFor.split("|")) {
      const dish = raw
        .replace(/\d{1,2}\/\d{1,2}/g, "")
        .replace(/\(.*?\)/g, "")
        .trim();
      if (dish.length < 4) continue;

      const hit = bestMatch(dish, recipeNames);
      if (!hit) continue;
      if (!links.has(hit)) links.set(hit, new Set());
      links.get(hit).add(item);
    }
  }

  return { links, tuples };
}

/**
 * Match a shorthand name to a list of real ones.
 *
 * Used twice, for the same reason in both places: the worked month writes
 * names loosely. Dishes appear abbreviated ("Korean beef" for "Lean Korean
 * beef bowl") and items appear elaborated ("Panko breadcrumbs" for "Panko",
 * "Dried cannellini beans" for "Dried cannellini"). Neither is a prefix of the
 * other, so this compares word sets.
 *
 * The fragments are shorthand, not prefixes: "Korean beef" for "Lean Korean
 * beef bowl", "Crunchwrap" for "High-protein crunchwrap supreme", "McNuggets"
 * for 'Air-fryer "McNuggets" + oven fries'. Matching on a shared opening ran
 * aground on every one of those and recovered 19 links; matching on how many
 * of the fragment's words appear anywhere in the name recovers the rest.
 *
 * Ties go to the SHORTEST library name, so "Big Mac bowl" picks the dinner
 * rather than "Big Mac bowl meal prep" — a fragment names the thing it is
 * closest to, and the longer name carries words the fragment chose to omit.
 */
function bestMatch(fragment, names) {
  const words = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !NOISE.has(w));

  const want = words(fragment);
  if (!want.length) return null;

  let best = null;
  let bestScore = 0;
  let bestLength = Infinity;

  for (const name of names) {
    const have = new Set(words(name));
    const hits = want.filter((w) => have.has(w));
    if (!hits.length) continue;

    /*
     * Directional, taking whichever way round scores better. A fragment often
     * QUALIFIES the real name rather than abbreviating it -- "Chicken sausage
     * (Aidells or similar)" for "Chicken sausage", "Corn tortillas,
     * street-taco size" for "Corn tortillas" -- and dividing by the fragment's
     * word count buries those at 0.4 while the right answer is a perfect match
     * of every word the candidate has.
     */
    const score = Math.max(hits.length / want.length, hits.length / have.size);
    /*
     * Enough signal to be a real match: either one distinctive word, or two
     * short ones agreeing. A single short word is not enough — "beef" alone
     * would bind every beef line to the Korean beef bowl — but "big mac" and
     * "taco bar" are both unambiguous and have no long word in them, which a
     * length test alone rejected.
     */
    if (hits.length < 2 && !hits.some((w) => w.length >= 5)) continue;
    if (score < 0.6) continue;

    if (score > bestScore || (score === bestScore && have.size < bestLength)) {
      bestScore = score;
      bestLength = have.size;
      best = name;
    }
  }
  return best;
}

/** Words that carry no dish identity — they appear in half the fragments. */
const NOISE = new Set([
  "the", "and", "with", "for", "plus", "prep", "batch", "night", "day",
  "half", "both", "all", "one", "two", "each", "from", "into", "this",
]);

/* ------------------------------------------------------------------ *
 * Writing
 * ------------------------------------------------------------------ */

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

const items = parsePriceBook();
const recipes = parseRecipes();
const { links, tuples } = parseLinks(recipes.map((r) => r.name));

const linkCount = [...links.values()].reduce((n, s) => n + s.size, 0);

console.log(`Parsed from ${SKILL}`);
console.log(`  ${items.length} priced items`);
console.log(`  ${recipes.length} recipes (${recipes.filter((r) => r.kind === "dinner").length} dinners)`);
console.log(`  ${linkCount} recipe->item links across ${links.size} dishes, from ${tuples} shopping lines`);

if (DRY) {
  console.log("\n--dry-run: nothing written.");
  const unlinked = recipes.filter((r) => r.kind === "dinner" && !links.has(r.name));
  if (unlinked.length) {
    console.log(`\nDinners with no ingredients recovered (${unlinked.length}):`);
    for (const r of unlinked) console.log(`  ${r.name}`);
  }
  process.exit(0);
}

const supabase = client();
console.log(`\nDatabase: ${target().url}`);
assertSafeTarget("seed the meal library", { production: flags.has("--production") });

/* Items. Upsert on (name, store), and append to the price history whenever the
 * price actually moved — so re-running against a re-priced book records the
 * change rather than erasing it. */
const { data: existingItems } = await supabase
  .from("meal_items")
  .select("id, name, store, price_cents");
const priorPrice = new Map(
  (existingItems ?? []).map((r) => [`${r.name} ${r.store ?? ""}`, r]),
);

const { data: writtenItems, error: itemError } = await supabase
  .from("meal_items")
  .upsert(
    items.map((i) => ({ ...i, priced_on: new Date().toISOString().slice(0, 10) })),
    // Pack included: the same product in two sizes is two lines, and the
    // cheaper of two bag sizes is a real choice, not a duplicate.
    { onConflict: "name,store,pack" },
  )
  .select("id, name, store, price_cents");

if (itemError) {
  console.error(`items: ${itemError.message}`);
  process.exit(1);
}

const history = [];
for (const row of writtenItems ?? []) {
  const before = priorPrice.get(`${row.name} ${row.store ?? ""}`);
  if (!before || before.price_cents !== row.price_cents) {
    history.push({ item_id: row.id, price_cents: row.price_cents, source: "price_book.md" });
  }
}
if (history.length) {
  await supabase.from("meal_item_prices").insert(history);
}
console.log(`  items:   ${writtenItems?.length ?? 0} written, ${history.length} price points recorded`);

// Recipes.
const { data: writtenRecipes, error: recipeError } = await supabase
  .from("meal_recipes")
  .upsert(recipes, { onConflict: "name" })
  .select("id, name");

if (recipeError) {
  console.error(`recipes: ${recipeError.message}`);
  process.exit(1);
}
console.log(`  recipes: ${writtenRecipes?.length ?? 0} written`);

// Links. Only where both ends resolved; a "Used for" naming a dish or an item
// that is not in the library is dropped rather than inventing a row for it.
const itemId = new Map((writtenItems ?? []).map((r) => [r.name, r.id]));
const recipeId = new Map((writtenRecipes ?? []).map((r) => [r.name, r.id]));

const rows = [];
const dropped = new Set();
for (const [recipe, itemNames] of links) {
  const rid = recipeId.get(recipe);
  if (!rid) continue;
  for (const name of itemNames) {
    // Exact first, then the same fuzzy pass the dish names get. Twelve of the
    // fifteen unmatched names were the same item written differently.
    const iid = itemId.get(name) ?? itemId.get(bestMatch(name, [...itemId.keys()]) ?? "");
    if (!iid) {
      // Bought that month but absent from the price book — usually a one-off
      // for a guest meal, sometimes a name that drifted between the two files.
      // Named rather than counted, because the second kind is worth fixing and
      // a bare number never tells you which kind you have.
      dropped.add(name);
      continue;
    }
    rows.push({ recipe_id: rid, item_id: iid, notes: SEED_MARKER });
  }
}

/*
 * Replace what this script owns, rather than upserting onto it.
 *
 * An upsert alone is NOT idempotent here: a link this run no longer produces
 * stays behind, so successive runs accumulate. Four runs while the matcher was
 * being tuned left 370 links and gave "Street tacos" 33 ingredients, every
 * stale guess from every earlier rule still sitting there.
 *
 * Scoped by the marker in `notes`, so a link added by hand in the UI survives
 * — this deletes the seed's own output and nothing else.
 */
const { error: clearError } = await supabase
  .from("meal_recipe_items")
  .delete()
  .eq("notes", SEED_MARKER);

if (clearError) {
  console.error(`links: ${clearError.message}`);
  process.exit(1);
}

if (rows.length) {
  const { error } = await supabase
    .from("meal_recipe_items")
    .upsert(rows, { onConflict: "recipe_id,item_id" });
  if (error) {
    console.error(`links: ${error.message}`);
    process.exit(1);
  }
}
console.log(`  links:   ${rows.length} written`);
if (dropped.size) {
  console.log(`  ${dropped.size} item names in the plan are not in the price book:`);
  for (const name of [...dropped].sort()) console.log(`    ${name}`);
}

// The standing setup and the hard rules, only if nobody has set them yet —
// these are the ones a person edits, so a re-run must not stamp on them.
const { count: settingsCount } = await supabase
  .from("meal_settings")
  .select("*", { count: "exact", head: true });

if (!settingsCount) {
  await supabase.from("meal_settings").insert({
    id: true,
    budget_cents: 80000,
    orders_per_month: 2,
    aaron_kcal: 1900,
    savea_kcal: 1200,
    kid_cycle_days: 14,
    notes:
      "Dinners Mon-Fri; weekends leftovers. Sunday is a prep session. Daniel is here Wednesday dinner through Saturday morning, every other week.",
  });
  console.log("  settings: seeded");
}

const { count: ruleCount } = await supabase
  .from("meal_rules")
  .select("*", { count: "exact", head: true });

if (!ruleCount) {
  await supabase.from("meal_rules").insert([
    { label: "No orzo", detail: "Aaron dislikes it. Nothing in a plan may contain orzo.", forbidden_term: "orzo", sort_order: 1 },
    { label: "Olives, Aaron only", detail: "Savea hates them. Her grab bench and any shared serving dish must be completely olive-free; at a gathering olives go in a separate bowl at Aaron's end.", forbidden_term: "olive", applies_to: "savea", sort_order: 2 },
    { label: "Homemade jerky always", detail: "Two batches, with the eye of round and marinade costed into the shopping list. Give oven, air-fryer and sous-vide methods.", sort_order: 3 },
    { label: "Dried beans, never canned", detail: "Fridge-soak only. Kidney-family beans need a 10-minute hard rolling boil before slow cooking; chickpeas and black beans cook straight in.", sort_order: 4 },
    { label: "4 gallons of kefir", detail: "Two per order, kept separate from cooking milk and never used in a recipe.", sort_order: 5 },
    { label: "No dinner more than twice", detail: "No dinner repeats more than twice in a month.", sort_order: 6 },
    { label: "Branch beyond Mediterranean", detail: "Fitness-influencer fast-food copycats are welcome if they hit the calorie targets. Mediterranean dishes stay the reheatable backbone.", sort_order: 7 },
  ]);
  console.log("  rules:    seeded");
}

console.log("\nSeeded.");
