import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Face } from "./faces";

/**
 * One person's photo, or their initial when the bucket has none for them.
 *
 * `unoptimized` because the src is a signed URL that expires: the optimizer
 * would cache it under a URL that stops working, and the uploads are already
 * cut to the size they're drawn at. The name always sits beside the photo,
 * so the image itself is decoration to a screen reader.
 */
export function Portrait({ face, className }: { face: Face; className?: string }) {
  if (!face.src) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "flex items-center justify-center bg-secondary font-garamond text-muted-foreground",
          className,
        )}
      >
        {face.name.charAt(0)}
      </span>
    );
  }

  return (
    <Image
      src={face.src}
      alt=""
      width={360}
      height={480}
      unoptimized
      className={cn("bg-secondary object-cover object-[50%_30%]", className)}
    />
  );
}
