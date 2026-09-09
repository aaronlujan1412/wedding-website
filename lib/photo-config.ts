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
