import "server-only";

import { cookies } from "next/headers";
import { supabase } from "./supabase";
import { GUEST_COOKIE, readGuestToken } from "./guest-session";
import { PHOTO_BUCKET } from "./photo-config";
import { curatedPhotos } from "@/components/photos/curated";
import type { Gallery } from "@/components/photos/types";

/**
 * Reads backing the /photos page.
 *
 * Deliberately NOT in a `"use server"` module, for the same reason as
 * `rsvp-queries.ts`: every export of one of those becomes a callable POST
 * endpoint. These are only ever called from the server component, so keeping
 * them out of the action manifest means there is no endpoint to reach.
 */

/** Hard ceiling so one very enthusiastic guest can't make the page enormous. */
const MAX_PHOTOS = 300;

export async function getGallery(limit = MAX_PHOTOS): Promise<Gallery> {
  const { data, error } = await supabase
    .from("guest_photos")
    .select("id, storage_path, width, height, caption")
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  // No photos yet is the normal state until the wedding, so it isn't an error
  // state — it just means the page shows ours instead of an empty grid.
  if (error || !data || data.length === 0) {
    return { source: "curated", photos: curatedPhotos };
  }

  return {
    source: "guests",
    photos: data.map((row) => ({
      src: supabase.storage.from(PHOTO_BUCKET).getPublicUrl(row.storage_path)
        .data.publicUrl,
      width: row.width,
      height: row.height,
      alt: row.caption ?? "A photo shared by a wedding guest",
    })),
  };
}

/** The guest group this browser has verified as, or null. */
export async function getPhotoSession() {
  const store = await cookies();
  const groupId = await readGuestToken(store.get(GUEST_COOKIE)?.value);
  if (groupId === null) return null;

  const { data } = await supabase
    .from("guest_groups")
    .select("id, name")
    .eq("id", groupId)
    .single();

  return data;
}

/**
 * Every photo, hidden ones included, for the host review page. Server-component
 * only — see the note at the top of this file.
 */
export async function getPhotosForReview() {
  const { data, error } = await supabase
    .from("guest_photos")
    .select("id, storage_path, width, height, hidden, created_at, guest_groups(name)")
    .order("created_at", { ascending: false });

  const photos = (data ?? []).map((row) => ({
    id: row.id,
    src: supabase.storage.from(PHOTO_BUCKET).getPublicUrl(row.storage_path).data
      .publicUrl,
    width: row.width,
    height: row.height,
    hidden: row.hidden,
    createdAt: row.created_at,
    groupName: row.guest_groups?.name ?? "Unknown",
  }));

  return { data: photos, error };
}
