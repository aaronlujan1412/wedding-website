"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { HOST_COOKIE, isValidSessionToken } from "@/lib/admin-session";
import { PHOTO_BUCKET } from "@/lib/photo-config";

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
