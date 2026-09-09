"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { VisuallyHidden } from "radix-ui";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { GalleryPhoto } from "./types";

/** Square crops: guest photos arrive in every orientation, and a ragged grid
 *  of mixed portrait and landscape reads as broken rather than casual. */
function layoutFor(count: number) {
  if (count >= 4) return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4";
  if (count === 3) return "mx-auto max-w-2xl grid-cols-3";
  return "mx-auto max-w-md grid-cols-2";
}

export function PhotoGrid({ photos }: { photos: GalleryPhoto[] }) {
  const [openAt, setOpenAt] = useState<number | null>(null);

  function step(delta: number) {
    setOpenAt((i) =>
      i === null ? i : (i + delta + photos.length) % photos.length,
    );
  }

  const active = openAt === null ? null : photos[openAt];

  return (
    <>
      <ul className={`grid gap-3 ${layoutFor(photos.length)}`}>
        {photos.map((photo, index) => (
          <li key={photo.src}>
            <button
              type="button"
              onClick={() => setOpenAt(index)}
              aria-label={`View ${photo.alt}`}
              className="group block aspect-square w-full overflow-hidden rounded-md border border-border bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                width={photo.width}
                height={photo.height}
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={active !== null} onOpenChange={() => setOpenAt(null)}>
        <DialogContent
          className="max-w-[95vw] border-none bg-transparent p-0 shadow-none sm:max-w-4xl"
          showCloseButton={false}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") step(1);
            if (e.key === "ArrowLeft") step(-1);
          }}
        >
          <VisuallyHidden.Root>
            <DialogTitle>{active?.alt ?? "Photo"}</DialogTitle>
          </VisuallyHidden.Root>

          {active && (
            <div className="relative">
              <Image
                src={active.src}
                alt={active.alt}
                width={active.width}
                height={active.height}
                sizes="(max-width: 768px) 95vw, 896px"
                className="h-auto max-h-[85vh] w-full rounded-lg object-contain"
              />

              {photos.length > 1 && (
                <>
                  <Arrow side="left" onClick={() => step(-1)} />
                  <Arrow side="right" onClick={() => step(1)} />
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Arrow({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 text-foreground shadow-sm transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        side === "left" ? "left-2" : "right-2"
      }`}
    >
      <Icon className="h-5 w-5" strokeWidth={1.5} />
    </button>
  );
}
