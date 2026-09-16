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
import {
  deleteTransit,
  saveTransit,
  type TransitInput,
} from "@/app/actions/transit";
import { cn } from "@/lib/utils";
import { CostField } from "./CostField";
import {
  SHEET,
  SHEET_FOOTER,
  Field,
  Fieldset,
  SelectField,
  TextArea,
  TextInput,
  Toggle,
} from "./FormParts";
import { utcToZoned } from "./flights";
import { MODES, TRANSIT_TZ } from "./transit";
import {
  LANES,
  LANE_ORDER,
  PLANNERS,
  costToInput,
  formatDuration,
  parseCostInput,
} from "./trip";
import type {
  Currency,
  Lane,
  Planner,
  TransitMode,
  TripTransit,
} from "./types";

/** A ride being edited, or a new one — optionally for a lane and a day. */
export type TransitDraft = {
  ride: TripTransit | null;
  lane: Lane;
  onDate?: string;
};

type FormState = {
  lane: Lane;
  added_by: Planner;
  mode: TransitMode;
  operator: string;
  service: string;

  from_place: string;
  from_place_ja: string;
  departs_on: string;
  departs_time: string;
  departs_platform: string;

  to_place: string;
  to_place_ja: string;
  arrives_on: string;
  arrives_time: string;
  arrives_platform: string;

  reserved: boolean;
  car: string;
  seat_aaron: string;
  seat_savea: string;

  covered_by_pass: boolean;
  confirmation: string;
  booking_url: string;
  cost_input: string;
  cost_currency: Currency;
  notes: string;
};

function toForm({ ride, lane, onDate }: TransitDraft): FormState {
  // Stored as instants; shown and edited in Japan's clock, which is the one
  // printed on the ticket.
  const leaves = ride ? utcToZoned(ride.departs_at, TRANSIT_TZ) : null;
  const lands = ride ? utcToZoned(ride.arrives_at, TRANSIT_TZ) : null;

  return {
    lane: ride?.lane ?? lane,
    added_by: ride?.added_by ?? LANES[lane].planner ?? "aaron",
    mode: ride?.mode ?? "train",
    operator: ride?.operator ?? "",
    service: ride?.service ?? "",

    from_place: ride?.from_place ?? "",
    from_place_ja: ride?.from_place_ja ?? "",
    departs_on: leaves?.date ?? onDate ?? "",
    departs_time: leaves?.time ?? "",
    departs_platform: ride?.departs_platform ?? "",

    to_place: ride?.to_place ?? "",
    to_place_ja: ride?.to_place_ja ?? "",
    arrives_on: lands?.date ?? onDate ?? "",
    arrives_time: lands?.time ?? "",
    arrives_platform: ride?.arrives_platform ?? "",

    reserved: ride?.reserved ?? false,
    car: ride?.car ?? "",
    seat_aaron: ride?.seat_aaron ?? "",
    seat_savea: ride?.seat_savea ?? "",

    covered_by_pass: ride?.covered_by_pass ?? false,
    confirmation: ride?.confirmation ?? "",
    booking_url: ride?.booking_url ?? "",
    cost_input: costToInput(
      ride?.cost_amount ?? null,
      ride?.cost_currency ?? "JPY",
    ),
    cost_currency: ride?.cost_currency ?? "JPY",
    notes: ride?.notes ?? "",
  };
}

function toInput({ cost_input, ...form }: FormState): TransitInput {
  return {
    ...form,
    cost_amount: parseCostInput(cost_input, form.cost_currency),
  };
}

export function TransitDialog({
  draft,
  onClose,
  onAdopt,
}: {
  draft: TransitDraft | null;
  onClose: () => void;
  onAdopt: (ride: TripTransit) => void;
}) {
  return (
    <Dialog open={draft !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className={cn(SHEET, "sm:max-h-[85vh] sm:max-w-xl")}>
        {/* Keyed on the ride, so opening a different one remounts the form
            rather than reseeding state out of an effect. */}
        {draft && (
          <TransitForm
            key={draft.ride?.id ?? `new-${draft.lane}-${draft.onDate ?? ""}`}
            draft={draft}
            onClose={onClose}
            onAdopt={onAdopt}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TransitForm({
  draft,
  onClose,
  onAdopt,
}: {
  draft: TransitDraft;
  onClose: () => void;
  onAdopt: (ride: TripTransit) => void;
}) {
  const { ride } = draft;
  const [form, setForm] = useState(() => toForm(draft));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const mode = MODES[form.mode];

  // Shown live so a mistyped arrival time is obvious before saving rather
  // than after: a four-hour ride to Kyoto reads right, a twenty-hour one
  // doesn't.
  const minutes =
    form.departs_on && form.departs_time && form.arrives_on && form.arrives_time
      ? (new Date(`${form.arrives_on}T${form.arrives_time}`).getTime() -
          new Date(`${form.departs_on}T${form.departs_time}`).getTime()) /
        60_000
      : null;
  const overnight =
    form.departs_on && form.arrives_on && form.departs_on !== form.arrives_on;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveTransit(ride?.id ?? null, toInput(form));
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  function remove() {
    if (!ride) return;
    startTransition(async () => {
      const result = await deleteTransit(ride.id);
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-garamond text-2xl">
          {ride ? `Edit ${ride.from_place} → ${ride.to_place}` : "Add a ride"}
        </DialogTitle>
        <DialogDescription className="font-garamond text-base">
          Times are Japan&apos;s, exactly as the ticket prints them. Decided is
          what you&apos;re actually taking; your own lane is for working out
          whether the night bus is worth it.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={submit} className="space-y-6">
        <div role="radiogroup" aria-label="Lane" className="flex gap-1.5">
          {LANE_ORDER.map((lane) => {
            const meta = LANES[lane];
            const on = form.lane === lane;
            return (
              <button
                key={lane}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => set("lane", lane)}
                style={
                  on
                    ? {
                        borderColor: meta.accent,
                        backgroundColor: meta.tint,
                        color: meta.accent,
                      }
                    : undefined
                }
                className={cn(
                  "flex-1 rounded-md border px-3 py-2 font-raleway text-xs transition-colors",
                  !on &&
                    "border-border text-muted-foreground hover:border-primary/50",
                )}
              >
                {meta.label}
              </button>
            );
          })}
        </div>

        <Fieldset legend="What it is">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kind">
              <SelectField
                value={form.mode}
                onChange={(v) => set("mode", v)}
                options={(Object.keys(MODES) as TransitMode[]).map((m) => ({
                  value: m,
                  label: MODES[m].label,
                }))}
              />
            </Field>
            <Field label="Whose idea">
              <SelectField
                value={form.added_by}
                onChange={(v) => set("added_by", v)}
                options={(Object.keys(PLANNERS) as Planner[]).map((p) => ({
                  value: p,
                  label: PLANNERS[p].label,
                }))}
              />
            </Field>
            <Field
              label="Service"
              hint="What the departure board calls it — Hikari 507, Azusa 15."
            >
              <TextInput
                value={form.service}
                onChange={(e) => set("service", e.target.value)}
              />
            </Field>
            <Field label="Operator">
              <TextInput
                value={form.operator}
                onChange={(e) => set("operator", e.target.value)}
              />
            </Field>
          </div>
        </Fieldset>

        <Fieldset legend="Leaving">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="From">
              <TextInput
                value={form.from_place}
                onChange={(e) => set("from_place", e.target.value)}
                autoFocus
              />
            </Field>
            <Field label="In Japanese">
              <TextInput
                value={form.from_place_ja}
                onChange={(e) => set("from_place_ja", e.target.value)}
                className="font-jp"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Date">
              <TextInput
                type="date"
                value={form.departs_on}
                onChange={(e) => set("departs_on", e.target.value)}
              />
            </Field>
            <Field label="Time">
              <TextInput
                type="time"
                value={form.departs_time}
                onChange={(e) => set("departs_time", e.target.value)}
              />
            </Field>
            <Field label="Platform">
              <TextInput
                value={form.departs_platform}
                onChange={(e) => set("departs_platform", e.target.value)}
              />
            </Field>
          </div>
        </Fieldset>

        <Fieldset legend="Arriving">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="To">
              <TextInput
                value={form.to_place}
                onChange={(e) => set("to_place", e.target.value)}
              />
            </Field>
            <Field label="In Japanese">
              <TextInput
                value={form.to_place_ja}
                onChange={(e) => set("to_place_ja", e.target.value)}
                className="font-jp"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field
              label="Date"
              hint={overnight ? "Overnight — arrives the next day." : undefined}
            >
              <TextInput
                type="date"
                value={form.arrives_on}
                onChange={(e) => set("arrives_on", e.target.value)}
              />
            </Field>
            <Field label="Time">
              <TextInput
                type="time"
                value={form.arrives_time}
                onChange={(e) => set("arrives_time", e.target.value)}
              />
            </Field>
            <Field label="Platform">
              <TextInput
                value={form.arrives_platform}
                onChange={(e) => set("arrives_platform", e.target.value)}
              />
            </Field>
          </div>
          {minutes !== null && minutes > 0 && (
            <p className="font-mono text-xs text-muted-foreground tabular-nums slashed-zero">
              {formatDuration(minutes)} {mode.verb.toLowerCase()}
            </p>
          )}
        </Fieldset>

        <Fieldset legend="Seats">
          <Toggle
            checked={form.reserved}
            onChange={(v) => set("reserved", v)}
            label="Seats reserved"
            hint="Reserved cars over New Year sell out weeks ahead. Unreserved on the 30th means standing with the bags."
          />
          {form.reserved && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Car">
                <TextInput
                  value={form.car}
                  onChange={(e) => set("car", e.target.value)}
                />
              </Field>
              <Field label="Aaron">
                <TextInput
                  value={form.seat_aaron}
                  onChange={(e) => set("seat_aaron", e.target.value)}
                />
              </Field>
              <Field label="Savea">
                <TextInput
                  value={form.seat_savea}
                  onChange={(e) => set("seat_savea", e.target.value)}
                />
              </Field>
            </div>
          )}
        </Fieldset>

        <Fieldset legend="Paying">
          <Toggle
            checked={form.covered_by_pass}
            onChange={(v) => set("covered_by_pass", v)}
            label="The rail pass covers it"
            hint="Reserved at a ticket window with the pass, so it costs nothing on the day and stays out of the trip total."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {!form.covered_by_pass && (
              <Field label="Cost" group>
                <CostField
                  value={form.cost_input}
                  currency={form.cost_currency}
                  onValueChange={(v) => set("cost_input", v)}
                  onCurrencyChange={(c) => set("cost_currency", c)}
                />
              </Field>
            )}
            <Field label="Confirmation number">
              <TextInput
                value={form.confirmation}
                onChange={(e) => set("confirmation", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Booking link">
            <TextInput
              type="url"
              value={form.booking_url}
              onChange={(e) => set("booking_url", e.target.value)}
              placeholder="https://"
            />
          </Field>
        </Fieldset>

        <Fieldset legend="Notes">
          <Field label="Notes">
            <TextArea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
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

        <DialogFooter className={cn(SHEET_FOOTER, "sm:justify-between")}>
          <div className="flex gap-2">
            {ride && (
              <Button
                type="button"
                variant="ghost"
                onClick={remove}
                disabled={pending}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                Delete
              </Button>
            )}
            {ride && ride.lane !== "decided" && (
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  onClose();
                  onAdopt(ride);
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
              {pending ? "Saving…" : ride ? "Save changes" : "Add ride"}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </>
  );
}
