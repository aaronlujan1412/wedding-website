#!/usr/bin/env node
/**
 * Pulls full-resolution guest photo originals out of Supabase onto disk.
 *
 * This is the fallback path, not the main one. Originals normally go straight
 * from the guest's browser to the home server (the homelab repo's
 * stacks/wedding-photo-receiver) and never touch Supabase at all. They land in
 * this bucket only when that box did not answer — paused before a gaming
 * session, mid-reboot, or simply asleep — because a wedding photo uploads once
 * and losing it was not an acceptable trade for a tidy design.
 *
 * So an empty run is the healthy result. A large one means the home server has
 * been unreachable for a while.
 *
 * Run it from this repo, where .env.local already holds the keys, and let the
 * output directory be a mount or an rsync target. Deliberately not designed to
 * run on the homelab itself: that would mean putting SUPABASE_SECRET_KEY on a
 * box whose internet-exposed Nextcloud container can read every file on it.
 *
 *   node scripts/pull-originals.mjs /mnt/media/wedding-originals
 *   node scripts/pull-originals.mjs /mnt/media/wedding-originals --purge
 *
 * Idempotent: anything already on disk is skipped, so re-running only fetches
 * what is new. --purge deletes each object from Supabase after it has been
 * written and size-checked, which is how you keep the bucket from filling up.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const BUCKET = "guest-photo-originals";

const [, , rawTarget, ...flags] = process.argv;
if (!rawTarget) {
  console.error("usage: node scripts/pull-originals.mjs <directory> [--purge]");
  process.exit(1);
}
const target = resolve(rawTarget);
const purge = flags.includes("--purge");

function loadEnv() {
  const merged = { ...process.env };
  const file = new URL("../.env.local", import.meta.url);
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      if (!line.includes("=") || line.trimStart().startsWith("#")) continue;
      const at = line.indexOf("=");
      const key = line.slice(0, at).trim();
      if (!merged[key]) merged[key] = line.slice(at + 1).trim();
    }
  }
  return merged;
}

const env = loadEnv();
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set.");
  process.exit(1);
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

/** Objects live at <groupId|hosts>/<uuid>.<ext>, so this is one level deep. */
async function listAll() {
  const { data: folders, error } = await db.storage.from(BUCKET).list("", { limit: 1000 });
  if (error) throw new Error(`listing buckets: ${error.message}`);

  const paths = [];
  for (const folder of folders ?? []) {
    // A real file at the root has an id; a folder placeholder does not.
    if (folder.id) {
      paths.push(folder.name);
      continue;
    }
    const { data: files } = await db.storage
      .from(BUCKET)
      .list(folder.name, { limit: 1000 });
    for (const file of files ?? []) paths.push(`${folder.name}/${file.name}`);
  }
  return paths;
}

const paths = await listAll();
console.log(`${paths.length} original${paths.length === 1 ? "" : "s"} in the bucket`);

let fetched = 0;
let skipped = 0;
let failed = 0;
let purged = 0;

for (const path of paths) {
  const destination = join(target, path);

  if (existsSync(destination) && statSync(destination).size > 0) {
    skipped++;
    if (purge) {
      const { error } = await db.storage.from(BUCKET).remove([path]);
      if (!error) purged++;
    }
    continue;
  }

  const { data, error } = await db.storage.from(BUCKET).download(path);
  if (error || !data) {
    console.error(`  failed: ${path} — ${error?.message ?? "no data"}`);
    failed++;
    continue;
  }

  mkdirSync(dirname(destination), { recursive: true });
  const bytes = Buffer.from(await data.arrayBuffer());
  writeFileSync(destination, bytes);
  fetched++;

  // Only ever delete something already written and non-empty on disk.
  if (purge && statSync(destination).size === bytes.length) {
    const { error: removeError } = await db.storage.from(BUCKET).remove([path]);
    if (!removeError) purged++;
  }
}

console.log(
  [
    `fetched ${fetched}`,
    `already had ${skipped}`,
    failed ? `FAILED ${failed}` : null,
    purge ? `removed ${purged} from Supabase` : null,
  ]
    .filter(Boolean)
    .join(", "),
);
console.log(`written to ${target}`);
