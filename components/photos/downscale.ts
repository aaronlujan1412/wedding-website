import { JPEG_QUALITY, MAX_EDGE_PX } from "@/lib/photo-config";

export type PreparedPhoto = {
  file: File;
  width: number;
  height: number;
};

/**
 * Resize a picked photo in the browser before it goes anywhere.
 *
 * Three things fall out of doing this client-side rather than on the server:
 * a 4 MB phone photo becomes roughly 500 KB, so uploads survive lodge wifi;
 * storage stays inside the Supabase free tier; and re-encoding through a
 * canvas discards EXIF, which is how the guest's GPS coordinates stop being
 * attached to the photo.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  // `from-image` applies the EXIF rotation during decode. Without it every
  // photo shot in portrait lands sideways, because stripping EXIF also throws
  // away the orientation flag the browser would otherwise have honoured.
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });

  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable in this browser.");

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) throw new Error("This photo could not be re-encoded.");

  const name = file.name.replace(/\.[^.]+$/, "") || "photo";
  return {
    file: new File([blob], `${name}.jpg`, { type: "image/jpeg" }),
    width,
    height,
  };
}
