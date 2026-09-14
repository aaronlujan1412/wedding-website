/**
 * Which database a script is about to write to, and whether it should be
 * allowed to.
 *
 * The accident this exists to prevent: a script written to reset a demo ran
 * against the live project, because `.env.local` held production credentials
 * and every script defaulted to it. Knowing the answer to "which database is
 * this?" is not optional before a delete.
 */

const LOCAL_HOSTS = ["127.0.0.1", "localhost", "[::1]", "host.docker.internal"];

export function target() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    host = "";
  }
  return { url, host, isLocal: LOCAL_HOSTS.includes(host) };
}

/**
 * Call before anything destructive. Reaching production takes saying so, in
 * as many words, on top of whatever --force the script already wanted.
 */
export function assertSafeTarget(action, { production = false } = {}) {
  const { url, isLocal } = target();

  if (!url) {
    console.error("NEXT_PUBLIC_SUPABASE_URL is not set. Pass --env-file.");
    process.exit(1);
  }

  if (isLocal) return;

  if (!production) {
    console.error(`\nRefusing to ${action}: ${url} is not a local database.`);
    console.error("That is the live site. If you genuinely mean it:");
    console.error(`  ...add --production to the command\n`);
    console.error("Otherwise point at the local stack first:");
    console.error("  npm run db:local");
    process.exit(1);
  }

  console.warn(`\n!! ${action} against PRODUCTION (${url})\n`);
}
