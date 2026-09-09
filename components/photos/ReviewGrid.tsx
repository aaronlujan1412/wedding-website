"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Camera, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  attachHostOriginal,
  deletePhoto,
  setPhotoHidden,
  uploadHostPhoto,
} from "@/app/actions/photo-review";
import { usePhotoUpload } from "./usePhotoUpload";
import { UploadQueue } from "./UploadQueue";

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
      <HostUpload />

      {error && (
        <p className="mb-4 font-raleway text-sm text-destructive">{error}</p>
      )}

      {photos.length === 0 ? (
        <section className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
          <h2 className="font-garamond text-2xl text-foreground">
            Nothing posted yet
          </h2>
          <p className="mx-auto mt-3 max-w-sm font-garamond text-lg text-muted-foreground">
            Guest uploads land here first. Hiding one pulls it off /photos but
            keeps the file, so a mis-click is undoable.
          </p>
        </section>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {photos.map((photo) => (
            <ReviewTile key={photo.id} photo={photo} onError={setError} />
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * Hosts posting their own. These skip review entirely — they go up visible,
 * because reviewing your own upload the moment after making it is theatre.
 */
function HostUpload() {
  const { queue, busy, archiving, inputRef, handleFiles, done } =
    usePhotoUpload(uploadHostPhoto, attachHostOriginal);

  return (
    <div className="mb-10 rounded-lg border border-border bg-card p-6 text-center">
      <p className="font-garamond text-xl text-foreground">Add your own</p>
      <p className="mt-2 font-raleway text-sm text-muted-foreground">
        Posted as Aaron &amp; Savea, and visible on the site straight away.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <Button
        className="mt-4"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            Uploading…
          </>
        ) : (
          <>
            <Camera className="h-4 w-4" strokeWidth={1.5} />
            Choose photos
          </>
        )}
      </Button>

      <div className="mx-auto max-w-md">
        <UploadQueue items={queue} />
      </div>

      {done > 0 && !busy && (
        <p className="mt-3 font-garamond text-lg text-primary">
          {done === 1 ? "Up it goes." : `All ${done} are up.`}
        </p>
      )}

      {archiving && (
        <p className="mt-2 font-raleway text-xs text-muted-foreground">
          Tucking away full-size copies.
        </p>
      )}
    </div>
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
