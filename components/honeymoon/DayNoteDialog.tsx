"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { saveDayNote } from "@/app/actions/honeymoon";
import { Field, TextArea, TextInput } from "./FormParts";
import { formatDayLong } from "./trip";
import type { TripDay } from "./types";

/** Names a day ("Arrival", "Slow morning") and hangs a note off it. */
export function DayNoteDialog({
  date,
  existing,
  onClose,
}: {
  date: string | null;
  existing?: TripDay;
  onClose: () => void;
}) {
  return (
    <Dialog open={date !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card sm:max-w-md">
        {/* Keyed on the day, so switching days remounts with that day's note. */}
        {date && (
          <NoteForm
            key={date}
            date={date}
            existing={existing}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function NoteForm({
  date,
  existing,
  onClose,
}: {
  date: string;
  existing?: TripDay;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(existing?.title ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveDayNote(date, title, note);
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-garamond text-2xl">Day note</DialogTitle>
        <DialogDescription className="font-garamond text-base">
          {formatDayLong(date)}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={submit} className="space-y-4">
        <Field
          label="Call this day"
          hint="Shows above the leg name on the column."
        >
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Note">
          <TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 font-raleway text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save note"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
