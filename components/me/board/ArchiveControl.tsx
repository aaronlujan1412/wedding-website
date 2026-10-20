"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveProject, previewArchive } from "@/app/actions/board";
import { Well } from "@/components/me/Panel";
import type { BoardProject } from "@/lib/board-types";

/**
 * Archiving, with the document shown first.
 *
 * This is the one irreversible thing on the board, so it is two steps and the
 * first one is reading. Nobody should archive a project to find out what the
 * archive would have said — and seeing the summary is also the moment you
 * notice a card whose outcome was never written down, which is the point at
 * which that is still fixable.
 *
 * No modal. A dialog over the settings page would cover the thing being
 * described, and this document is worth the room.
 */

export function ArchiveControl({
  project,
  cardCount,
}: {
  project: BoardProject;
  cardCount?: number;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function look() {
    setError(null);
    startTransition(async () => {
      const result = await previewArchive(project.id);
      if (result.error) setError(result.error);
      else setPreview(result.data);
    });
  }

  function archive() {
    setError(null);
    startTransition(async () => {
      const result = await archiveProject(project.id);
      if (result.error) setError(result.error);
      else router.push("/me/board/finished");
    });
  }

  return (
    <section className="space-y-2">
      {/* Names the project and the stake in the heading, not only on the
          confirm button. Settings acts on whichever project is current, and
          "this project" reads as whatever you believe you are looking at —
          which is how the wrong board gets archived by someone moving
          quickly. Saying "Finish Homelab — 31 cards" is harder to misread
          than a heading that could belong to any of them. */}
      <h3 className="font-dot text-[11px] leading-none text-me-gold">
        Finish {project.name}
        {cardCount !== undefined ? (
          <span className="text-me-live"> — {cardCount} cards</span>
        ) : null}
      </h3>
      <p className="text-[12px] leading-snug text-me-dim">
        Archiving writes everything below into one document and removes{" "}
        {project.name}&apos;s cards, columns and thread. The document is kept.
        This cannot be undone, though you can start a new project from it later.
      </p>

      {preview === null ? (
        <button
          type="button"
          disabled={pending}
          onClick={look}
          className="bevel-out bg-me-panel px-2.5 py-1.5 text-[12px] text-me-ink pointer-coarse:px-3 pointer-coarse:py-2.5 disabled:text-me-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
        >
          {pending ? "Reading…" : "Show me what would be kept"}
        </button>
      ) : (
        <div className="space-y-2">
          <Well>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap font-forum text-[12px] leading-relaxed text-me-ink">
              {preview}
            </pre>
          </Well>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={archive}
              className="bevel-out border-me-live bg-me-panel px-2.5 py-1.5 text-[12px] text-me-live pointer-coarse:px-3 pointer-coarse:py-2.5 disabled:text-me-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
            >
              {pending ? "Archiving…" : `Archive ${project.name}`}
            </button>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="text-[12px] text-me-dim hover:text-me-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-me-gold"
            >
              Keep it open
            </button>
          </div>
        </div>
      )}

      {error ? <p className="text-[12px] text-me-live">{error}</p> : null}
    </section>
  );
}
