import "server-only";

import { supabase } from "./supabase";

/**
 * The writes behind every confirmation PDF.
 *
 * Deliberately not a `"use server"` module: the caller checks the host cookie
 * first, and these never become endpoints of their own. Same arrangement as
 * `photo-storage.ts`.
 */

export const PAPERS_BUCKET = "trip-papers";

/**
 * A confirmation is a page or two of text. Ten megabytes is already a scan of
 * something, and the point of this is having it on a phone in a lobby.
 */
export const MAX_PAPER_BYTES = 10 * 1024 * 1024;

/** PDF only. A photo of a screen is not a document you can read at a desk. */
export const PAPER_TYPE = "application/pdf";

/** `stay:<uuid>`, `flight:<uuid>` — the shape `trip_checklist_items.list` uses. */
const OWNER = /^[a-z]+:[0-9a-f-]{36}$/;

export function isPaperOwner(owner: string): boolean {
  return OWNER.test(owner);
}

/**
 * Keep the name that was uploaded, minus anything that would make it a
 * different path than it looks like. The stored name is what someone reads in
 * a list of twenty of these, so "booking-confirmation.pdf" has to survive.
 */
function safeName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[^\w.\- ]+/g, "").trim();
  if (!cleaned || cleaned === ".pdf") return "confirmation.pdf";
  return cleaned.slice(0, 120);
}

type Saved = { data: { id: string } | null; error: string | null };

export async function savePaper(
  tripId: string,
  owner: string,
  formData: FormData,
): Promise<Saved> {
  if (!isPaperOwner(owner)) {
    return { data: null, error: "That isn't something a paper can hang off." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { data: null, error: "No file came through. Try again?" };
  }
  if (file.type !== PAPER_TYPE) {
    return { data: null, error: "It has to be a PDF." };
  }
  if (file.size === 0) {
    return { data: null, error: "That file is empty." };
  }
  if (file.size > MAX_PAPER_BYTES) {
    return { data: null, error: "That PDF is over 10 MB. Save a smaller copy." };
  }

  const name = safeName(file.name);
  const storagePath = `${tripId}/${owner.replace(":", "/")}/${crypto.randomUUID()}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(PAPERS_BUCKET)
    .upload(storagePath, file, { contentType: PAPER_TYPE, upsert: false });

  if (uploadError) {
    return { data: null, error: "That upload didn't go through. Try again?" };
  }

  const { data, error } = await supabase
    .from("trip_papers")
    .insert({
      trip_id: tripId,
      owner,
      storage_path: storagePath,
      name,
      bytes: file.size,
    })
    .select("id")
    .single();

  if (error) {
    // Never strand an object with no row pointing at it: nothing would list it
    // again and it still bills for storage.
    await supabase.storage.from(PAPERS_BUCKET).remove([storagePath]);
    return { data: null, error: "That upload didn't go through. Try again?" };
  }

  return { data, error: null };
}

/** Removes the object first, so a failure can never leave a row with no file. */
export async function removePaper(id: string): Promise<string | null> {
  const { data: paper } = await supabase
    .from("trip_papers")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (!paper) return null;

  await supabase.storage.from(PAPERS_BUCKET).remove([paper.storage_path]);

  const { error } = await supabase.from("trip_papers").delete().eq("id", id);
  return error ? "That didn't delete. Try again?" : null;
}

/**
 * A link that works for a few minutes. The bucket is private, so every read is
 * signed on demand rather than a URL sitting in the page — one that leaked
 * would outlive the session it came from.
 */
export async function paperUrl(id: string): Promise<string | null> {
  const { data: paper } = await supabase
    .from("trip_papers")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (!paper) return null;

  const { data } = await supabase.storage
    .from(PAPERS_BUCKET)
    .createSignedUrl(paper.storage_path, 300);

  return data?.signedUrl ?? null;
}

/**
 * Clears the files behind everything one owner holds.
 *
 * The rows go with the thing they hang off — `trip_papers.owner` is a text key
 * rather than a foreign key, so a trigger does that cascade — but no trigger
 * can reach into the bucket. Call this before deleting the owner, or the
 * objects stay there with nothing left to list them.
 */
export async function clearPapers(owner: string): Promise<void> {
  const { data } = await supabase
    .from("trip_papers")
    .select("storage_path")
    .eq("owner", owner);

  const paths = (data ?? []).map((p) => p.storage_path);
  if (paths.length > 0) {
    await supabase.storage.from(PAPERS_BUCKET).remove(paths);
  }
}

/** Every paper hanging off one thing, oldest first. */
export async function papersFor(owners: string[]) {
  if (owners.length === 0) return [];
  const { data } = await supabase
    .from("trip_papers")
    .select("*")
    .in("owner", owners)
    .order("uploaded_at", { ascending: true });
  return data ?? [];
}
