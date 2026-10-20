"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveReview, setCardLock, deleteCard } from "@/app/actions/board";
import { REVIEW_LABEL } from "@/lib/board-types";
import type { BoardCard, BoardColumn, ReviewKind } from "@/lib/board-types";
import { LockGlyph } from "./glyphs";

/**
 * What a person can do to a card that Claude cannot.
 *
 * The review banner is the whole oversight model made visible: Claude stopped
 * here and said what it would have done, and nothing happened until one of
 * these two buttons is pressed. Accepting a `complete` is the only way a card
 * reaches a column the agent cannot enter, and accepting a `delete` is the
 * only way anything on this board disappears.
 *
 * "Not yet" clears the flag and leaves the card exactly where it was. The
 * proposal was wrong, not the work — so it does not move, and nothing is lost.
 */

export function ReviewBanner({
  card,
  doneColumn,
}: {
  card: BoardCard;
  doneColumn: BoardColumn | undefined;
}) {
  const kind = card.review_kind as ReviewKind | null;
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!kind) return null;

  function resolve(outcome: "accept" | "dismiss") {
    startTransition(async () => {
      await resolveReview(card.id, outcome, doneColumn?.id);
      // An accepted delete takes the page with it.
      if (outcome === "accept" && kind === "delete") router.push("/me/board");
    });
  }

  return (
    <div className="bevel-out border-me-live bg-me-panel p-2.5">
      <p className="text-[13px] leading-snug text-me-live">
        Claude {REVIEW_LABEL[kind]}
      </p>
      {card.review_note ? (
        <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-me-ink">
          {card.review_note}
        </p>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending || (kind === "complete" && !doneColumn)}
          onClick={() => resolve("accept")}
          className="bevel-out bg-me-bar px-2.5 py-1 text-[12px] text-me-gold disabled:text-me-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
        >
          {kind === "delete" ? "Delete it" : kind === "complete" ? "Accept — mark it done" : "Accept"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => resolve("dismiss")}
          className="bevel-out bg-me-panel px-2.5 py-1 text-[12px] text-me-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
        >
          Not yet
        </button>
        {kind === "complete" && !doneColumn ? (
          <span className="text-[12px] text-me-dim">
            No column on this project is marked as the finished one.
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** The padlock, and the delete only a person has. */
export function CardControls({ card }: { card: BoardCard }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const locked = Boolean(card.locked_at);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => void (await setCardLock(card.id, !locked)))}
        className="flex items-center gap-1.5 text-[12px] text-me-dim hover:text-me-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-me-gold"
      >
        <LockGlyph />
        {locked ? "Unlock — let Claude work on this" : "Lock — Claude leaves this alone"}
      </button>

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await deleteCard(card.id);
            if (!result.error) router.push("/me/board");
          });
        }}
        className="ml-auto text-[12px] text-me-dim hover:text-me-live focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-me-gold"
      >
        Delete this card
      </button>
    </div>
  );
}
