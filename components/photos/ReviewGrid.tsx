"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { deletePhoto, setPhotoHidden } from "@/app/actions/photo-review";

export type ReviewPhoto = {
  id: string;
  src: string;
  width: number;
  height: number;
  hidden: boolean;
  createdAt: string;
  groupName: string;
};

export function ReviewGrid({ photos }: { photos: ReviewPhoto[] }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      {error && (
        <p className="mb-4 font-raleway text-sm text-destructive">{error}</p>
      )}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {photos.map((photo) => (
          <ReviewTile key={photo.id} photo={photo} onError={setError} />
        ))}
      </ul>
    </>
  );
}

function ReviewTile({
  photo,
  onError,
}: {
  photo: ReviewPhoto;
  onError: (message: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ error: string | null }>) {
    onError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) onError(result.error);
    });
  }

  return (
    <li className={pending ? "opacity-50" : undefined}>
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <Image
          src={photo.src}
          alt={`Posted by ${photo.groupName}`}
          width={photo.width}
          height={photo.height}
          sizes="(max-width: 640px) 50vw, 33vw"
          className={`aspect-square w-full object-cover ${
            photo.hidden ? "grayscale opacity-40" : ""
          }`}
        />
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate font-garamond text-base text-foreground">
          {photo.groupName}
        </span>
        <span className="shrink-0 font-mono text-[0.65rem] tabular-nums text-muted-foreground">
          {new Date(photo.createdAt).toLocaleDateString()}
        </span>
      </div>

      <div className="mt-1 flex gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setPhotoHidden(photo.id, !photo.hidden))}
          className="inline-flex items-center gap-1 font-raleway text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline disabled:opacity-50"
        >
          {photo.hidden ? (
            <>
              <Eye className="h-3.5 w-3.5" strokeWidth={1.5} /> Show
            </>
          ) : (
            <>
              <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} /> Hide
            </>
          )}
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm("Delete this photo for good? This can't be undone.")) {
              return;
            }
            run(() => deletePhoto(photo.id));
          }}
          className="inline-flex items-center gap-1 font-raleway text-xs text-muted-foreground underline-offset-4 hover:text-destructive hover:underline disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} /> Delete
        </button>
      </div>
    </li>
  );
}
