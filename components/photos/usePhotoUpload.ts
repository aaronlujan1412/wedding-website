"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  KEEP_ORIGINALS,
  ORIGINAL_WORTH_KEEPING_RATIO,
} from "@/lib/photo-config";
import { preparePhoto } from "./downscale";
import { sendOriginalHome } from "./sendOriginal";

export type QueueItem = {
  key: string;
  name: string;
  status: "working" | "done" | "error";
  message?: string;
};

export type PhotoActions = {
  /** Saves the web-sized copy and returns the new row's id. */
  upload: (
    body: FormData,
  ) => Promise<{ data: { id: string } | null; error: string | null }>;
  /** Mints a ticket authorising one direct push to the home server. */
  createOriginalUpload: (
    photoId: string,
  ) => Promise<{ data: { ticket: string } | null }>;
  /** Records that the home server accepted it. */
  confirmOriginalAtHome: (photoId: string) => Promise<unknown>;
  /** Fallback: park the original in Supabase when home does not answer. */
  attachOriginal: (photoId: string, body: FormData) => Promise<unknown>;
};

/**
 * Shared by the guest panel and the host panel; only the actions differ.
 *
 * Two passes on purpose. The first sends the resized copies and reports
 * success, because that is what makes the photo appear on the site. The
 * originals follow afterwards, once nobody is waiting on them.
 */
export function usePhotoUpload(actions: PhotoActions) {
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

        const result = await actions.upload(body);
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
      let delivered = false;

      // Straight to the home server, so the full-resolution file never touches
      // Supabase and its storage tier stops being the limit on keeping these.
      try {
        const ticket = await actions.createOriginalUpload(id);
        if (ticket.data) {
          delivered = await sendOriginalHome(file, ticket.data.ticket);
          if (delivered) await actions.confirmOriginalAtHome(id);
        }
      } catch {
        // Fall through to the bucket.
      }

      if (delivered) continue;

      // The home server is down, and a wedding photo uploads exactly once —
      // so park it in Supabase rather than lose it. pull-originals.mjs drains
      // that bucket later, and it should normally be empty.
      const body = new FormData();
      body.set("file", file);
      try {
        await actions.attachOriginal(id, body);
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
