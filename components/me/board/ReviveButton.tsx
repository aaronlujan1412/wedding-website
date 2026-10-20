"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviveArchive } from "@/app/actions/board";

/**
 * Start a new project from an archive.
 *
 * The archive stays where it is. This is picking the thread back up, not
 * undoing the archive — the new project opens carrying the summary as its
 * description and none of the dead cards, which is the whole reason the
 * summary was worth writing.
 */
export function ReviveButton({
  archiveId,
  name,
}: {
  archiveId: string;
  name: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await reviveArchive(archiveId);
            if (result.error) setError(result.error);
            else router.push("/me/board");
          });
        }}
        className="bevel-out bg-me-panel px-2.5 py-1.5 text-[12px] text-me-ink pointer-coarse:px-3 pointer-coarse:py-2.5 disabled:text-me-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
      >
        {pending ? "Starting…" : "Pick it back up"}
      </button>
      {error ? (
        <span className="text-[12px] text-me-live">{error}</span>
      ) : (
        <span className="text-[12px] text-me-dim">
          Starts a new project called {name}, carrying this summary.
        </span>
      )}
    </div>
  );
}
