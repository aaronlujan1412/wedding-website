/**
 * Shared between the upload action and the browser-side resizer, so the two
 * can't drift into disagreeing about what is acceptable.
 */

export const PHOTO_BUCKET = "guest-photos";

/** Generous: the browser aims far below this, so hitting it means something
 *  went wrong with resizing rather than that the photo is legitimately huge. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Content types we accept, mapped to the extension we store them under. */
export const UPLOAD_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Longest edge we keep. Plenty for a web gallery, ~10x smaller than an
 *  untouched phone photo, and it makes uploads survive bad venue wifi. */
export const MAX_EDGE_PX = 2048;

export const JPEG_QUALITY = 0.82;

/**
 * Where untouched originals go. Private, unlike the web bucket: nothing links
 * to these, they exist to be pulled down to the home server. See
 * `scripts/pull-originals.mjs`.
 */
export const ORIGINALS_BUCKET = "guest-photo-originals";

/**
 * Whether the browser also sends the untouched file after the web-sized copy
 * lands. Turn off if the Supabase bucket is filling faster than originals are
 * being archived — the gallery is unaffected either way.
 */
export const KEEP_ORIGINALS = true;

/** Phone photos run 3-6 MB; this leaves room for a burst-mode RAW-ish JPEG. */
export const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;

/**
 * Skip the second upload when it would buy almost nothing — a photo already
 * under the long edge comes back from the resizer near its original size.
 */
export const ORIGINAL_WORTH_KEEPING_RATIO = 1.25;
