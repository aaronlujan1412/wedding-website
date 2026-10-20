"use client";

import { useState, useTransition } from "react";
import { updateCard } from "@/app/actions/board";
import type { BoardCard } from "@/lib/board-types";
import { INPUT, Field } from "./field";

/**
 * Editing a card, in place.
 *
 * Four fields that do different jobs, so the form says which is which rather
 * than offering four identical boxes:
 *
 *   title    what it is, in a line — this is what the board shows
 *   summary  where it stands NOW, rewritten as things change. Claude keeps
 *            this current through the API, and it is what archiving
 *            compresses, so it is the field that earns its keep.
 *   body     the brief. Background that does not change as work proceeds.
 *   labels   the devices and sizes the board draws under a card
 *
 * Read mode is the default and editing is a toggle, because a card is read far
 * more often than it is written and a page of input boxes reads as a form to
 * fill in rather than as something to pick up.
 */

export function CardEditor({ card }: { card: BoardCard }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-[12px] text-me-dim hover:text-me-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-me-gold"
      >
        Edit this card
      </button>
    );
  }

  function save(formData: FormData) {
    setError(null);
    const title = String(formData.get("title") ?? "").trim();
    if (!title) {
      setError("A card needs a title.");
      return;
    }
    startTransition(async () => {
      const result = await updateCard(card.id, {
        title,
        body: String(formData.get("body") ?? ""),
        summary: String(formData.get("summary") ?? ""),
        // Comma-separated in, array out. Labels are short device names and
        // sizes, never prose, so a comma is a safe separator and a tag widget
        // would be three times the code for the same result.
        labels: String(formData.get("labels") ?? "")
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean),
      });
      if (result.error) setError(result.error);
      else setEditing(false);
    });
  }

  return (
    <form action={save} className="space-y-3">
      <Field label="Title" hint="What the board shows.">
        <input
          name="title"
          defaultValue={card.title}
          className={INPUT}
          autoFocus
        />
      </Field>

      <Field label="Where this stands" hint="Rewritten as things change. Claude keeps this current.">
        <textarea name="summary" rows={3} defaultValue={card.summary ?? ""} className={INPUT} />
      </Field>

      <Field label="The brief" hint="Background that does not change as work proceeds.">
        <textarea name="body" rows={4} defaultValue={card.body ?? ""} className={INPUT} />
      </Field>

      <Field label="Labels" hint="Comma separated — devices, sizes.">
        <input name="labels" defaultValue={card.labels.join(", ")} className={INPUT} />
      </Field>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="bevel-out bg-me-bar px-2.5 py-1 text-[12px] text-me-gold disabled:text-me-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          className="text-[12px] text-me-dim hover:text-me-ink"
        >
          Cancel
        </button>
        {error ? <span className="text-[12px] text-me-live">{error}</span> : null}
      </div>
    </form>
  );
}


