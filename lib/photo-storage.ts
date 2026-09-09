import "server-only";

import { supabase } from "./supabase";
import {
  MAX_ORIGINAL_BYTES,
  MAX_UPLOAD_BYTES,
  ORIGINALS_BUCKET,
  PHOTO_BUCKET,
  UPLOAD_EXTENSIONS,
} from "./photo-config";

/**
 * The actual writes behind every photo upload.
 *
 * Deliberately not a `"use server"` module and deliberately unauthenticated:
 * each caller does its own auth first — guest session for guest uploads, host
 * cookie for host uploads — and these never become endpoints of their own.
 */

type Saved = { data: { id: string } | null; error: string | null };

export async function saveWebPhoto(
  groupId: number | null,
  formData: FormData,
): Promise<Saved> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { data: null, error: "No photo came through. Try again?" };
  }

  const extension = UPLOAD_EXTENSIONS[file.type];
  if (!extension) {
    return { data: null, error: "We can only take JPEG, PNG or WebP images." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { data: null, error: "That photo is too big, even after resizing." };
  }

  const width = Number(formData.get("width"));
  const height = Number(formData.get("height"));
  if (![width, height].every((n) => Number.isInteger(n) && n > 0)) {
    return { data: null, error: "We couldn't read that photo's dimensions." };
  }

  const storagePath = `${groupId ?? "hosts"}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { data: null, error: "That upload didn't go through. Try again?" };
  }

  const { data, error } = await supabase
    .from("guest_photos")
    .insert({ group_id: groupId, storage_path: storagePath, width, height })
    .select("id")
    .single();

  if (error) {
    // Never strand an object in the bucket with no row pointing at it —
    // nothing would ever list it again, and it still bills for storage.
    await supabase.storage.from(PHOTO_BUCKET).remove([storagePath]);
    return { data: null, error: "That upload didn't go through. Try again?" };
  }

  return { data, error: null };
}

/** Anything the browser can produce; these are archived, never rendered. */
const ORIGINAL_EXTENSION = /^[a-z0-9]{2,5}$/;

function originalExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ORIGINAL_EXTENSION.test(fromName)) return fromName;
  return UPLOAD_EXTENSIONS[file.type] ?? "bin";
}

/**
 * Best-effort. The caller has already authorised this photo, and the web-sized
 * copy is safely stored by the time we get here, so every failure is a shrug
 * rather than something the guest should be told about.
 */
export async function saveOriginal(
  photoId: string,
  storagePath: string,
  formData: FormData,
): Promise<{ ok: boolean }> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false };
  if (!file.type.startsWith("image/")) return { ok: false };
  if (file.size > MAX_ORIGINAL_BYTES) return { ok: false };

  // Mirrors the web copy's path so the two are obviously a pair on disk once
  // they have been pulled down to the home server.
  const originalPath = `${storagePath.replace(/\.[^.]+$/, "")}.${originalExtension(file)}`;

  const { error: uploadError } = await supabase.storage
    .from(ORIGINALS_BUCKET)
    .upload(originalPath, file, { contentType: file.type, upsert: false });

  if (uploadError) return { ok: false };

  const { error } = await supabase
    .from("guest_photos")
    .update({ original_path: originalPath })
    .eq("id", photoId);

  if (error) {
    await supabase.storage.from(ORIGINALS_BUCKET).remove([originalPath]);
    return { ok: false };
  }

  return { ok: true };
}
