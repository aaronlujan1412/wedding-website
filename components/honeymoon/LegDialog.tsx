"use client";

import { useState, useTransition } from "react";
import { ArrowUp, Trash2 } from "lucide-react";
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
import { Field, Fieldset, SelectField, TextArea, TextInput } from "./FormParts";
import { LANES, LANE_ORDER } from "./trip";
import type { Lane, TripLeg } from "./types";

/** A leg being edited, or a new one — optionally pre-filled from a gap. */
export type LegDraft = {
  leg: TripLeg | null;
  lane: Lane;
  from?: string;
  to?: string;
};

type FormState = {
  lane: Lane;
  name: string;
  name_ja: string;
  starts_on: string;
  ends_on: string;
  lodging_name: string;
  lodging_address: string;
  lodging_url: string;
  lodging_confirmation: string;
  lodging_check_in: string;
  lodging_check_out: string;
  note: string;
};

function toForm({ leg, lane, from, to }: LegDraft): FormState {
  return {
    lane: leg?.lane ?? lane,
    name: leg?.name ?? "",
    name_ja: leg?.name_ja ?? "",
    starts_on: leg?.starts_on ?? from ?? "",
    ends_on: leg?.ends_on ?? to ?? "",
    lodging_name: leg?.lodging_name ?? "",
    lodging_address: leg?.lodging_address ?? "",
    lodging_url: leg?.lodging_url ?? "",
    lodging_confirmation: leg?.lodging_confirmation ?? "",
    lodging_check_in: leg?.lodging_check_in ?? "",
    lodging_check_out: leg?.lodging_check_out ?? "",
    note: leg?.note ?? "",
  };
}

/**
 * A leg owns a stretch of dates and the bed you sleep in across them, within
 * one lane. Lodging belongs here rather than on a card, because you don't drag
 * where you sleep — it's a property of the days, not an item in them.
 */
export function LegDialog({
  draft,
  onClose,
  onAdopt,
}: {
  draft: LegDraft | null;
  onClose: () => void;
  onAdopt: (leg: TripLeg) => void;
}) {
  return (
    <Dialog open={draft !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto bg-card sm:max-w-lg">
        {/* Keyed on the leg, so editing a different one remounts the form. */}
        {draft && (
          <LegForm
            key={draft.leg?.id ?? `new-${draft.lane}-${draft.from ?? ""}`}
            draft={draft}
            onClose={onClose}
            onAdopt={onAdopt}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function LegForm({
  draft,
  onClose,
  onAdopt,
}: {
  draft: LegDraft;
  onClose: () => void;
  onAdopt: (leg: TripLeg) => void;
}) {
  const { leg } = draft;
  const [form, setForm] = useState(() => toForm(draft));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
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

  const meta = LANES[form.lane];

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-garamond text-2xl">
          {leg ? `Edit ${leg.name}` : "Add a leg"}
        </DialogTitle>
        <DialogDescription className="font-garamond text-base">
          A place and the run of nights you&apos;re there, in{" "}
          <span style={{ color: meta.accent }}>{meta.label}</span>. Legs in one
          lane can&apos;t overlap; legs in different lanes are how you disagree.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={submit} className="space-y-6">
        <Fieldset legend="Where and when">
          <Field
            label="Lane"
            hint="Only Decided reaches the itinerary and the pocket print."
          >
            <SelectField
              value={form.lane}
              onChange={(v) => set("lane", v)}
              options={LANE_ORDER.map((l) => ({
                value: l,
                label: LANES[l].label,
              }))}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Place"
              hint="A city, or a neighbourhood you're basing out of."
            >
              <TextInput
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                autoFocus
                required
              />
            </Field>
            <Field label="In Japanese">
              <TextInput
                value={form.name_ja}
                onChange={(e) => set("name_ja", e.target.value)}
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
              />
            </Field>
            <Field label="Check out">
              <TextInput
                value={form.lodging_check_out}
                onChange={(e) => set("lodging_check_out", e.target.value)}
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
          <div className="flex gap-2">
            {leg && (
              <Button
                type="button"
                variant="ghost"
                onClick={remove}
                disabled={pending}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                title="Cards on dates no other lane covers go back to their piles."
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                Delete
              </Button>
            )}
            {leg && leg.lane !== "decided" && (
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  onClose();
                  onAdopt(leg);
                }}
                className="text-primary"
              >
                <ArrowUp className="h-4 w-4" strokeWidth={1.5} />
                Use in Decided
              </Button>
            )}
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
              {pending ? "Saving…" : leg ? "Save changes" : "Add leg"}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </>
  );
}
