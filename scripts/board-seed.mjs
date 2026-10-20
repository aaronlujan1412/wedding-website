/**
 * Seeds the board's first project from the artifact prototype it replaces.
 *
 * One-off. It refuses to run if the project already exists rather than
 * offering a --force, because there is nothing here worth re-running: once the
 * cards are in, the board is the source of truth and this file is history.
 *
 *   node --env-file=.env.local scripts/board-seed.mjs
 *
 * Guarded by scripts/db-target.mjs like every other script that writes.
 */

import { createClient } from "@supabase/supabase-js";
import { assertSafeTarget } from "./db-target.mjs";

assertSafeTarget("seed the board", {
  production: process.argv.includes("--production"),
});

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

const SLUG = "homelab";

const { data: existing } = await db
  .from("board_projects")
  .select("id")
  .eq("slug", SLUG)
  .maybeSingle();

if (existing) {
  console.error(`The "${SLUG}" project already exists. Nothing to do.`);
  process.exit(1);
}

const { data: projectId, error: createError } = await db.rpc(
  "board_create_project",
  {
    p_slug: SLUG,
    p_name: "Homelab",
    p_description:
      "cachy, the four disks and everything hanging off them. Speedy is failing; most of this is the consequences.",
  },
);

if (createError) {
  console.error("Could not create the project:", createError.message);
  process.exit(1);
}

const { data: columns } = await db
  .from("board_columns")
  .select("id, key")
  .eq("project_id", projectId);

const col = Object.fromEntries(columns.map((c) => [c.key, c.id]));

/** [column, title, summary, labels] — migrated from the artifact board. */
const CARDS = [
  ["doing", "Move ROMs to Sloth",
    "Phase 3 of the migration, abandoned when cachy crashed. 17 G of 29 G already copied; one leftover rsync temp file to clear first. ES-DE config references ~/Emulation, so leave a symlink behind.",
    ["speedy", "sloth", "29 G"]],
  ["doing", "Back up Jarvis to Hetzner",
    "Jarvis has 0 mounts and only the hassio.local backup agent, so its backups live on the same disk they would restore. Plan: NFS export on cachy to /mnt/local/ha-backups, add it on Jarvis as a backup location, add the path to Borg sources. nfs-utils is installed but nfs-server is inactive — needs sudo.",
    ["jarvis", "sloth", "hetzner"]],

  ["next", "Delete the obsolete VM image from Sloth",
    "HA runs on Jarvis now, so /mnt/local/ssd-rescue-20261019/vm is dead weight.", ["sloth", "14.7 G"]],
  ["next", "Delete the safe parts of the coreserver archive",
    "haos-vm 15 G (obsolete), nextcloud-data 2.0 G (source exists and is in Borg), arr-databases 82 M (superseded by fresher dumps on Sloth).",
    ["chungus", "17 G"]],
  ["next", "Clear out the coreserver archive remainder",
    "Decided 20 Oct: delete PyCharmProjects (373 M), dotconfig (121 M) and homelab-backups (3.2 G). KEEP Takeout (40 M) — 49 CSVs of personal YouTube playlists with no surviving source, so relocate it somewhere Borg covers.",
    ["chungus", "3.7 G"]],
  ["next", "Add ~/docker to Borg sources",
    "The real fix for container state: back it up rather than relocate it. Sloth is 5400 rpm and the arr stack hammers SQLite, so ~/docker stays on the SSD and moves to the new one when it arrives.",
    ["speedy", "hetzner", "10 G"]],
  ["next", "Replace Speedy",
    "M.2 2280 SATA — NVMe is unproven in this machine, no NVMe controller in lspci. Clone with ddrescue, not dd: dd stops at the first unreadable sector.",
    ["speedy"]],
  ["next", "Revoke the claude-diag HA tokens",
    "One on each instance, from the profile security page. The .202 one is the live one now — it survived the restore and works against .230.",
    ["jarvis"]],

  ["backlog", "Fix the nextcloud_db root password drift",
    "MYSQL_ROOT_PASSWORD no longer matches the DB's actual root password. The rescue worked around it via the MYSQL_USER fallback.", ["speedy"]],
  ["backlog", "Remove the duplicate otbr config entry",
    "Two entries, one radio. The May one came from the backup, the second was re-discovered when the add-on started. Cosmetic.", ["jarvis"]],
  ["backlog", "Set Thread credentials on Matter Server",
    "thread_credentials_set is false. Harmless for existing devices, but commissioning a new Thread device will fail until HA pushes the dataset across.", ["jarvis"]],
  ["backlog", "Fix limine-snapper-sync ESP path",
    "FAT32 boot partition with limine.conf not found — set ESP_PATH in /etc/default/limine. Means booting into a snapshot does not work.", ["speedy"]],
  ["backlog", "Revoke the journal sidecar Tailscale auth key", "Never revoked after setup.", ["speedy"]],
  ["backlog", "Close direct ports on Immich, Komga, Navidrome",
    "Currently reachable without going through the proxy.", ["speedy"]],
  ["backlog", "Mom's NPM access list and WebSocket test", "", ["speedy"]],
  ["backlog", "Get mom's phone and laptop on the tailnet", "", []],
  ["backlog", "Kodi Collections: 47 dangling movie.idSet rows", "", ["speedy"]],
  ["backlog", "Re-monitor the silently unmonitored films",
    "Fifty Shades of Grey, Fifty Shades Darker, and three Austin Powers.", ["speedy"]],
  ["backlog", "SAB is paused: 56 items queued", "", ["sloth", "137 G"]],
  ["backlog", "Spider-Man: Brand New Day stuck at importPending", "", ["chungus"]],
  ["backlog", "SecondBrain _inbox cleanup",
    "Waiting on promote_inbox.sh. The PII review gate is manual and load-bearing.", ["speedy"]],
  ["backlog", "Put ~/bin/publish_vault.py under version control", "", ["speedy"]],
  ["backlog", "journal container memory limit",
    "384 MB. First suspect if mom's app dies mid-entry.", ["speedy"]],

  ["done", "Install HAOS 18.3 on Jarvis",
    "Written to the whole disk with xzcat | dd. Verified by the hassos- partition labels, not the exit code.", ["jarvis"]],
  ["done", "Restore HA from the right backup",
    "First restore used a pre-update automatic backup from 19 May: 174 KB, zero add-ons. The correct one was 29 MB with all five.", ["jarvis"]],
  ["done", "Start the OTBR add-on",
    "Installed by the restore but left stopped despite boot: auto. Started it, reloaded the config entry, and the alarms rejoined at 12:04.", ["jarvis"]],
  ["done", "Tear down the HAOS VM on cachy",
    "Graceful shutdown, virsh undefine --nvram, qcow2 removed, haos-vm.service disabled. Gave back 2 GiB RAM and 2 vCPUs.", ["speedy", "17 G"]],
  ["done", "Turn on snapper-cleanup",
    "snapper-timeline.timer was enabled but snapper-cleanup.timer never was. 1,858 snapshots since 4 Aug, 1,828 holding a copy of the 16 GB VM image. Freed 58 G.",
    ["speedy", "58 G"]],
  ["done", "Rescue container state and DB dumps to Sloth",
    "All SQLite integrity-checked, dumps grepped for real SQL, ~/docker path-diffed against source. btrfs error counters never moved.", ["speedy", "sloth", "10 G"]],
  ["done", "Push homelab repo to GitHub",
    "Including 9 commits on claude/watchdogs-20260917 that existed only on the failing disk.", ["speedy"]],
  ["done", "Torrents: nothing worth reclaiming",
    "68.5 G across 105 files is hardlinked into the library and costs nothing. Of the 36.6 G standalone, only 2 files (2.4 G) size-match a library file. The other 34.6 G exists only there and is seeding. Leave it alone.",
    ["chungus", "2.4 G"]],
];

const rows = CARDS.map(([key, title, summary, labels], i) => ({
  project_id: projectId,
  column_id: col[key],
  title,
  summary: summary || null,
  labels,
  position: i,
}));

const { error: insertError } = await db.from("board_cards").insert(rows);

if (insertError) {
  console.error("Could not insert cards:", insertError.message);
  process.exit(1);
}

const counts = rows.reduce((acc, r) => {
  const key = Object.keys(col).find((k) => col[k] === r.column_id);
  acc[key] = (acc[key] ?? 0) + 1;
  return acc;
}, {});

console.log(`Created "${SLUG}" with ${rows.length} cards:`);
for (const [key, n] of Object.entries(counts)) console.log(`  ${key.padEnd(8)} ${n}`);
