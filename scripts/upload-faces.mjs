#!/usr/bin/env node
/**
 * Puts the who's-who photos into the private `helper-faces` bucket: one
 * `<person id>.webp` each, cut to a 3:4 portrait no bigger than the page
 * draws it, so the album isn't megabytes of phone photos.
 *
 * Neither the photos nor which file is whom belong in this repo, which is
 * public — the file names carry surnames. That map is a `faces.json` kept
 * beside the photos, its paths relative to it:
 *
 *   { "renee": "Savea's family/Mom.png", "brian": "...", ... }
 *
 * The ids are the ones in `components/helpers/people.ts`. Re-running
 * replaces each photo, so adding someone is a photo, a line in faces.json,
 * and a row in people.ts.
 *
 *   node --env-file=.env.local  scripts/upload-faces.mjs <faces.json>
 *   node --env-file=.env.remote scripts/upload-faces.mjs <faces.json> --production
 *
 * The bucket comes from `scripts/provision-buckets.mjs`; run that first on a
 * fresh environment.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { assertSafeTarget } from "./db-target.mjs";

const BUCKET = "helper-faces";

/** Twice the album's widest tile, so a phone's screen still gets it sharp.
    Smaller photos stay their own size rather than being blown up. */
const WIDTH = 360;
const HEIGHT = 480;

const args = process.argv.slice(2);
const manifestPath = args.find((arg) => !arg.startsWith("--"));

if (!manifestPath) {
  console.error("Usage: node --env-file=.env.local scripts/upload-faces.mjs <faces.json>");
  process.exit(1);
}

// Not destructive, but it does overwrite photos, and "which database is
// this?" should never be a guess.
assertSafeTarget("upload the who's-who photos", {
  production: args.includes("--production"),
});

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const root = path.dirname(path.resolve(manifestPath));

console.log(`Uploading to ${BUCKET} on ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

let failed = 0;
for (const [id, file] of Object.entries(manifest)) {
  try {
    const body = await sharp(path.join(root, file))
      .rotate() // honour the phone's EXIF orientation before cropping
      .resize(WIDTH, HEIGHT, {
        fit: "cover",
        // Crop toward the face rather than the middle of the frame.
        position: sharp.strategy.attention,
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();

    const { error } = await db.storage
      .from(BUCKET)
      .upload(`${id}.webp`, body, { contentType: "image/webp", upsert: true });
    if (error) throw error;

    console.log(`  ${id.padEnd(12)} ${Math.round(body.length / 1024)} KB`);
  } catch (error) {
    failed++;
    console.log(`  ${id.padEnd(12)} FAILED: ${error.message}`);
  }
}

if (failed) process.exit(1);
