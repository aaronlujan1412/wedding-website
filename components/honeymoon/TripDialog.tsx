"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteTrip, saveTrip, type TripInput } from "@/app/actions/trips";
import { cn } from "@/lib/utils";
import { SHEET, SHEET_FOOTER, Field, Fieldset, TextArea, TextInput } from "./FormParts";
import { daysBetween, formatDayLong } from "./trip";
import type { Trip } from "./types";

/** Editing the trip you're on, or making a new one. */
export type TripDraft = { trip: Trip | null };

type FormState = {
  name: string;
  name_ja: string;
  starts_on: string;
  ends_on: string;
  note: string;
};

function toForm(trip: Trip | null): FormState {
  return {
    name: trip?.name ?? "",
    name_ja: trip?.name_ja ?? "",
    starts_on: trip?.starts_on ?? "",
    ends_on: trip?.ends_on ?? "",
    note: trip?.note ?? "",
  };
}

export function TripDialog({
  draft,
  onClose,
}: {
  draft: TripDraft | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={draft !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className={cn(SHEET, "sm:max-h-[85vh] sm:max-w-lg")}>
        {draft && (
          <TripForm
            key={draft.trip?.id ?? "new"}
            trip={draft.trip}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TripForm({ trip, onClose }: { trip: Trip | null; onClose: () => void }) {
  const [form, setForm] = useState(() => toForm(trip));
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Inclusive at both ends, so a trip that starts and ends the same day is one
  // day long rather than none.
  const days =
    form.starts_on && form.ends_on && form.ends_on >= form.starts_on
      ? daysBetween(form.starts_on, form.ends_on) + 1
      : 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveTrip(trip?.id ?? null, form as TripInput);
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  function remove() {
    if (!trip) return;
    startTransition(async () => {
      const result = await deleteTrip(trip.id);
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-garamond text-2xl">
          {trip ? `Edit ${trip.name}` : "Make a new trip"}
        </DialogTitle>
        <DialogDescription className="font-garamond text-base">
          The dates are the board&apos;s columns. Legs, beds and trains all go
          inside them, and a day you haven&apos;t decided a city for is an
          ordinary empty column rather than a missing one.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={submit} className="space-y-6">
        <Fieldset legend="What it is">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <TextInput
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                autoFocus
              />
            </Field>
            <Field label="In Japanese">
              <TextInput
                value={form.name_ja}
                onChange={(e) => set("name_ja", e.target.value)}
                className="font-jp"
              />
            </Field>
          </div>
        </Fieldset>

        <Fieldset legend="When">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First day">
              <TextInput
                type="date"
                value={form.starts_on}
                onChange={(e) => set("starts_on", e.target.value)}
              />
            </Field>
            <Field label="Last day" hint="The day you come home.">
              <TextInput
                type="date"
                value={form.ends_on}
                onChange={(e) => set("ends_on", e.target.value)}
              />
            </Field>
          </div>
          {days > 0 && (
            <p className="font-mono text-xs text-muted-foreground tabular-nums slashed-zero">
              {days} {days === 1 ? "day" : "days"} · {formatDayLong(form.starts_on)}{" "}
              to {formatDayLong(form.ends_on)}
            </p>
          )}
        </Fieldset>

        <Fieldset legend="Notes">
          <Field label="Anything else">
            <TextArea
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
            />
          </Field>
        </Fieldset>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 font-raleway text-sm text-destructive"
          >
            {error}
          </p>
        )}

        {confirming && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 font-raleway text-sm text-destructive">
            Deleting {trip?.name} takes everything in it — every card, leg, bed,
            flight and train. There is no undo for this one.
          </p>
        )}

        <DialogFooter className={cn(SHEET_FOOTER, "sm:justify-between")}>
          <div className="flex gap-2">
            {trip &&
              (confirming ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={remove}
                  disabled={pending}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  Yes, delete all of it
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setConfirming(true)}
                  disabled={pending}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  Delete
                </Button>
              ))}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : trip ? "Save changes" : "Make it"}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </>
  );
}
