#!/usr/bin/env node
/**
 * Puts a nightly backup back.
 *
 * `/api/backup` writes a dated JSON into the private `backups` bucket every
 * morning. This is the other half — without it those files are just reassurance.
 *
 *   node --env-file=.env.remote scripts/restore-backup.mjs
 *       lists what's in the bucket and stops
 *
 *   node --env-file=.env.remote scripts/restore-backup.mjs 2026-09-14.json \
 *       --tables trip_legs,trip_days,trip_items,trip_docs
 *       restores just those tables from that file
 *
 * Restoring replaces the listed tables outright, so it takes a snapshot of
 * what is there first and refuses to run without --force. Restrict --tables to
 * what you actually lost: putting the whole guest list back over a live one is
 * rarely what you want.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { assertSafeTarget } from "./db-target.mjs";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

const BUCKET = "backups";
const LOCAL_DIR = "supabase/.backups";

/**
 * Parents before children, so a restore of everything satisfies its own FKs.
 *
 * PostgREST refuses an unfiltered delete, so each one filters on
 * "primary key is not null" — true for every row, and type-agnostic. A
 * sentinel value would have to know whether the key is a uuid, a date or a
 * smallint, and `faq.id` is a smallint.
 */
const ORDER = [
  "guest_groups",
  "guests",
  "seating_tables",
  "guest_photos",
  "faq",
  "trip_legs",
  "trip_days",
  "trip_items",
  "trip_docs",
  "trip_flights",
  "trip_checklist_items",
];

const KEY_OF = { trip_days: "on_date" };

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const force = args.includes("--force");
const only = (() => {
  const i = args.indexOf("--tables");
  return i === -1 ? null : new Set(args[i + 1].split(","));
})();

async function list() {
  const { data, error } = await db.storage.from(BUCKET).list();
  if (error) throw error;
  return (data ?? [])
    .filter((f) => f.name.endsWith(".json"))
    .sort((a, b) => (a.name < b.name ? 1 : -1));
}

if (!file) {
  const files = await list();
  console.log(
    `Backups in "${BUCKET}" on ${process.env.NEXT_PUBLIC_SUPABASE_URL}:`,
  );
  if (files.length === 0) console.log("  (none — has the cron run yet?)");
  for (const f of files) {
    const kb = Math.round((f.metadata?.size ?? 0) / 1024);
    console.log(
      `  ${f.name}  ${String(kb).padStart(5)} KB  ${f.created_at ?? ""}`,
    );
  }
  console.log("\nPass a filename to restore from it. Nothing changed.");
  process.exit(0);
}

const { data: blob, error } = await db.storage.from(BUCKET).download(file);
if (error) {
  console.error(`Could not read ${file}: ${error.message}`);
  process.exit(1);
}

const dump = JSON.parse(await blob.text());
const tables = ORDER.filter(
  (t) => dump.tables[t] !== undefined && (!only || only.has(t)),
);

console.log(`${file} taken ${dump.takenAt}`);
for (const t of tables)
  console.log(`  ${t.padEnd(16)} ${dump.tables[t].length} rows`);

if (!force) {
  console.error("\nThis replaces those tables outright. Re-run with --force.");
  process.exit(1);
}

assertSafeTarget("restore", { production: args.includes("--production") });

// Snapshot what is about to be replaced, so a wrong restore is also undoable.
const current = {};
for (const t of tables) {
  const { data } = await db.from(t).select();
  current[t] = data ?? [];
}
await mkdir(LOCAL_DIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const safety = `${LOCAL_DIR}/before-restore-${stamp}.json`;
await writeFile(safety, JSON.stringify({ tables: current }, null, 2));
console.log(`\nCurrent contents saved to ${safety}`);

// Children first on the way out, parents first on the way in.
for (const t of [...tables].reverse()) {
  const { error } = await db
    .from(t)
    .delete()
    .not(KEY_OF[t] ?? "id", "is", null);
  if (error) throw new Error(`clearing ${t}: ${error.message}`);
}

for (const t of tables) {
  const rows = dump.tables[t];
  if (rows.length === 0) continue;
  const { error } = await db.from(t).insert(rows);
  if (error) throw new Error(`restoring ${t}: ${error.message}`);
  console.log(`  ${t.padEnd(16)} ${rows.length} restored`);
}

console.log(`\nRestored from ${file}.`);
