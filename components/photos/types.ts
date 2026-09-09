export type GalleryPhoto = {
  src: string;
  /** Intrinsic dimensions — next/image only uses these as an aspect ratio. */
  width: number;
  height: number;
  alt: string;
};

/**
 * What the /photos grid is currently showing. `curated` is our own photos,
 * shown until guests have posted anything, so the page is never an empty grid.
 */
export type Gallery =
  | { source: "guests"; photos: GalleryPhoto[] }
  | { source: "curated"; photos: GalleryPhoto[] };

/** The verified household a browser is posting as. */
export type PhotoSession = { id: number; name: string };
