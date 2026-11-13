#!/usr/bin/env node
/**
 * Creates the storage buckets this app expects, through the storage API.
 *
 * Writing a row into `storage.buckets` from a migration no longer registers
 * the bucket with the storage service, so a migration alone leaves you with
 * "Bucket not found" at runtime. This is the path that actually works, and it
 * is idempotent, so run it against any fresh environment.
 *
 *   node --env-file=.env.local  scripts/provision-buckets.mjs
 *   node --env-file=.env.remote scripts/provision-buckets.mjs
 */

import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

/** public: readable by URL for anyone who has it. Everything else stays shut. */
const BUCKETS = [
  { name: "guest-photos", public: true },
  { name: "guest-photo-originals", public: false },
  { name: "backups", public: false },
  { name: "trip-papers", public: false },
  // Who's who on the helper pages. Signed URLs only, after the helpers' code.
  { name: "helper-faces", public: false },
  // Aaronpardy videos and Bride Quest proof photos (lib/party-games.ts). Public
  // by id, since an <img> can't send a key; the browser uploads straight here on
  // a signed URL, so the bucket is what holds the size and the types.
  {
    name: "party-game-assets",
    public: true,
    fileSizeLimit: "25MB",
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ],
  },
];

console.log(`Provisioning buckets on ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

const { data: existing } = await db.storage.listBuckets();
const have = new Set((existing ?? []).map((b) => b.name));

for (const bucket of BUCKETS) {
  if (have.has(bucket.name)) {
    console.log(`  ${bucket.name.padEnd(24)} already there`);
    continue;
  }
  const { error } = await db.storage.createBucket(bucket.name, {
    public: bucket.public,
    fileSizeLimit: bucket.fileSizeLimit,
    allowedMimeTypes: bucket.allowedMimeTypes,
  });
  console.log(
    `  ${bucket.name.padEnd(24)} ${error ? `FAILED: ${error.message}` : "created"}`,
  );
}
