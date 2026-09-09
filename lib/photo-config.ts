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
 * The home server's upload receiver, e.g.
 * "https://weddingphotos.tail9cdc9c.ts.net". Empty disables the direct path
 * entirely and every original falls back to Supabase.
 *
 * Public by necessity — the browser posts to it — which is why the receiver
 * authenticates each upload with a signed ticket rather than trusting the URL.
 */
export const ORIGINALS_ENDPOINT =
  process.env.NEXT_PUBLIC_ORIGINALS_ENDPOINT ?? "";

/**
 * Fallback home for an original when the home server does not answer. Private,
 * unlike the web bucket. Nothing links to these; they wait here to be drained
 * by `scripts/pull-originals.mjs` and should normally be empty.
 */
export const ORIGINALS_BUCKET = "guest-photo-originals";

/**
 * Whether the browser also sends the untouched file after the web-sized copy
 * lands. Turn off to stop collecting originals altogether — the gallery is
 * unaffected either way, since it only ever serves the resized copies.
 */
export const KEEP_ORIGINALS = true;

/** Phone photos run 3-6 MB; this leaves room for a burst-mode RAW-ish JPEG. */
export const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;

/**
 * Skip the second upload when it would buy almost nothing — a photo already
 * under the long edge comes back from the resizer near its original size.
 */
export const ORIGINAL_WORTH_KEEPING_RATIO = 1.25;
