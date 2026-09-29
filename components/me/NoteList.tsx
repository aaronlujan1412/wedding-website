import Link from "next/link";
import type { NoteSummary } from "@/lib/brain-queries";

/** Confidence is the vault's own word for how much to trust a note. */
const CONFIDENCE_INK: Record<string, string> = {
  verified: "text-[var(--me-phosphor)]",
  asserted: "text-me-dim",
  uncertain: "text-me-live",
};

/**
 * One row per note: the claim, where it lives, and enough body to recognise it.
 *
 * The title IS the claim in this vault — a full sentence, often long — so it
 * gets the row rather than being squeezed beside metadata.
 */
export function NoteList({
  notes,
  empty = "Nothing here.",
}: {
  notes: NoteSummary[];
  empty?: string;
}) {
  if (!notes.length) {
    return <p className="text-[13px] text-me-dim">{empty}</p>;
  }

  return (
    <ul className="space-y-2">
      {notes.map((note) => (
        <li key={note.id}>
          <Link
            href={`/me/brain/note/${note.id}`}
            className="bevel-in block bg-me-void p-3 transition-colors hover:bg-me-bar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
          >
            <p className="text-[13px] leading-snug text-me-ink">
              {note.title ?? note.path}
            </p>

            <p className="mt-1.5 text-[12px] leading-relaxed text-me-dim">
              {note.excerpt}
            </p>

            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-dot text-[11px]">
              <span className="text-me-gold">{note.bucket || "root"}</span>
              {note.confidence ? (
                <span className={CONFIDENCE_INK[note.confidence] ?? "text-me-dim"}>
                  {note.confidence}
                </span>
              ) : null}
              {note.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="text-me-link">
                  #{tag}
                </span>
              ))}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
