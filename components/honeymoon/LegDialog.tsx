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
import { deleteLeg, saveLeg } from "@/app/actions/honeymoon";
import { Field, Fieldset, TextArea, TextInput } from "./FormParts";
import type { TripLeg } from "./types";

const EMPTY = {
  name: "",
  name_ja: "",
  starts_on: "",
  ends_on: "",
  lodging_name: "",
  lodging_address: "",
  lodging_url: "",
  lodging_confirmation: "",
  lodging_check_in: "",
  lodging_check_out: "",
  note: "",
};

function toForm(leg: TripLeg | null) {
  if (!leg) return EMPTY;
  return {
    name: leg.name,
    name_ja: leg.name_ja ?? "",
    starts_on: leg.starts_on,
    ends_on: leg.ends_on,
    lodging_name: leg.lodging_name ?? "",
    lodging_address: leg.lodging_address ?? "",
    lodging_url: leg.lodging_url ?? "",
    lodging_confirmation: leg.lodging_confirmation ?? "",
    lodging_check_in: leg.lodging_check_in ?? "",
    lodging_check_out: leg.lodging_check_out ?? "",
    note: leg.note ?? "",
  };
}

/**
 * A leg owns a stretch of dates and the bed you sleep in across them. Lodging
 * belongs here rather than on a card, because you don't drag where you sleep —
 * it's a property of the days, not an item in them.
 */
export function LegDialog({
  open,
  leg,
  onClose,
}: {
  open: boolean;
  leg: TripLeg | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto bg-card sm:max-w-lg">
        {/* Keyed on the leg, so editing a different one remounts the form. */}
        {open && <LegForm key={leg?.id ?? "new"} leg={leg} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function LegForm({
  leg,
  onClose,
}: {
  leg: TripLeg | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState(() => toForm(leg));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (key: keyof typeof EMPTY, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveLeg(leg?.id ?? null, form);
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  function remove() {
    if (!leg) return;
    startTransition(async () => {
      const result = await deleteLeg(leg.id);
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-garamond text-2xl">
          {leg ? `Edit ${leg.name}` : "Add a leg"}
        </DialogTitle>
        <DialogDescription className="font-garamond text-base">
          A city and the run of days you&apos;re in it. The board draws its
          columns from these dates.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={submit} className="space-y-6">
        <Fieldset legend="Where and when">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="City">
              <TextInput
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Kyoto"
                autoFocus
                required
              />
            </Field>
            <Field label="In Japanese">
              <TextInput
                value={form.name_ja}
                onChange={(e) => set("name_ja", e.target.value)}
                placeholder="京都"
                className="font-jp"
              />
            </Field>
            <Field label="First day">
              <TextInput
                type="date"
                value={form.starts_on}
                onChange={(e) => set("starts_on", e.target.value)}
                required
              />
            </Field>
            <Field label="Last day" hint="Inclusive.">
              <TextInput
                type="date"
                value={form.ends_on}
                onChange={(e) => set("ends_on", e.target.value)}
                required
              />
            </Field>
          </div>
        </Fieldset>

        <Fieldset legend="Where you're sleeping">
          <Field label="Place">
            <TextInput
              value={form.lodging_name}
              onChange={(e) => set("lodging_name", e.target.value)}
              placeholder="Ryokan Yachiyo"
            />
          </Field>
          <Field label="Address">
            <TextInput
              value={form.lodging_address}
              onChange={(e) => set("lodging_address", e.target.value)}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Check in">
              <TextInput
                value={form.lodging_check_in}
                onChange={(e) => set("lodging_check_in", e.target.value)}
                placeholder="15:00"
              />
            </Field>
            <Field label="Check out">
              <TextInput
                value={form.lodging_check_out}
                onChange={(e) => set("lodging_check_out", e.target.value)}
                placeholder="11:00"
              />
            </Field>
            <Field label="Confirmation number">
              <TextInput
                value={form.lodging_confirmation}
                onChange={(e) => set("lodging_confirmation", e.target.value)}
              />
            </Field>
            <Field label="Booking link">
              <TextInput
                type="url"
                value={form.lodging_url}
                onChange={(e) => set("lodging_url", e.target.value)}
                placeholder="https://"
              />
            </Field>
          </div>
        </Fieldset>

        <Field label="Note">
          <TextArea
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="Bags forwarded ahead from Tokyo — they arrive the afternoon of the 8th."
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

        <DialogFooter className="gap-2 sm:justify-between">
          {leg ? (
            <Button
              type="button"
              variant="ghost"
              onClick={remove}
              disabled={pending}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              title="Cards on these days go back to the maybe pile."
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              Delete leg
            </Button>
          ) : (
            <span />
          )}
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
              {pending ? "Saving…" : leg ? "Save changes" : "Add leg"}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </>
  );
}
