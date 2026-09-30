/**
 * Import a month that was planned in the old workbook.
 *
 * The plan for October 2026 was built the old way — by hand, into a five-tab
 * .xlsx — before any of this existed. It is a real month with real prices and a
 * real shopping list, so it comes in as data rather than being re-planned from
 * scratch.
 *
 * WHAT IS TRUSTED, AND WHAT IS NOT. Everything in the workbook wins over the
 * library: quantities, prices, the "used for" and the unpack notes were all
 * decided by a person against an actual order. The library is only consulted to
 * MATCH — to find the dish or item a row is talking about — and extended where
 * the workbook knows something it does not.
 *
 * Imported lines are marked `generated = false`, so pressing "build the
 * shopping list" on the site adds to them rather than wiping them. A month
 * someone spent an evening on must not be destroyed by a button that means
 * "recompute".
 *
 * Usage:
 *   node --env-file=.env.local  scripts/import-meal-workbook.mjs <file.xlsx>
 *   node --env-file=.env.remote scripts/import-meal-workbook.mjs <file.xlsx> --production
 *   ... --dry-run    parse and report, write nothing
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { assertSafeTarget, target } from "./db-target.mjs";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const FILE = args.find((a) => !a.startsWith("--"));
const DRY = flags.has("--dry-run");

if (!FILE || !existsSync(FILE)) {
  console.error("Usage: import-meal-workbook.mjs <file.xlsx> [--dry-run] [--production]");
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * Reading the workbook
 *
 * Through Python rather than a Node xlsx library: an .xlsx is a zip of XML and
 * the standard library reads both, so this is one dependency fewer to keep
 * current for a script that will run a handful of times.
 * ------------------------------------------------------------------ */

const READER = `
import json, re, sys, zipfile
from xml.etree import ElementTree as ET
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

def col(ref):
    n = 0
    for ch in re.match(r"[A-Z]+", ref).group(0):
        n = n * 26 + (ord(ch) - 64)
    return n - 1

z = zipfile.ZipFile(sys.argv[1])
names = re.findall(r'<sheet name="([^"]+)"', z.read("xl/workbook.xml").decode())
shared = []
if "xl/sharedStrings.xml" in z.namelist():
    for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall(f"{NS}si"):
        shared.append("".join(t.text or "" for t in si.iter(f"{NS}t")))

out = {}
for i, name in enumerate(names, start=1):
    part = f"xl/worksheets/sheet{i}.xml"
    if part not in z.namelist():
        continue
    rows = []
    for row in ET.fromstring(z.read(part)).iter(f"{NS}row"):
        cells = {}
        for c in row.findall(f"{NS}c"):
            v, is_ = c.find(f"{NS}v"), c.find(f"{NS}is")
            if c.get("t") == "s" and v is not None:
                text = shared[int(v.text)]
            elif is_ is not None:
                text = "".join(t.text or "" for t in is_.iter(f"{NS}t"))
            else:
                text = v.text if v is not None else ""
            cells[col(c.get("r"))] = (text or "").strip()
        width = max(cells) + 1 if cells else 0
        rows.append([cells.get(n, "") for n in range(width)])
    out[name] = rows
json.dump(out, sys.stdout)
`;

const book = JSON.parse(
  execFileSync("python3", ["-c", READER, FILE], { maxBuffer: 32 * 1024 * 1024 }).toString(),
);

/* ------------------------------------------------------------------ *
 * Parsing
 * ------------------------------------------------------------------ */

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * "Sept 29" -> 2026-09-29, and the year rolls when the month goes backwards.
 * A range that starts in September and ends in November is ordinary here; one
 * that starts in December is not, but it would be silently wrong without this.
 */
function dates(labels, startYear) {
  let year = startYear;
  let lastMonth = 0;
  return labels.map((label) => {
    const m = label.match(/([A-Za-z]{3,})\s+(\d{1,2})/);
    if (!m) return null;
    const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (!month) return null;
    if (lastMonth && month < lastMonth) year += 1;
    lastMonth = month;
    return `${year}-${String(month).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  });
}

/** The dish, without the workbook's inline annotations. */
function dishName(raw) {
  return (
    raw
      // "[NEW - DOUBLE IT]", "[FROM THE FREEZER - zero cook]"
      .replace(/\[.*?\]/g, "")
      // "(lightened copycat)" is part of the name; "(Kalamata olives Aaron's
      // half)" is an instruction. Keep short parentheticals, drop long ones.
      .replace(/\(([^)]{28,})\)/g, "")
      /*
       * A spaced dash introduces a descriptor, not more name: "Street tacos
       * (chicken) - build-your-own bar", "FAMILY COOKOUT - grill + pizza
       * oven". Those trailing words diluted the match below the threshold and
       * lost the Oct 2 dinner entirely. Safe to cut because the library's own
       * hyphens are inside words ("Air-fryer", "Sheet-pan"), never spaced.
       */
      .replace(/\s+-\s+.*$/, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** Days that are not a dish: leftovers, prep sessions, free evenings. */
const NOT_A_DISH = /^(leftovers|prep session|cookout leftovers|free\b)/i;

const money = (s) => {
  const n = Number(String(s).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
};

const calendar = [];
{
  const rows = book["Calendar"] ?? [];
  const body = rows.slice(3).filter((r) => r[0] && r[0] !== "COLOR KEY");
  const iso = dates(body.map((r) => r[0]), 2026);

  body.forEach((r, i) => {
    if (!iso[i]) return;
    const raw = r[3] ?? "";
    const whos = r[2] ?? "";
    calendar.push({
      on_date: iso[i],
      raw_dinner: raw,
      dinner: NOT_A_DISH.test(raw.trim()) ? null : dishName(raw),
      lunch: dishName(r[6] ?? "") || null,
      kid_here: /daniel/i.test(whos),
      prep_day: /prep session/i.test(raw),
      supplied_by: r[9] ?? "",
      notes: r[10] || null,
    });
  });
}

const lines = [];
{
  for (const r of book["Shopping Lists"] ?? []) {
    if (!/^Order [12]$/.test(r[0] ?? "")) continue;
    const price = money(r[5]);
    const qty = Number(r[6]);
    if (price === null) continue;
    lines.push({
      ordinal: Number(r[0].slice(-1)),
      item: r[1],
      store: r[2] || null,
      pack: r[3] || null,
      tier: (r[4] || "Core").toLowerCase(),
      unit_price_cents: price,
      quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
      used_for: r[8] || null,
      notes: r[9] || null,
    });
  }
}

const bookRecipes = [];
{
  for (const r of book["Recipes"] ?? []) {
    if (!r[0] || !r[1] || r[0] === "Recipe") continue;
    const kind = String(r[1]).toLowerCase();
    if (!["dinner", "lunch", "snack", "special"].includes(kind)) continue;
    bookRecipes.push({
      name: dishName(r[0]),
      kind,
      serves: Number(r[2]) || null,
      kcal: Number(r[3]) || null,
      protein_g: Number(r[4]) || null,
      method: r[5] || null,
      batch_friendly: /double it|freeze/i.test(`${r[5] ?? ""} ${r[7] ?? ""}`),
    });
  }
}

/* The delivery dates, read from the Overview rather than assumed. */
const deliveries = [];
for (const r of book["Overview"] ?? []) {
  const m = (r.join(" ").match(/Order (\d) subtotal/) ?? [])[1];
  if (!m) continue;
  const when = r.join(" ").match(/Delivered\s+\w+\s+([A-Za-z]{3,})\s+(\d{1,2})/);
  if (!when) continue;
  const month = MONTHS[when[1].slice(0, 3).toLowerCase()];
  deliveries.push({
    ordinal: Number(m),
    delivers_on: `${month >= 9 ? 2026 : 2026}-${String(month).padStart(2, "0")}-${when[2].padStart(2, "0")}`,
  });
}

const title = (book["Calendar"]?.[0]?.[0] ?? "Imported plan").replace(/^CALENDAR\s*\|\s*/, "");
const starts_on = calendar[0]?.on_date;
const ends_on = calendar[calendar.length - 1]?.on_date;
const counted = lines
  .filter((l) => l.tier !== "optional")
  .reduce((n, l) => n + l.unit_price_cents * l.quantity, 0);

console.log(`Read ${FILE}`);
console.log(`  ${title}`);
console.log(`  ${calendar.length} days, ${starts_on} .. ${ends_on}`);
console.log(`  ${calendar.filter((d) => d.dinner).length} dinners, ${calendar.filter((d) => d.prep_day).length} prep days, ${calendar.filter((d) => d.kid_here).length} kid days`);
console.log(`  ${deliveries.length} deliveries: ${deliveries.map((d) => `#${d.ordinal} ${d.delivers_on}`).join(", ")}`);
console.log(`  ${lines.length} shopping lines, $${(counted / 100).toFixed(2)} counted`);
console.log(`  ${bookRecipes.length} dishes described`);

if (!starts_on || !ends_on || !deliveries.length) {
  console.error("\nCouldn't read the range or the deliveries — not importing.");
  process.exit(1);
}

/* ------------------------------------------------------------------ *
 * Writing
 * ------------------------------------------------------------------ */

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

/** Match loosely, because the workbook and the library name things differently. */
function match(name, candidates) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const want = norm(name);
  if (!want) return null;

  /*
   * Ranked by how many words agree FIRST, and only then by proportion.
   *
   * Proportion alone gets this wrong in a way that is easy to miss: a short
   * name wholly contained in a long one scores a perfect 1.0. "Frozen stir-fry
   * / broccoli vegetable blend" matched "Frozen broccoli" (2 of 2 words) over
   * "Stir-fry / broccoli veg blend" (4 words shared), which are two different
   * products at two different prices. Counting the overlap first prefers the
   * candidate that actually shares more of the name.
   */
  let best = null;
  let bestHits = 0;
  let bestScore = 0;
  for (const c of candidates) {
    const have = norm(c.name);
    if (have === want) return c;
    const a = new Set(want.split(" "));
    const b = new Set(have.split(" "));
    const hits = [...a].filter((w) => b.has(w) && w.length > 2);
    if (!hits.length) continue;
    const score = Math.max(hits.length / a.size, hits.length / b.size);
    if (score < 0.6) continue;
    if (hits.length > bestHits || (hits.length === bestHits && score > bestScore)) {
      bestHits = hits.length;
      bestScore = score;
      best = c;
    }
  }
  return best;
}

const [existingRecipes, existingItems] = await Promise.all([
  supabase.from("meal_recipes").select("id, name"),
  supabase.from("meal_items").select("id, name, pack"),
]);

const recipeList = existingRecipes.data ?? [];
const itemList = existingItems.data ?? [];

const newRecipes = bookRecipes.filter((r) => !match(r.name, recipeList));
const unmatchedDishes = [
  ...new Set(
    calendar
      .filter((d) => d.dinner)
      .map((d) => d.dinner)
      .filter((n) => !match(n, recipeList) && !bookRecipes.some((r) => match(n, [r]))),
  ),
];
const newItems = [...new Map(
  lines.filter((l) => !match(l.item, itemList)).map((l) => [l.item, l]),
).values()];

console.log(`\nAgainst the library:`);
console.log(`  ${newRecipes.length} dishes to add: ${newRecipes.map((r) => r.name).join(", ") || "none"}`);
console.log(`  ${newItems.length} items to add: ${newItems.map((i) => i.item).join(", ") || "none"}`);
if (unmatchedDishes.length) {
  console.log(`  ${unmatchedDishes.length} calendar dishes with no description: ${unmatchedDishes.join(", ")}`);
}

if (DRY) {
  console.log("\n--dry-run: nothing written.");
  process.exit(0);
}

console.log(`\nDatabase: ${target().url}`);
assertSafeTarget(`import ${title}`, { production: flags.has("--production") });

// Dishes the workbook describes and the library lacks.
if (newRecipes.length) {
  const { error } = await supabase.from("meal_recipes").insert(
    newRecipes.map((r) => ({
      ...r,
      // Unknown, and guessing is worse than saying so: 'any' would let the
      // scheduler park a fresh-produce dish at day fourteen.
      window_when: "any",
      notes: "Imported from the October workbook — check its window.",
    })),
  );
  if (error) console.error(`  recipes: ${error.message}`);
}

// Items the shopping list names and the price book lacks.
if (newItems.length) {
  const { error } = await supabase.from("meal_items").insert(
    newItems.map((l) => ({
      name: l.item,
      pack: l.pack,
      store: l.store,
      tier: ["core", "pantry", "optional"].includes(l.tier) ? l.tier : "core",
      category: "other",
      price_cents: l.unit_price_cents,
      priced_on: new Date().toISOString().slice(0, 10),
      notes: "Imported from the October workbook.",
    })),
  );
  if (error) console.error(`  items: ${error.message}`);
}

// Re-read so the new rows are matchable.
const [allRecipes, allItems] = await Promise.all([
  supabase.from("meal_recipes").select("id, name"),
  supabase.from("meal_items").select("id, name, pack"),
]);

const { data: plan, error: planError } = await supabase
  .from("meal_plans")
  .insert({
    name: title,
    starts_on,
    ends_on,
    budget_cents: 80000,
    status: "final",
    notes: "Imported from the workbook it was originally planned in.",
  })
  .select("id")
  .single();

if (planError) {
  console.error(`  plan: ${planError.message}`);
  process.exit(1);
}

const { data: orders } = await supabase
  .from("meal_plan_orders")
  .insert(
    deliveries.map((d) => ({
      plan_id: plan.id,
      ordinal: d.ordinal,
      delivers_on: d.delivers_on,
      store: d.ordinal === 1 ? "Costco" : "Sam's Club",
    })),
  )
  .select("id, ordinal");

await supabase.rpc("fill_meal_plan_days", { p_plan: plan.id });

// The calendar.
const { data: days } = await supabase
  .from("meal_plan_days")
  .select("id, on_date")
  .eq("plan_id", plan.id);

const dayId = new Map((days ?? []).map((d) => [d.on_date, d.id]));
let placed = 0;
for (const day of calendar) {
  const id = dayId.get(day.on_date);
  if (!id) continue;
  const dish = day.dinner ? match(day.dinner, allRecipes.data ?? []) : null;
  if (dish) placed += 1;
  await supabase
    .from("meal_plan_days")
    .update({
      dinner_recipe_id: dish?.id ?? null,
      kid_here: day.kid_here,
      prep_day: day.prep_day,
      notes: day.notes,
      eaters: day.kid_here ? 3 : 2,
    })
    .eq("id", id);
}

// The shopping list, as the person wrote it.
const orderId = new Map((orders ?? []).map((o) => [o.ordinal, o.id]));
const rows = [];
let dropped = 0;
for (const line of lines) {
  const item = match(line.item, allItems.data ?? []);
  const order = orderId.get(line.ordinal);
  if (!item || !order) {
    dropped += 1;
    continue;
  }
  rows.push({
    plan_id: plan.id,
    order_id: order,
    item_id: item.id,
    quantity: line.quantity,
    unit_price_cents: line.unit_price_cents,
    tier: ["core", "pantry", "optional"].includes(line.tier) ? line.tier : "core",
    used_for: line.used_for,
    notes: line.notes,
    // A person decided these against a real order, so they are not guesses,
    // and "build the shopping list" must add to them rather than replace them.
    quantity_is_a_guess: false,
    generated: false,
  });
}

if (rows.length) {
  const { error } = await supabase
    .from("meal_plan_items")
    .upsert(rows, { onConflict: "order_id,item_id" });
  if (error) console.error(`  lines: ${error.message}`);
}

console.log(`\nImported.`);
console.log(`  ${placed} of ${calendar.filter((d) => d.dinner).length} dinners matched to dishes`);
console.log(`  ${rows.length} shopping lines${dropped ? `, ${dropped} dropped` : ""}`);
console.log(`  plan id ${plan.id}`);
