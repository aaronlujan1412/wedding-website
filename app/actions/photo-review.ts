"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { HOST_COOKIE, isValidSessionToken } from "@/lib/admin-session";
import { PHOTO_BUCKET } from "@/lib/photo-config";
import { saveOriginal, saveWebPhoto } from "@/lib/photo-storage";
import { createUploadTicket } from "@/lib/upload-ticket";

async function isHost() {
  const store = await cookies();
  return isValidSessionToken(store.get(HOST_COOKIE)?.value);
}

const DENIED = { data: null, error: "Not authorised." };

export async function setPhotoHidden(id: string, hidden: boolean) {
  if (!(await isHost())) return DENIED;

  const { error } = await supabase
    .from("guest_photos")
    .update({ hidden })
    .eq("id", id);

  if (error) return { data: null, error: error.message };

  revalidatePath("/photos");
  revalidatePath("/photo-review");
  return { data: true, error: null };
}

export async function deletePhoto(id: string) {
  if (!(await isHost())) return DENIED;

  // Read the path back before the row goes, or the object is unreachable.
  const { data: row, error: readError } = await supabase
    .from("guest_photos")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (readError || !row) {
    return { data: null, error: "That photo is already gone." };
  }

  const { error } = await supabase.from("guest_photos").delete().eq("id", id);
  if (error) return { data: null, error: error.message };

  await supabase.storage.from(PHOTO_BUCKET).remove([row.storage_path]);

  revalidatePath("/photos");
  revalidatePath("/photo-review");
  return { data: true, error: null };
}

/**
 * Hosts posting their own photos. These carry no group_id — they aren't from a
 * household — and land visible straight away, since the point of reviewing is
 * to catch what guests post, not what we post ourselves.
 */
export async function uploadHostPhoto(formData: FormData) {
  if (!(await isHost())) return DENIED;

  const result = await saveWebPhoto(null, formData);
  if (result.data) {
    revalidatePath("/photos");
    revalidatePath("/photo-review");
  }
  return result;
}

/** The host-side counterpart to attachOriginal; same best-effort contract. */
export async function attachHostOriginal(photoId: string, formData: FormData) {
  if (!(await isHost())) return DENIED;

  const { data: photo } = await supabase
    .from("guest_photos")
    .select("id, group_id, storage_path, original_path")
    .eq("id", photoId)
    .single();

  if (!photo || photo.group_id !== null || photo.original_path) {
    return { data: null, error: null };
  }

  await saveOriginal(photo.id, photo.storage_path, formData);
  return { data: true, error: null };
}

/** Host counterparts to the guest originals flow; same contract throughout. */
export async function createHostOriginalUpload(photoId: string) {
  if (!(await isHost())) return { data: null, error: null };

  const { data: photo } = await supabase
    .from("guest_photos")
    .select("id, group_id, original_path, original_at_home")
    .eq("id", photoId)
    .single();

  if (
    !photo ||
    photo.group_id !== null ||
    photo.original_path ||
    photo.original_at_home
  ) {
    return { data: null, error: null };
  }

  return { data: { ticket: await createUploadTicket(photoId) }, error: null };
}

export async function confirmHostOriginalAtHome(photoId: string) {
  if (!(await isHost())) return { data: null, error: null };

  await supabase
    .from("guest_photos")
    .update({ original_at_home: true })
    .eq("id", photoId)
    .is("group_id", null);

  return { data: true, error: null };
}
