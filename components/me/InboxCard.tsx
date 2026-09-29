"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  approveNote,
  rejectNote,
  undoDecision,
  type DecisionState,
} from "@/app/actions/brain";
import { DESTINATIONS, type InboxEntry } from "@/lib/brain-types";

const EMPTY: DecisionState = { error: null };

const BUTTON =
  "bevel-out bg-me-bar px-3 py-1.5 font-dot text-[13px] leading-none text-me-ink hover:bg-me-edge-hi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold active:bevel-in disabled:opacity-60";

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={BUTTON}>
      {pending ? "…" : children}
    </button>
  );
}

/**
 * One staged note, with its whole body and the two things you can do about it.
 *
 * The body is shown in full rather than as an excerpt: deciding whether a note
 * belongs in the brain means reading the claim it makes, and a queue of three
 * is not a scrolling problem.
 */
export function InboxCard({ entry }: { entry: InboxEntry }) {
  const [approveState, approve] = useActionState(approveNote, EMPTY);
  const [rejectState, reject] = useActionState(rejectNote, EMPTY);
  const [undoState, undo] = useActionState(undoDecision, EMPTY);

  const error = approveState.error ?? rejectState.error ?? undoState.error;
  const pending = entry.pending;

  return (
    <article className="bevel-in bg-me-void p-3.5">
      <h3 className="text-[13px] leading-snug text-me-ink">
        {entry.title ?? entry.path}
      </h3>

      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-dot text-[11px] text-me-dim">
        <span className="break-all">{entry.path}</span>
        {entry.confidence ? <span>{entry.confidence}</span> : null}
        {entry.tags.map((tag) => (
          <span key={tag} className="text-me-link">
            #{tag}
          </span>
        ))}
      </p>

      <div className="me-prose mt-3 max-w-[68ch] border-t-2 border-me-edge-lo pt-3">
        {entry.body.split(/\n{2,}/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      <div className="mt-4 border-t-2 border-me-edge-lo pt-3">
        {pending ? (
          /* Decided, and waiting for the box to carry it out. Shown rather
             than hidden, so a queue that stops draining is visible instead of
             looking like the click did nothing. */
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-dot text-[12px]">
              {pending.state === "failed" ? (
                <span className="text-me-live">
                  the box couldn&apos;t: {pending.error}
                </span>
              ) : pending.decision === "approve" ? (
                <span className="text-me-gold">
                  approved → {pending.destination}, waiting for the box
                </span>
              ) : (
                <span className="text-me-dim">
                  rejected, waiting for the box
                </span>
              )}
            </p>
            <form action={undo}>
              <input type="hidden" name="id" value={pending.id} />
              <Submit>undo</Submit>
            </form>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <form action={approve} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="path" value={entry.path} />
              <input type="hidden" name="title" value={entry.title ?? ""} />
              <label className="flex flex-col gap-1">
                <span className="font-dot text-[11px] text-me-dim">
                  file it under
                </span>
                <select
                  name="destination"
                  defaultValue="Reference"
                  className="bevel-in bg-me-void px-2 py-1.5 text-[13px] text-me-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
                >
                  {DESTINATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <Submit>approve</Submit>
            </form>

            <form action={reject}>
              <input type="hidden" name="path" value={entry.path} />
              <input type="hidden" name="title" value={entry.title ?? ""} />
              <Submit>reject</Submit>
            </form>
          </div>
        )}

        <p aria-live="polite" className="mt-2 text-[12px] text-me-live">
          {error}
        </p>
      </div>
    </article>
  );
}
