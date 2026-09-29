/**
 * Create or update an account for /me.
 *
 * There is no signup form and no self-service reset, because the set of people
 * who should have an account here is "me" and a public signup page is a
 * strictly larger attack surface than a command.
 *
 * Usage:
 *   node --env-file=.env.local scripts/site-user.mjs <username>
 *   node --env-file=.env.local scripts/site-user.mjs <username> --revoke
 *   node --env-file=.env.local scripts/site-user.mjs --list
 *
 * Against production, add --production (see scripts/db-target.mjs). Setting a
 * password is not destructive in the delete-rows sense, but it silently locks
 * someone out of the live site if you meant to type it at the local stack, so
 * it goes through the same gate as everything else.
 *
 * The password is read from the terminal with echo off. It is never a CLI
 * argument: those land in shell history and in `ps` output.
 */

import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import { createClient } from "@supabase/supabase-js";
import { assertSafeTarget, target } from "./db-target.mjs";

// Kept in step with lib/password.ts by hand. Both are short, and a shared
// module would have to be importable from both a .mjs script and the Next
// bundle, which is a bigger change than one duplicated constant block.
const PARAMS = { N: 2 ** 16, r: 8, p: 1 };
const SALT_BYTES = 32;
const KEY_BYTES = 64;
const MAX_MEM = 128 * 1024 * 1024;

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{1,30}$/;
const MIN_PASSWORD = 12;

const { randomBytes, scrypt } = await import("node:crypto");

function hash(password) {
  const salt = randomBytes(SALT_BYTES);
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      KEY_BYTES,
      { ...PARAMS, maxmem: MAX_MEM },
      (error, key) =>
        error
          ? reject(error)
          : resolve(
              [
                "scrypt",
                PARAMS.N,
                PARAMS.r,
                PARAMS.p,
                salt.toString("base64"),
                key.toString("base64"),
              ].join("$"),
            ),
    );
  });
}

/**
 * One readline for the whole run, and only when stdin is a terminal.
 *
 * Piped input needs a different path entirely: readline closes itself as soon
 * as the pipe ends, so the second prompt lands on a closed interface and
 * throws ERR_USE_AFTER_CLOSE. Reading the whole of stdin up front sidesteps
 * that, and it is what makes the script testable without a TTY.
 */
const interactive = Boolean(stdin.isTTY);
const rl = interactive
  ? createInterface({ input: stdin, output: stdout, terminal: true })
  : null;

/** Lines from a pipe, consumed in order by askSecret. */
const piped = interactive
  ? []
  : (await new Promise((resolve) => {
      let buffer = "";
      stdin.setEncoding("utf8");
      stdin.on("data", (chunk) => (buffer += chunk));
      stdin.on("end", () => resolve(buffer));
    }))
      .split("\n")
      .map((line) => line.replace(/\r$/, ""));

/** Reads a line with the terminal's echo turned off. */
function askSecret(prompt) {
  if (!interactive) return Promise.resolve(piped.shift() ?? "");

  return new Promise((resolve) => {
    stdout.write(prompt);

    // `terminal: true` still echoes; muting the output stream is what actually
    // stops the password appearing on screen.
    const muted = rl.output;
    rl.output = { write: () => {} };

    rl.question("", (answer) => {
      rl.output = muted;
      stdout.write("\n");
      resolve(answer);
    });
  });
}

/** Lets the process exit once the prompts are done with. */
const closeInput = () => rl?.close();

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must both be set.",
    );
    console.error("Run with --env-file=.env.local (or .env.remote).");
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const username = args.find((a) => !a.startsWith("--"))?.toLowerCase();

const supabase = client();
console.log(`Database: ${target().url}\n`);

if (flags.has("--list")) {
  const { data, error } = await supabase
    .from("users")
    .select("username, token_version, created_at, last_seen_at")
    .order("username");

  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  if (!data.length) {
    console.log("No accounts yet. Make one:");
    console.log("  node --env-file=.env.local scripts/site-user.mjs <name>");
    process.exit(0);
  }
  for (const row of data) {
    console.log(
      `${row.username.padEnd(20)} v${row.token_version}  ` +
        `last seen ${row.last_seen_at ?? "never"}`,
    );
  }
  process.exit(0);
}

if (!username) {
  console.error("Usage: site-user.mjs <username> [--revoke] | --list");
  process.exit(1);
}

if (!USERNAME_RE.test(username)) {
  console.error(
    `"${username}" is not a usable username.\n` +
      "Lowercase, 2-31 characters, starting with a letter or digit.",
  );
  process.exit(1);
}

const { data: existing } = await supabase
  .from("users")
  .select("id, token_version")
  .eq("username", username)
  .maybeSingle();

if (flags.has("--revoke")) {
  if (!existing) {
    console.error(`No account called "${username}".`);
    process.exit(1);
  }

  assertSafeTarget(`sign ${username} out everywhere`, {
    production: flags.has("--production"),
  });

  const { error } = await supabase
    .from("users")
    .update({ token_version: existing.token_version + 1 })
    .eq("id", existing.id);

  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  console.log(
    `Signed ${username} out of every device ` +
      `(token version ${existing.token_version} -> ${existing.token_version + 1}).`,
  );
  process.exit(0);
}

assertSafeTarget(
  existing ? `change ${username}'s password` : `create the account ${username}`,
  { production: flags.has("--production") },
);

console.log(
  existing
    ? `Setting a new password for "${username}".`
    : `Creating "${username}".`,
);

const password = await askSecret("Password: ");
if (password.length < MIN_PASSWORD) {
  closeInput();
  console.error(`\nToo short — ${MIN_PASSWORD} characters minimum.`);
  process.exit(1);
}

const again = await askSecret("Again: ");
if (password !== again) {
  closeInput();
  console.error("\nThose don't match. Nothing was written.");
  process.exit(1);
}

closeInput();

const password_hash = await hash(password);

/*
 * Changing a password bumps token_version too. A password is usually changed
 * because it might be known, and leaving old sessions alive would mean the
 * change did nothing for whoever is already signed in on another device.
 */
const { error } = existing
  ? await supabase
      .from("users")
      .update({ password_hash, token_version: existing.token_version + 1 })
      .eq("id", existing.id)
  : await supabase.from("users").insert({ username, password_hash });

if (error) {
  console.error(`\n${error.message}`);
  process.exit(1);
}

console.log(
  existing
    ? `\nPassword changed, and every existing session signed out.`
    : `\nAccount created. Sign in at /me/login.`,
);
