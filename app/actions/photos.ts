"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import {
  GUEST_COOKIE,
  GUEST_SESSION_MAX_AGE,
  createGuestToken,
  readGuestToken,
} from "@/lib/guest-session";
import { PHOTO_BUCKET, MAX_UPLOAD_BYTES, UPLOAD_EXTENSIONS } from "@/lib/photo-config";

/** Not exported: only exports of a `"use server"` module become endpoints. */
async function currentGroupId() {
  const store = await cookies();
  return readGuestToken(store.get(GUEST_COOKIE)?.value);
}

/**
 * The same last-four-of-phone check the RSVP flow runs, narrowed to the single
 * column it needs. Unauthenticated visitors call this, so it must not read a
 * name, an address, or anything else back out of the guests table.
 */
export async function verifyGuestForPhotos(groupId: number, lastFour: string) {
  const { data, error } = await supabase
    .from("guests")
    .select("contact_number")
    .eq("group_id", groupId);

  if (error) {
    return { data: null, error: "Something went wrong on our end. Try again?" };
  }

  const matched = data?.some((g) => g.contact_number.slice(-4) === lastFour);
  if (!matched) {
    return {
      data: null,
      error: "That doesn't match the number we have for anyone in this group.",
    };
  }

  const store = await cookies();
  store.set(GUEST_COOKIE, await createGuestToken(groupId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GUEST_SESSION_MAX_AGE,
  });

  return { data: true, error: null };
}

export async function signOutOfPhotos() {
  const store = await cookies();
  store.delete(GUEST_COOKIE);
  return { data: true, error: null };
}

/**
 * Takes one already-downscaled photo. The browser resizes and re-encodes to
 * JPEG before calling this (see `components/photos/downscale.ts`), which is
 * also what strips EXIF — including GPS coordinates — so we never store where
 * a guest's phone thinks the photo was taken.
 */
export async function uploadGuestPhoto(formData: FormData) {
  const groupId = await currentGroupId();
  if (groupId === null) {
    return { data: null, error: "Your session expired — please verify again." };
  }

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

  const storagePath = `${groupId}/${crypto.randomUUID()}.${extension}`;

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
    // nothing would ever list it again, and it would still bill for storage.
    await supabase.storage.from(PHOTO_BUCKET).remove([storagePath]);
    return { data: null, error: "That upload didn't go through. Try again?" };
  }

  revalidatePath("/photos");
  return { data, error: null };
}
