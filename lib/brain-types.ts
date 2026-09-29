/**
 * Shapes and constants shared by the server and the browser.
 *
 * Deliberately WITHOUT `import "server-only"`, unlike `brain-queries.ts`. The
 * inbox controls are a client component and need the list of destinations to
 * build its dropdown; importing that from the query module pulled a
 * server-only file into the client bundle, which is exactly the build error
 * `server-only` exists to produce. Values that both sides legitimately need
 * live here, and nothing in this file may touch the database.
 *
 * Types alone would not have needed this — they are erased — but `DESTINATIONS`
 * is a real array at runtime.
 */

/** The buckets a reviewer can file an approved note into. */
export const DESTINATIONS = ["Reference", "Personal", "Work"] as const;
export type Destination = (typeof DESTINATIONS)[number];

/** Trimmed for lists — bodies are up to 12KB and 50 of them is a page nobody reads. */
export type NoteSummary = {
  id: string;
  path: string;
  bucket: string;
  title: string | null;
  tags: string[];
  confidence: string | null;
  file_mtime: string | null;
  excerpt: string;
};

export type Note = NoteSummary & {
  body: string;
  source: string | null;
  content_hash: string;
  synced_at: string;
};

export type Decision = {
  id: string;
  path: string;
  decision: "approve" | "reject";
  destination: string | null;
  note_title: string | null;
  decided_at: string;
  state: "queued" | "applied" | "failed";
  error: string | null;
};

/** A staged note plus whatever has already been decided about it. */
export type InboxEntry = Note & { pending: Decision | null };
