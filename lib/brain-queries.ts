import "server-only";

import { supabase } from "./supabase";
import { currentBrainUser } from "./brain-user";
import type {
  Decision,
  InboxEntry,
  Note,
  NoteSummary,
} from "./brain-types";

// Re-exported so a server component can take everything from one module.
export type { Decision, InboxEntry, Note, NoteSummary } from "./brain-types";
export { DESTINATIONS, type Destination } from "./brain-types";

/**
 * Reads of the mirrored vault.
 *
 * Deliberately NOT in a `"use server"` module. Every export of one of those
 * becomes a callable POST endpoint, and these read family, custody and health
 * notes — exactly the shape of thing that must not be reachable from outside.
 * Called from server components only, so a plain module keeps them off the
 * action manifest entirely.
 *
 * THE GUARANTEE THIS FILE MAKES: every function here checks the session ITSELF
 * before it touches a row. The pages under /me/brain render for signed-out
 * visitors too — that is the point, they are the portfolio — so "the page will
 * remember to check" is not good enough. Put the check where the data is and a
 * page cannot leak by forgetting.
 *
 * Signed out, each of these returns empty rather than throwing. A public page
 * showing nothing is correct; a 500 is a worse answer to the same question.
 */

/** Enough of the body to recognise the note, cut on a word. */
function excerpt(body: string, length = 180): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= length) return flat;
  const cut = flat.slice(0, length);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}

const SUMMARY_COLUMNS =
  "id, path, bucket, title, tags, confidence, file_mtime, body";

type Row = {
  id: string;
  path: string;
  bucket: string;
  title: string | null;
  tags: string[] | null;
  confidence: string | null;
  file_mtime: string | null;
  body: string;
};

const toSummary = (row: Row): NoteSummary => ({
  id: row.id,
  path: row.path,
  bucket: row.bucket,
  title: row.title,
  tags: row.tags ?? [],
  confidence: row.confidence,
  file_mtime: row.file_mtime,
  excerpt: excerpt(row.body),
});

/** What the hub shows at a glance. */
export type BrainStats = {
  total: number;
  staged: number;
  buckets: { bucket: string; count: number }[];
  lastSynced: string | null;
};

export async function getBrainStats(): Promise<BrainStats | null> {
  if (!(await currentBrainUser())) return null;

  /*
   * Through RPCs rather than counted in JS. PostgREST caps a select at 1,000
   * rows, so the first version of this fetched every row, grouped it here, and
   * reported "1,000 notes" against a vault of 3,430 — no error, no empty
   * result, just a plausible wrong number. Aggregates belong on the side of
   * the wire that has all the rows.
   */
  const [totals, buckets] = await Promise.all([
    supabase.rpc("brain_totals").maybeSingle(),
    supabase.rpc("brain_bucket_counts"),
  ]);

  if (totals.error || !totals.data) return null;

  return {
    total: Number(totals.data.total ?? 0),
    staged: Number(totals.data.staged ?? 0),
    lastSynced: totals.data.last_synced,
    buckets: (buckets.data ?? []).map((row) => ({
      bucket: row.bucket,
      count: Number(row.note_count),
    })),
  };
}

export async function getRecentNotes(limit = 8): Promise<NoteSummary[]> {
  if (!(await currentBrainUser())) return [];

  const { data, error } = await supabase
    .from("brain_notes")
    .select(SUMMARY_COLUMNS)
    .eq("staged", false)
    .order("file_mtime", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as Row[]).map(toSummary);
}

export type SearchOptions = {
  query?: string;
  bucket?: string;
  tag?: string;
  /** The review queue instead of the brain. */
  staged?: boolean;
  limit?: number;
  offset?: number;
};

export type SearchResult = {
  notes: NoteSummary[];
  total: number;
};

/**
 * Browse and search.
 *
 * Two different matchers, because they fail in opposite directions and this
 * vault needs both — the same reasoning behind the hybrid retrieval on the box:
 *
 *   full text   stems and ranks, so "caching" finds "cached". Blind to a rare
 *               literal token inside a word.
 *   substring   finds `pam_faillock` or half a remembered title. No ranking,
 *               no stemming. Fast here only because of the trigram index.
 *
 * A query runs both and unions them, so neither kind of remembering comes up
 * empty. Postgres cannot OR a tsquery against an ILIKE and still use both
 * indexes, so these are two round trips merged in JS rather than one clever
 * query that scans the table.
 */
export async function searchNotes({
  query,
  bucket,
  tag,
  staged = false,
  limit = 25,
  offset = 0,
}: SearchOptions): Promise<SearchResult> {
  if (!(await currentBrainUser())) return { notes: [], total: 0 };

  const term = query?.trim();

  const base = () => {
    let q = supabase
      .from("brain_notes")
      .select(SUMMARY_COLUMNS, { count: "exact" })
      .eq("staged", staged);
    if (bucket) q = q.eq("bucket", bucket);
    if (tag) q = q.contains("tags", [tag]);
    return q;
  };

  // No query: plain browse, newest first.
  if (!term) {
    const { data, error, count } = await base()
      .order("file_mtime", { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);
    if (error || !data) return { notes: [], total: 0 };
    return { notes: (data as Row[]).map(toSummary), total: count ?? data.length };
  }

  const [ranked, literal] = await Promise.all([
    base()
      .textSearch("search", term, { type: "websearch", config: "english" })
      .limit(limit + offset),
    // Escape the LIKE metacharacters, or a note about "100%" searches for
    // anything at all.
    base()
      .ilike("title", `%${term.replace(/[%_\\]/g, "\\$&")}%`)
      .limit(limit + offset),
  ]);

  if (ranked.error && literal.error) return { notes: [], total: 0 };

  // Full-text first — it is ranked, and the literal pass is a safety net rather
  // than a better answer. Dedupe by id, since a note often matches both.
  const seen = new Set<string>();
  const merged: NoteSummary[] = [];
  for (const row of [
    ...((ranked.data ?? []) as Row[]),
    ...((literal.data ?? []) as Row[]),
  ]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    merged.push(toSummary(row));
  }

  return {
    notes: merged.slice(offset, offset + limit),
    // The union's real size, which is what pagination has to walk.
    total: merged.length,
  };
}

export async function getNote(id: string): Promise<Note | null> {
  if (!(await currentBrainUser())) return null;

  const { data, error } = await supabase
    .from("brain_notes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return {
    ...toSummary(data as Row),
    body: data.body,
    source: data.source,
    content_hash: data.content_hash,
    synced_at: data.synced_at,
  };
}

/**
 * Resolve `[[wikilink]]` targets to note ids.
 *
 * The targets are full TITLES, not filenames — `[[Adding `nomodeset` to the
 * GRUB linux line boots past a crashing display driver]]`, not the slug the
 * file is saved under. That is what the `aliases:` line in every note's
 * frontmatter exists for: the file is named by a 70-character slug and the
 * alias carries the real title so Obsidian can resolve the link. Matching on
 * the filename instead found 13 of 2,578 links; matching on the title finds
 * 1,820.
 *
 * The other 758 point at notes that were renamed or never written, which is
 * ordinary in a vault this old — those stay plain text rather than becoming
 * links to nothing.
 *
 * One query for every link on the page rather than one per link, and exact
 * comparison because every resolvable target already matches exactly; adding
 * case-insensitivity would cost an index scan and find nothing new.
 */
export async function resolveLinks(
  titles: string[],
): Promise<Map<string, string>> {
  if (!titles.length || !(await currentBrainUser())) return new Map();

  const { data, error } = await supabase
    .from("brain_notes")
    .select("id, title")
    .in("title", [...new Set(titles)]);

  if (error || !data) return new Map();

  const found = new Map<string, string>();
  for (const row of data) {
    if (row.title) found.set(row.title, row.id);
  }
  return found;
}

/** Every tag in use, commonest first — the browse page's filter list. */
export async function getTags(limit = 40): Promise<{ tag: string; count: number }[]> {
  if (!(await currentBrainUser())) return [];

  // Also an RPC, and for the same reason as the bucket counts: unnesting 3,430
  // tag arrays through PostgREST would only ever see the first page of them.
  const { data, error } = await supabase.rpc("brain_tag_counts", {
    p_limit: limit,
  });
  if (error || !data) return [];

  return data.map((row) => ({ tag: row.tag, count: Number(row.note_count) }));
}

/**
 * The review queue: every note in a staging directory, with its full body.
 *
 * Bodies and not excerpts, because deciding whether a note belongs in the brain
 * means reading it. The queue is single digits in practice — one note today —
 * so the cost of that is nothing.
 */
export async function getInbox(): Promise<InboxEntry[]> {
  if (!(await currentBrainUser())) return [];

  const [notes, decisions] = await Promise.all([
    supabase
      .from("brain_notes")
      .select("*")
      .eq("staged", true)
      .order("file_mtime", { ascending: true, nullsFirst: true }),
    supabase
      .from("brain_decisions")
      .select("*")
      .in("state", ["queued", "failed"]),
  ]);

  if (notes.error || !notes.data) return [];

  const open = new Map(
    (decisions.data ?? []).map((d) => [d.path, d as Decision]),
  );

  type FullRow = Row & {
    source: string | null;
    content_hash: string;
    synced_at: string;
  };

  return (notes.data as FullRow[]).map((row) => ({
    ...toSummary(row),
    body: row.body,
    source: row.source,
    content_hash: row.content_hash,
    synced_at: row.synced_at,
    pending: open.get(row.path) ?? null,
  }));
}

/** What has been decided lately, for the log under the queue. */
export async function getDecisionLog(limit = 25): Promise<Decision[]> {
  if (!(await currentBrainUser())) return [];

  const { data, error } = await supabase
    .from("brain_decisions")
    .select("*")
    .order("decided_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as Decision[];
}
