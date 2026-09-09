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
import { saveOriginal, saveWebPhoto } from "@/lib/photo-storage";
import { createUploadTicket } from "@/lib/upload-ticket";
import {
  checkVerificationLimit,
  recordVerificationFailure,
} from "@/lib/rate-limit";

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
  const limit = await checkVerificationLimit();
  if (!limit.ok) {
    return {
      data: null,
      error: `Too many tries. Give it ${limit.retryAfterMinutes} minutes and have another go.`,
    };
  }

  const { data, error } = await supabase
    .from("guests")
    .select("contact_number")
    .eq("group_id", groupId);

  if (error) {
    return { data: null, error: "Something went wrong on our end. Try again?" };
  }

  const matched = data?.some((g) => g.contact_number.slice(-4) === lastFour);
  if (!matched) {
    await recordVerificationFailure(limit.caller);
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

  const result = await saveWebPhoto(groupId, formData);
  if (result.data) revalidatePath("/photos");
  return result;
}

/**
 * A ticket letting this browser push one original straight to the home server.
 *
 * Ownership is checked here rather than at the receiver, which knows nothing
 * about guest sessions: without it a verified guest could mint tickets for
 * another household's photos.
 */
export async function createOriginalUpload(photoId: string) {
  const groupId = await currentGroupId();
  if (groupId === null) return { data: null, error: null };

  const { data: photo } = await supabase
    .from("guest_photos")
    .select("id, group_id, original_path, original_at_home")
    .eq("id", photoId)
    .single();

  if (
    !photo ||
    photo.group_id !== groupId ||
    photo.original_path ||
    photo.original_at_home
  ) {
    return { data: null, error: null };
  }

  return { data: { ticket: await createUploadTicket(photoId) }, error: null };
}

/**
 * Records that the home server took the original.
 *
 * Asserted by the browser rather than reported by the receiver, which cannot
 * reach Supabase. A guest could therefore claim an upload that never happened;
 * the cost is a wrong entry in our own bookkeeping, not access to anything, so
 * it is not worth a webhook to close.
 */
export async function confirmOriginalAtHome(photoId: string) {
  const groupId = await currentGroupId();
  if (groupId === null) return { data: null, error: null };

  await supabase
    .from("guest_photos")
    .update({ original_at_home: true })
    .eq("id", photoId)
    .eq("group_id", groupId);

  return { data: true, error: null };
}

/**
 * Fallback when the home server did not answer: park the original in Supabase
 * so `scripts/pull-originals.mjs` can collect it later.
 *
 * Best-effort throughout — the guest has already been told their photo is in,
 * and it is. Losing the full-size copy costs an archive entry, not an upload.
 */
export async function attachOriginal(photoId: string, formData: FormData) {
  const groupId = await currentGroupId();
  if (groupId === null) return { data: null, error: null };

  const { data: photo } = await supabase
    .from("guest_photos")
    .select("id, group_id, storage_path, original_path")
    .eq("id", photoId)
    .single();

  if (!photo || photo.group_id !== groupId || photo.original_path) {
    return { data: null, error: null };
  }

  await saveOriginal(photo.id, photo.storage_path, formData);
  return { data: true, error: null };
}
