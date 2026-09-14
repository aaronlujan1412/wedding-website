#!/usr/bin/env node
/**
 * Points `.env.local` at either the local Supabase stack or the live project.
 *
 * `.env.local` is what `npm run dev` and every `--env-file=.env.local` script
 * read, so whatever is in it is what a stray command will hit. Keeping the
 * live credentials out of it by default is the actual fix for how the
 * honeymoon data got deleted.
 *
 *   node scripts/use-db.mjs local    # read keys out of `supabase status`
 *   node scripts/use-db.mjs remote   # copy .env.remote back over it
 */

import { execFileSync } from "node:child_process";
import { copyFile, readFile, writeFile } from "node:fs/promises";

const mode = process.argv[2];

if (mode === "remote") {
  await copyFile(".env.remote", ".env.local");
  console.log(".env.local now points at the LIVE project. Be careful.");
  process.exit(0);
}

if (mode !== "local") {
  console.error("Usage: node scripts/use-db.mjs local|remote");
  process.exit(1);
}

let status;
try {
  status = execFileSync("npx", ["supabase", "status", "-o", "env"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch {
  console.error("Could not read `supabase status`. Is the stack up?");
  console.error("  npm run db:start");
  process.exit(1);
}

const read = (name) =>
  status.match(new RegExp(`^${name}="?([^"\\n]+)"?$`, "m"))?.[1];

const url = read("API_URL");
const anon = read("ANON_KEY");
const secret = read("SERVICE_ROLE_KEY");

if (!url || !anon || !secret) {
  console.error("`supabase status` did not report the keys. Is the stack up?");
  process.exit(1);
}

// Non-database secrets carry over from the live file, except the session
// signing key: sharing that would let a cookie minted against the local stack
// authenticate as a host on the live site.
const remote = await readFile(".env.remote", "utf8");
const carry = (name) =>
  remote.match(new RegExp(`^${name}=.*$`, "m"))?.[0] ?? "";

const lines = [
  "# Written by scripts/use-db.mjs — points at the LOCAL Supabase stack.",
  "# Nothing here can reach production. Switch with `npm run db:remote`.",
  "",
  `NEXT_PUBLIC_SUPABASE_URL=${url}`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=${anon}`,
  `SUPABASE_SECRET_KEY=${secret}`,
  "",
  carry("RSVP_ADMIN_PASSCODE"),
  carry("CRON_SECRET"),
  "",
  "# Deliberately different from production's.",
  `ADMIN_SESSION_SECRET=local-dev-${Math.random().toString(36).slice(2)}`,
  "",
].filter((l) => l !== "");

await writeFile(".env.local", lines.join("\n") + "\n");
console.log(`.env.local now points at the local stack (${url}).`);
console.log("Seed it with:  npm run db:seed");
