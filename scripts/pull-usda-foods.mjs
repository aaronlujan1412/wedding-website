/**
 * Mirror FoodData Central's generic datasets into meal_foods.
 *
 * Foundation and SR Legacy only -- a few thousand generic ingredients, which is
 * nothing for Postgres and everything a kitchen needs. Branded is ~2 million
 * rows of packaging and is excluded; see the migration for why.
 *
 * WHY A MIRROR AND NOT A LIVE SEARCH. Once the foods are local, searching is
 * instant, works offline, costs no quota, and -- the actual requirement -- can
 * rank USDA rows and hand-typed custom foods in ONE query. It also retires a
 * whole class of bug: no Lucene syntax errors from a stray slash, no rate
 * limits mid-run, no HTTP 400 nine items in.
 *
 * WHY NOT THE BULK ZIP. FDC publishes dated dataset archives, so the URL
 * changes with every release and a pinned one rots. The API enumerates ids
 * cheaply and returns full records 20 at a time: about 450 requests for the
 * whole thing, comfortably inside a real key's 3,600 an hour.
 *
 * RESUMABLE. Foods already mirrored are skipped, so an interrupted run is
 * continued by running it again. `--refresh` re-reads everything instead, which
 * is what to do when USDA revises its numbers.
 *
 * Needs a key -- free and instant at https://fdc.nal.usda.gov/api-key-signup.html
 * Put it in .env.local as USDA_API_KEY; it is never printed.
 *
 * Usage:
 *   node --env-file=.env.local  scripts/pull-usda-foods.mjs
 *   node --env-file=.env.local  scripts/pull-usda-foods.mjs --dry-run --limit 40
 *   node --env-file=.env.remote scripts/pull-usda-foods.mjs --production
 *   ... --dataset Foundation    just one dataset
 *   ... --refresh               re-read foods already mirrored
 */

import { createClient } from "@supabase/supabase-js";
import { assertSafeTarget, target } from "./db-target.mjs";
import { readFood } from "./usda-food.mjs";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const value = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};

const DRY = flags.has("--dry-run");
const REFRESH = flags.has("--refresh");
const LIMIT = Number(value("--limit", "0")) || Infinity;
const KEY = process.env.USDA_API_KEY;
const DATASETS = value("--dataset", null)
  ? [value("--dataset", null)]
  : ["Foundation", "SR Legacy"];

if (!KEY) {
  console.error("USDA_API_KEY is not set. Add it to .env.local:");
  console.error("  USDA_API_KEY=<your key>");
  console.error("\nFree and instant: https://fdc.nal.usda.gov/api-key-signup.html");
  process.exit(1);
}

const API = "https://api.nal.usda.gov/fdc/v1";

/* ------------------------------------------------------------------ *
 * HTTP, patiently
 * ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * How long to wait on one request before giving up on it.
 *
 * THE REASON THIS EXISTS. `fetch` has no default timeout, so a connection the
 * far end quietly drops hangs forever. A first run of this import stopped dead
 * at food 140 of 8,187 with the process alive, no error, and no output --
 * indistinguishable from slow. Over ~450 requests a stall is not an edge case,
 * it is a matter of time.
 */
const REQUEST_TIMEOUT = 45_000;

/**
 * One request, retried on a rate limit, a stall or a server error.
 *
 * A real key allows 3,600 an hour and this run needs about 450, so a 429 means
 * something else on the same key is busy -- worth waiting out rather than dying
 * 300 foods in and making the whole thing start over.
 *
 * A 4xx is not retried: the request itself is wrong, and asking again five
 * times only burns quota to get the same answer.
 */
async function ask(path, init) {
  const url = `${API}${path}${path.includes("?") ? "&" : "?"}api_key=${KEY}`;
  let last = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });

      if (response.status === 429) {
        const wait = 2 ** attempt * 15;
        console.log(`\n    rate limited, waiting ${wait}s`);
        await sleep(wait * 1000);
        continue;
      }

      if (!response.ok) {
        // Never include the URL in the message: it carries the key.
        const error = new Error(
          `FDC answered HTTP ${response.status} for ${path.split("?")[0]}`,
        );
        error.retryable = response.status >= 500;
        throw error;
      }

      return await response.json();
    } catch (exc) {
      if (exc.retryable === false) throw exc;
      last = exc;
      if (attempt === 4) break;

      /*
       * The first retry is immediate; the backoff only starts if that fails
       * too. A genuinely busy API wants waiting, but most failures here are a
       * single oversized response (see foodsByIds), and for those the answer is
       * a smaller request rather than a longer wait.
       */
      const wait = attempt === 0 ? 0 : 2 ** (attempt - 1) * 5;
      const why = exc.name === "TimeoutError" ? `no answer in ${REQUEST_TIMEOUT / 1000}s` : exc.message;
      console.log(`\n    ${why}; ${wait ? `retrying in ${wait}s` : "reconnecting"}`);
      if (wait) await sleep(wait * 1000);
    }
  }

  throw last ?? new Error("request failed after five tries");
}

/** Every fdcId in a dataset, 200 at a time. */
async function idsIn(dataset) {
  const ids = [];

  for (let page = 1; ; page += 1) {
    const batch = await ask(
      `/foods/list?dataType=${encodeURIComponent(dataset)}&pageSize=200&pageNumber=${page}`,
    );
    if (!Array.isArray(batch) || !batch.length) break;

    for (const food of batch) if (food.fdcId) ids.push(Number(food.fdcId));
    process.stdout.write(`\r  ${dataset}: ${ids.length} ids`);

    if (batch.length < 200) break;
    await sleep(120);
  }

  process.stdout.write("\n");
  return ids;
}

/**
 * Full records, up to the 20 at a time the endpoint allows -- splitting the
 * batch whenever it proves too slow to fetch whole.
 *
 * WHY SPLITTING AND NOT A BIGGER TIMEOUT. FDC records vary wildly in size. A
 * typical batch of 20 is 0.56 MB and answers in 1.9s; the twenty largest in the
 * database come to 5.57 MB and take 26.7s. There is no timeout that is both
 * tight enough to catch a real stall and loose enough for those, and guessing
 * one is what left the same twenty foods unimported on every run -- they were
 * marginal at 30s and hopeless at 15.
 *
 * Halving adapts to the payload instead. A fat batch costs one wasted attempt
 * and then goes through in pieces; a normal one never notices this exists.
 */
async function foodsByIds(ids) {
  try {
    return await ask("/foods", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fdcIds: ids, format: "full" }),
    });
  } catch (exc) {
    // One id that will not come down is a real failure, not a fat batch.
    if (ids.length === 1) throw exc;

    const half = Math.ceil(ids.length / 2);
    console.log(`\n    a batch of ${ids.length} would not come down; splitting`);
    const head = await foodsByIds(ids.slice(0, half));
    const tail = await foodsByIds(ids.slice(half));
    return [...head, ...tail];
  }
}

/* ------------------------------------------------------------------ *
 * The database
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

const supabase = client();

/**
 * Every row of a select, not the first thousand.
 *
 * PostgREST caps a select at 1,000 rows and says nothing about it. This project
 * has been bitten twice -- a hub that reported 1,000 notes out of 3,430, and a
 * reconcile that asked for the same 2,430 every minute forever. A mirror of
 * ~8,000 foods reading back "which do I already have" is the third place it
 * would have happened.
 */
async function allRows(table, columns) {
  const PAGE = 1000;
  const out = [];

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

/**
 * Every column spelled out, always.
 *
 * A batch insert through PostgREST unions the keys across the batch and sends
 * explicit NULL for any a row omits -- it does NOT fall back to the column
 * default (see scripts/honeymoon-demo.mjs, which learned this the hard way).
 * With rows whose nutrient coverage varies food by food, normalising here is
 * what keeps that from being a silent difference between runs.
 */
const COLUMNS = [
  "kcal", "protein_g", "fat_g", "saturated_fat_g",
  "carbs_g", "fiber_g", "sugar_g", "sodium_mg",
];

function normalize(row) {
  const out = {
    source: "usda",
    fdc_id: row.fdc_id,
    dataset: row.dataset ?? null,
    description: row.description,
    category: row.category ?? null,
    kcal_is_derived: row.kcal_is_derived === true,
    updated_at: new Date().toISOString(),
  };
  for (const column of COLUMNS) out[column] = row[column] ?? null;
  return out;
}

/* ------------------------------------------------------------------ */

console.log(`Database: ${target().url}`);
console.log(`Datasets: ${DATASETS.join(", ")}`);
console.log(`Key: set${DRY ? "  (--dry-run: nothing will be written)" : ""}`);
console.log();

if (!DRY) {
  assertSafeTarget("mirror the USDA food database", {
    production: flags.has("--production"),
  });
}

const known = new Set(
  REFRESH ? [] : (await allRows("meal_foods", "fdc_id")).map((r) => r.fdc_id).filter(Boolean),
);
if (known.size) console.log(`${known.size} foods already mirrored — skipping those.\n`);

let wanted = [];
for (const dataset of DATASETS) wanted.push(...(await idsIn(dataset)));
wanted = [...new Set(wanted)].filter((id) => !known.has(id));

if (LIMIT !== Infinity) wanted = wanted.slice(0, LIMIT);
console.log(`\n${wanted.length} foods to read.\n`);

let foods = 0;
let portions = 0;
let skipped = 0;
const problems = [];

/**
 * Say it when it happens, not only in the summary.
 *
 * A run this long is watched, not waited for, and a fault that only surfaces
 * after 8,000 foods is a fault discovered too late to do anything about.
 */
function note(problem) {
  problems.push(problem);
  console.log(`\n  ! ${problem}`);
}

for (let i = 0; i < wanted.length; i += 20) {
  const batch = wanted.slice(i, i + 20);

  let records;
  try {
    records = await foodsByIds(batch);
  } catch (exc) {
    note(`ids ${batch[0]}…: ${exc.message}`);
    continue;
  }

  const rows = [];
  const byFdcId = new Map();

  for (const record of records ?? []) {
    const parsed = readFood(record);
    if (!parsed) {
      skipped += 1;
      continue;
    }
    rows.push(normalize(parsed.row));
    byFdcId.set(parsed.row.fdc_id, parsed.portions);
  }

  if (!DRY && rows.length) {
    // Upserting on fdc_id is what makes a re-run an update rather than a
    // duplicate, and it is why the column carries a unique constraint.
    const attempt = await supabase
      .from("meal_foods")
      .upsert(rows, { onConflict: "fdc_id" })
      .select("id, fdc_id");

    /*
     * A batch is one statement, so ONE refused row loses the other nineteen.
     * That is how a single carbohydrate of -0.14 cost twenty foods on the
     * first run. Falling back to one at a time keeps the batch's worth and
     * names the food that is actually wrong -- which a statement-level error
     * message never does, because it reports the constraint, not the row.
     */
    let saved;
    if (!attempt.error) {
      saved = attempt.data ?? [];
    } else {
      note(`a batch of ${rows.length} was refused (${attempt.error.message}); retrying singly`);
      saved = [];
      for (const row of rows) {
        const one = await supabase
          .from("meal_foods")
          .upsert(row, { onConflict: "fdc_id" })
          .select("id, fdc_id");
        if (one.error) note(`${row.description}: ${one.error.message}`);
        else saved.push(...(one.data ?? []));
      }
    }

    /*
     * Portions are REPLACED, not merged. They are USDA's list, so a portion
     * that has gone from the source should go from here too -- merging would
     * accumulate every wording FDC ever shipped and leave no way to tell which
     * is current.
     */
    const ids = saved.map((r) => r.id);
    if (ids.length) {
      const { error: clearError } = await supabase
        .from("meal_food_portions")
        .delete()
        .in("food_id", ids);
      if (clearError) note(`clearing portions: ${clearError.message}`);
    }

    const fresh = [];
    for (const row of saved) {
      for (const portion of byFdcId.get(row.fdc_id) ?? []) {
        fresh.push({ food_id: row.id, ...portion });
      }
    }

    if (fresh.length) {
      const { error: portionError } = await supabase.from("meal_food_portions").insert(fresh);
      if (portionError) note(`writing portions: ${portionError.message}`);
      else portions += fresh.length;
    }

    // What LANDED, not what was attempted -- otherwise the closing count
    // reports a mirror more complete than the one in the database.
    foods += saved.length;
  } else {
    for (const list of byFdcId.values()) portions += list.length;
    foods += rows.length;
  }
  process.stdout.write(
    `\r  ${foods} foods, ${portions} portions${problems.length ? `, ${problems.length} problems` : ""}`,
  );
  await sleep(120);
}

process.stdout.write("\n");
console.log(
  `\n${foods} foods, ${portions} portions${skipped ? `, ${skipped} records unreadable` : ""}.`,
);

if (problems.length) {
  console.log(`\n${problems.length} problems:`);
  for (const p of problems.slice(0, 20)) console.log(`  ${p}`);
  if (problems.length > 20) console.log(`  … and ${problems.length - 20} more`);
}

if (DRY) console.log("\n--dry-run: nothing written.");
