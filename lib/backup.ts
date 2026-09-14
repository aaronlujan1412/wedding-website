import "server-only";
import { supabase } from "./supabase";

/**
 * Nightly logical backup of everything a person typed in.
 *
 * This project is on a plan with no PITR and no stored snapshots — a `delete`
 * with a bad `where` is final, as we found out. Dumping the rows to a private
 * bucket turns that from "everything" into "since 09:00 this morning".
 *
 * Only tables holding entered data. Generated or derivable content is left out;
 * photo binaries are not here either, since they already live in their own
 * bucket and the home server holds the originals.
 */
export const BACKUP_TABLES = [
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
] as const;

export const BACKUP_BUCKET = "backups";

/** Keep a fortnight. Long enough to notice a mistake, short enough to be free. */
export const BACKUP_KEEP_DAYS = 14;

export type BackupResult = {
  file: string;
  rows: Record<string, number>;
  pruned: string[];
};

export async function runBackup(now = new Date()): Promise<BackupResult> {
  const dump: Record<string, unknown[]> = {};
  const rows: Record<string, number> = {};

  for (const table of BACKUP_TABLES) {
    const { data, error } = await supabase.from(table).select();
    if (error) throw new Error(`${table}: ${error.message}`);
    dump[table] = data ?? [];
    rows[table] = data?.length ?? 0;
  }

  const file = `${now.toISOString().slice(0, 10)}.json`;
  const body = JSON.stringify(
    { takenAt: now.toISOString(), tables: dump },
    null,
    2,
  );

  const { error: uploadError } = await supabase.storage
    .from(BACKUP_BUCKET)
    .upload(file, body, {
      contentType: "application/json",
      // Re-running the same day should overwrite, not pile up.
      upsert: true,
    });

  if (uploadError) throw new Error(`upload: ${uploadError.message}`);

  return { file, rows, pruned: await prune(now) };
}

/** Names are ISO dates, so a string compare is a date compare. */
async function prune(now: Date): Promise<string[]> {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - BACKUP_KEEP_DAYS);
  const oldest = `${cutoff.toISOString().slice(0, 10)}.json`;

  const { data } = await supabase.storage.from(BACKUP_BUCKET).list();
  const stale = (data ?? [])
    .map((f) => f.name)
    .filter((name) => name.endsWith(".json") && name < oldest);

  if (stale.length > 0) {
    await supabase.storage.from(BACKUP_BUCKET).remove(stale);
  }
  return stale;
}
