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
import { deleteStay, saveStay, type StayInput } from "@/app/actions/stays";
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
import {
  USUAL_CHECK_IN,
  USUAL_CHECK_OUT,
  formatNights,
  type MealKind,
} from "./stays";
import {
  BOOKING_STATUSES,
  LANES,
  LANE_ORDER,
  costToInput,
  daysBetween,
  parseCostInput,
} from "./trip";
import type {
  BookingStatus,
  Currency,
  Lane,
  StayPayment,
  TripStay,
} from "./types";

/** A stay being edited, or a new one — optionally for a lane and some nights. */
export type StayDraft = {
  stay: TripStay | null;
  lane: Lane;
  from?: string;
  to?: string;
};

type FormState = {
  lane: Lane;
  name: string;
  name_ja: string;
  city: string;
  check_in_on: string;
  check_out_on: string;
  check_in_time: string;
  check_out_time: string;
  booking_status: BookingStatus;
  payment: StayPayment | "unknown";
  cancel_by: string;
  confirmation: string;
  url: string;
  cost_input: string;
  cost_currency: Currency;
  desk_cash_input: string;
  address_ja: string;
  address: string;
  phone: string;
  map_url: string;
  getting_there: string;
  has_breakfast: boolean;
  breakfast_from: string;
  breakfast_to: string;
  breakfast_note: string;
  has_dinner: boolean;
  dinner_from: string;
  dinner_to: string;
  dinner_note: string;
  onsen_hours: string;
  tattoos: "unknown" | "yes" | "no";
  forward_bags: boolean;
  notes: string;
};

type Setter = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

/** A hotel is never "ticket in hand", so stays stop at booked. */
const STAY_STATUSES: BookingStatus[] = ["idea", "to_book", "booked"];

const PAYMENTS: { value: FormState["payment"]; label: string }[] = [
  { value: "unknown", label: "Not sure yet" },
  { value: "prepaid", label: "Paid ahead" },
  { value: "at_desk", label: "Pay at the desk" },
];

const TATTOOS: { value: FormState["tattoos"]; label: string }[] = [
  { value: "unknown", label: "Don't know" },
  { value: "yes", label: "Allowed" },
  { value: "no", label: "Not allowed" },
];

const hhmm = (time: string | null | undefined) => time?.slice(0, 5) ?? "";

function toForm({ stay, lane, from, to }: StayDraft): FormState {
  return {
    lane: stay?.lane ?? lane,
    name: stay?.name ?? "",
    name_ja: stay?.name_ja ?? "",
    city: stay?.city ?? "",
    check_in_on: stay?.check_in_on ?? from ?? "",
    check_out_on: stay?.check_out_on ?? to ?? "",
    check_in_time: hhmm(stay?.check_in_time),
    check_out_time: hhmm(stay?.check_out_time),
    booking_status: stay?.booking_status ?? "idea",
    payment: stay?.payment ?? "unknown",
    cancel_by: stay?.cancel_by ?? "",
    confirmation: stay?.confirmation ?? "",
    url: stay?.url ?? "",
    cost_input: costToInput(
      stay?.cost_amount ?? null,
      stay?.cost_currency ?? "JPY",
    ),
    cost_currency: stay?.cost_currency ?? "JPY",
    desk_cash_input: stay?.desk_cash_yen ? String(stay.desk_cash_yen) : "",
    address_ja: stay?.address_ja ?? "",
    address: stay?.address ?? "",
    phone: stay?.phone ?? "",
    map_url: stay?.map_url ?? "",
    getting_there: stay?.getting_there ?? "",
    has_breakfast: stay?.has_breakfast ?? false,
    breakfast_from: hhmm(stay?.breakfast_from),
    breakfast_to: hhmm(stay?.breakfast_to),
    breakfast_note: stay?.breakfast_note ?? "",
    has_dinner: stay?.has_dinner ?? false,
    dinner_from: hhmm(stay?.dinner_from),
    dinner_to: hhmm(stay?.dinner_to),
    dinner_note: stay?.dinner_note ?? "",
    onsen_hours: stay?.onsen_hours ?? "",
    tattoos:
      stay?.tattoos_ok === true
        ? "yes"
        : stay?.tattoos_ok === false
          ? "no"
          : "unknown",
    forward_bags: stay?.forward_bags ?? false,
    notes: stay?.notes ?? "",
  };
}

function toInput(form: FormState, stay: TripStay | null): StayInput {
  const { cost_input, desk_cash_input, tattoos, payment, ...rest } = form;
  return {
    ...rest,
    // A suggestion is the idea of whoever's lane it's in. A stay made straight
    // into Decided keeps whoever it came from, if it came from someone.
    added_by: LANES[form.lane].planner ?? stay?.added_by ?? "aaron",
    payment: payment === "unknown" ? null : payment,
    tattoos_ok: tattoos === "unknown" ? null : tattoos === "yes",
    cost_amount: parseCostInput(cost_input, form.cost_currency),
    desk_cash_yen: parseCostInput(desk_cash_input, "JPY"),
  };
}

export function StayDialog({
  draft,
  onClose,
  onAdopt,
}: {
  draft: StayDraft | null;
  onClose: () => void;
  onAdopt: (stay: TripStay) => void;
}) {
  return (
    <Dialog open={draft !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className={cn(SHEET, "sm:max-h-[85vh] sm:max-w-xl")}>
        {/* Keyed on the stay, so opening a different one remounts the form. */}
        {draft && (
          <StayForm
            key={draft.stay?.id ?? `new-${draft.lane}-${draft.from ?? ""}`}
            draft={draft}
            onClose={onClose}
            onAdopt={onAdopt}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function StayForm({
  draft,
  onClose,
  onAdopt,
}: {
  draft: StayDraft;
  onClose: () => void;
  onAdopt: (stay: TripStay) => void;
}) {
  const { stay } = draft;
  const [form, setForm] = useState(() => toForm(draft));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const nights =
    form.check_in_on && form.check_out_on
      ? daysBetween(form.check_in_on, form.check_out_on)
      : 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveStay(stay?.id ?? null, toInput(form, stay));
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  function remove() {
    if (!stay) return;
    startTransition(async () => {
      const result = await deleteStay(stay.id);
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-garamond text-2xl">
          {stay ? `Edit ${stay.name}` : "Add a stay"}
        </DialogTitle>
        <DialogDescription className="font-garamond text-base">
          Decided is where you&apos;re actually sleeping. Your own lane is for
          places you&apos;re considering — put a few side by side for the same
          nights and pick one.
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
                  "flex-1 rounded-md border px-2 py-2 font-raleway text-xs transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  on
                    ? "font-semibold"
                    : "border-border text-muted-foreground hover:border-primary/50",
                )}
              >
                {meta.label}
              </button>
            );
          })}
        </div>

        <Fieldset legend="The place">
          <Field label="Name">
            <TextInput
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              autoFocus
              required
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name in Japanese">
              <TextInput
                value={form.name_ja}
                onChange={(e) => set("name_ja", e.target.value)}
                className="font-jp"
              />
            </Field>
            <Field label="City">
              <TextInput
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              />
            </Field>
          </div>
        </Fieldset>

        <Fieldset legend="Nights">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Check in">
              <TextInput
                type="date"
                value={form.check_in_on}
                onChange={(e) => set("check_in_on", e.target.value)}
                required
              />
            </Field>
            <Field
              label="Check out"
              hint={nights > 0 ? formatNights(nights) : undefined}
            >
              <TextInput
                type="date"
                value={form.check_out_on}
                min={form.check_in_on || undefined}
                onChange={(e) => set("check_out_on", e.target.value)}
                required
              />
            </Field>
            <Field
              label="Check-in time"
              hint={`Leave empty if it's the usual ${USUAL_CHECK_IN}.`}
            >
              <TextInput
                type="time"
                value={form.check_in_time}
                onChange={(e) => set("check_in_time", e.target.value)}
              />
            </Field>
            <Field
              label="Check-out time"
              hint={`Leave empty if it's the usual ${USUAL_CHECK_OUT}.`}
            >
              <TextInput
                type="time"
                value={form.check_out_time}
                onChange={(e) => set("check_out_time", e.target.value)}
              />
            </Field>
          </div>
        </Fieldset>

        <Fieldset legend="Booking">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Status">
              <SelectField
                value={form.booking_status}
                onChange={(v) => set("booking_status", v)}
                options={STAY_STATUSES.map((s) => ({
                  value: s,
                  label: BOOKING_STATUSES[s].label,
                }))}
              />
            </Field>
            <Field label="Paying">
              <SelectField
                value={form.payment}
                onChange={(v) => set("payment", v)}
                options={PAYMENTS}
              />
            </Field>
            <Field label="Total for the stay" group>
              <CostField
                value={form.cost_input}
                currency={form.cost_currency}
                onValueChange={(v) => set("cost_input", v)}
                onCurrencyChange={(c) => set("cost_currency", c)}
              />
            </Field>
            <Field
              label="Cash at the desk, in yen"
              hint="Lodging or onsen tax charged on top, if the booking mentions one."
            >
              <TextInput
                inputMode="numeric"
                value={form.desk_cash_input}
                onChange={(e) => set("desk_cash_input", e.target.value)}
                className="font-mono"
              />
            </Field>
            <Field
              label="Free cancellation until"
              hint="You'll get a warning a week before it runs out."
            >
              <TextInput
                type="date"
                value={form.cancel_by}
                onChange={(e) => set("cancel_by", e.target.value)}
              />
            </Field>
            <Field label="Confirmation number">
              <TextInput
                value={form.confirmation}
                onChange={(e) => set("confirmation", e.target.value)}
                className="font-mono"
              />
            </Field>
          </div>
          <Field label="Booking link">
            <TextInput
              type="url"
              value={form.url}
              onChange={(e) => set("url", e.target.value)}
              placeholder="https://"
            />
          </Field>
        </Fieldset>

        <Fieldset legend="Finding it">
          <Field
            label="Address in Japanese"
            hint="Copy it from the booking or the Japanese Google Maps page. It's what you show a taxi driver."
          >
            <TextInput
              value={form.address_ja}
              onChange={(e) => set("address_ja", e.target.value)}
              className="font-jp"
            />
          </Field>
          <Field label="Address">
            <TextInput
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Phone"
              hint="Taxi navigation can find a place by its number."
            >
              <TextInput
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className="font-mono"
              />
            </Field>
            <Field label="Map link">
              <TextInput
                type="url"
                value={form.map_url}
                onChange={(e) => set("map_url", e.target.value)}
                placeholder="https://"
              />
            </Field>
          </div>
          <Field label="Getting there" hint="Nearest station, and which exit.">
            <TextInput
              value={form.getting_there}
              onChange={(e) => set("getting_there", e.target.value)}
            />
          </Field>
        </Fieldset>

        <Fieldset legend="Meals">
          <Meal
            meal="breakfast"
            label="Breakfast is included"
            noteHint="A Japanese set in the dining room, a buffet, a tray in the room."
            form={form}
            set={set}
          />
          <Meal
            meal="dinner"
            label="Dinner is included"
            hint="Ryokan serve dinner at a set time and wait for you."
            noteHint="Kaiseki in the room, shabu-shabu downstairs."
            form={form}
            set={set}
          />
        </Fieldset>

        <Fieldset legend="Onsen">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Onsen hours">
              <TextInput
                value={form.onsen_hours}
                onChange={(e) => set("onsen_hours", e.target.value)}
              />
            </Field>
            <Field label="Tattoos in the onsen">
              <SelectField
                value={form.tattoos}
                onChange={(v) => set("tattoos", v)}
                options={TATTOOS}
              />
            </Field>
          </div>
        </Fieldset>

        <Fieldset legend="Bags">
          <Toggle
            checked={form.forward_bags}
            onChange={(v) => set("forward_bags", v)}
            label="Send the bags ahead to the next stay"
            hint="Luggage forwarding from the front desk. It arrives the next day, so you carry an overnight bag."
          />
        </Fieldset>

        <Field label="Notes">
          <TextArea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
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

        <DialogFooter className={cn(SHEET_FOOTER, "sm:justify-between")}>
          <div className="flex gap-2">
            {stay && (
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
            {stay && stay.lane !== "decided" && (
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  onClose();
                  onAdopt(stay);
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
              {pending ? "Saving…" : stay ? "Save changes" : "Add stay"}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </>
  );
}

/**
 * A meal the stay either includes or doesn't. The tick is the fact worth
 * knowing first — a ryokan where dinner is part of the room is a different
 * evening — and the window and the description only make sense once it's on,
 * so they aren't on screen until it is.
 */
function Meal({
  meal,
  label,
  hint,
  noteHint,
  form,
  set,
}: {
  meal: MealKind;
  label: string;
  hint?: string;
  noteHint: string;
  form: FormState;
  set: Setter;
}) {
  const on = form[`has_${meal}`];

  return (
    <div className="space-y-3">
      <Toggle
        checked={on}
        onChange={(next) => set(`has_${meal}`, next)}
        label={label}
        hint={hint}
      />
      {on && (
        <div className="grid gap-3 border-l border-border pl-4 sm:grid-cols-2">
          <Field label="Served from">
            <TextInput
              type="time"
              value={form[`${meal}_from`]}
              onChange={(e) => set(`${meal}_from`, e.target.value)}
            />
          </Field>
          {/* The end is the half that bites — it's what makes you leave the
              room — so it's a field of its own rather than a note on the start. */}
          <Field label="Until">
            <TextInput
              type="time"
              value={form[`${meal}_to`]}
              onChange={(e) => set(`${meal}_to`, e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="What it is" hint={noteHint}>
              <TextInput
                value={form[`${meal}_note`]}
                onChange={(e) => set(`${meal}_note`, e.target.value)}
              />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}
