"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  KEEP_ORIGINALS,
  ORIGINAL_WORTH_KEEPING_RATIO,
} from "@/lib/photo-config";
import { preparePhoto } from "./downscale";

export type QueueItem = {
  key: string;
  name: string;
  status: "working" | "done" | "error";
  message?: string;
};

type Upload = (
  body: FormData,
) => Promise<{ data: { id: string } | null; error: string | null }>;

type AttachOriginal = (photoId: string, body: FormData) => Promise<unknown>;

/**
 * Shared by the guest panel and the host panel; only the two actions differ.
 *
 * Two passes on purpose. The first sends the resized copies and reports
 * success, because that is what makes the photo appear on the site. The
 * originals follow afterwards, once nobody is waiting on them.
 */
export function usePhotoUpload(upload: Upload, attachOriginal: AttachOriginal) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function update(key: string, patch: Partial<QueueItem>) {
    setQueue((q) => q.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;

    const picked = Array.from(files).map((file) => ({
      file,
      key: crypto.randomUUID(),
    }));

    setQueue((q) => [
      ...picked.map(({ file, key }) => ({
        key,
        name: file.name,
        status: "working" as const,
      })),
      ...q,
    ]);
    setBusy(true);

    const originals: { id: string; file: File }[] = [];

    // Sequential on purpose: venue wifi is the constraint here, and a dozen
    // parallel uploads on a weak connection is how you get a dozen timeouts.
    for (const { file, key } of picked) {
      try {
        const prepared = await preparePhoto(file);

        const body = new FormData();
        body.set("file", prepared.file);
        body.set("width", String(prepared.width));
        body.set("height", String(prepared.height));

        const result = await upload(body);
        if (result.error || !result.data) {
          update(key, {
            status: "error",
            message: result.error ?? "That one didn't go through.",
          });
          continue;
        }

        update(key, { status: "done" });

        const worthKeeping =
          file.size > prepared.file.size * ORIGINAL_WORTH_KEEPING_RATIO;
        if (KEEP_ORIGINALS && worthKeeping) {
          originals.push({ id: result.data.id, file });
        }
      } catch {
        update(key, {
          status: "error",
          message: "We couldn't read that one — try a JPEG or PNG.",
        });
      }
    }

    if (inputRef.current) inputRef.current.value = "";
    setBusy(false);
    router.refresh();

    if (originals.length === 0) return;

    setArchiving(true);
    for (const { id, file } of originals) {
      const body = new FormData();
      body.set("file", file);
      try {
        await attachOriginal(id, body);
      } catch {
        // Best-effort by design. The photo is already saved and shown; losing
        // the full-size copy costs an archive entry, not the guest's upload.
      }
    }
    setArchiving(false);
  }

  return {
    queue,
    busy,
    archiving,
    inputRef,
    handleFiles,
    done: queue.filter((i) => i.status === "done").length,
  };
}
