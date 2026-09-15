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
import {
  deleteFlight,
  saveFlight,
  type FlightInput,
} from "@/app/actions/flights";
import { cn } from "@/lib/utils";
import { AIRPORTS, airport } from "./airports";
import { CostField } from "./CostField";
import {
  SHEET,
  SHEET_FOOTER,
  Field,
  Fieldset,
  SelectField,
  TextArea,
  TextInput,
} from "./FormParts";
import { formatSpan, utcToZoned, zonedToUtc } from "./flights";
import { costToInput, parseCostInput } from "./trip";
import type { Cabin, Currency, TripFlight } from "./types";

export type FlightDraft = { flight: TripFlight | null };

const OTHER = "__other__";

const CABINS: { value: Cabin | "none"; label: string }[] = [
  { value: "none", label: "Not sure yet" },
  { value: "economy", label: "Economy" },
  { value: "premium", label: "Premium economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
];

type Side = {
  code: string;
  city: string;
  tz: string;
  date: string;
  time: string;
};

type FormState = Omit<
  FlightInput,
  | "from_airport"
  | "from_city"
  | "departs_date"
  | "departs_time"
  | "departs_tz"
  | "to_airport"
  | "to_city"
  | "arrives_date"
  | "arrives_time"
  | "arrives_tz"
  | "cost_amount"
  | "cabin"
> & {
  from: Side;
  to: Side;
  cabin: Cabin | "none";
  cost_input: string;
  cost_currency: Currency;
};

function side(
  code: string,
  city: string | null,
  iso: string | null,
  tz: string,
): Side {
  const local = iso ? utcToZoned(iso, tz) : { date: "", time: "" };
  return { code, city: city ?? airport(code)?.city ?? "", tz, ...local };
}

function toForm(flight: TripFlight | null): FormState {
  return {
    airline: flight?.airline ?? "",
    flight_number: flight?.flight_number ?? "",
    from: flight
      ? side(
          flight.from_airport,
          flight.from_city,
          flight.departs_at,
          flight.departs_tz,
        )
      : side("SLC", null, null, "America/Denver"),
    to: flight
      ? side(
          flight.to_airport,
          flight.to_city,
          flight.arrives_at,
          flight.arrives_tz,
        )
      : side("HND", null, null, "Asia/Tokyo"),
    cabin: flight?.cabin ?? "none",
    aircraft: flight?.aircraft ?? "",
    confirmation: flight?.confirmation ?? "",
    seat_aaron: flight?.seat_aaron ?? "",
    seat_savea: flight?.seat_savea ?? "",
    departure_terminal: flight?.departure_terminal ?? "",
    departure_gate: flight?.departure_gate ?? "",
    arrival_terminal: flight?.arrival_terminal ?? "",
    baggage: flight?.baggage ?? "",
    meal: flight?.meal ?? "",
    checkin_url: flight?.checkin_url ?? "",
    status_url: flight?.status_url ?? "",
    notes: flight?.notes ?? "",
    cost_input: costToInput(
      flight?.cost_amount ?? null,
      flight?.cost_currency ?? "USD",
    ),
    cost_currency: flight?.cost_currency ?? "USD",
  };
}

function toInput({
  from,
  to,
  cabin,
  cost_input,
  ...rest
}: FormState): FlightInput {
  return {
    ...rest,
    from_airport: from.code,
    from_city: from.city,
    departs_date: from.date,
    departs_time: from.time,
    departs_tz: from.tz,
    to_airport: to.code,
    to_city: to.city,
    arrives_date: to.date,
    arrives_time: to.time,
    arrives_tz: to.tz,
    cabin: cabin === "none" ? null : cabin,
    cost_amount: parseCostInput(cost_input, rest.cost_currency),
  };
}

export function FlightDialog({
  draft,
  onClose,
}: {
  draft: FlightDraft | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={draft !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn(SHEET, "sm:max-h-[88vh] sm:max-w-2xl")}>
        {draft && (
          <FlightForm
            key={draft.flight?.id ?? "new"}
            flight={draft.flight}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FlightForm({
  flight,
  onClose,
}: {
  flight: TripFlight | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState(() => toForm(flight));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const preview = previewOf(form);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveFlight(flight?.id ?? null, toInput(form));
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  function remove() {
    if (!flight) return;
    startTransition(async () => {
      const result = await deleteFlight(flight.id);
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-garamond text-2xl">
          {flight ? `${flight.flight_number}` : "Add a flight"}
        </DialogTitle>
        <DialogDescription className="font-garamond text-base">
          Type the times exactly as your confirmation prints them — each in its
          own airport&apos;s local time. The page does the time zones.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={submit} className="space-y-6">
        <Fieldset legend="The flight">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Airline">
              <TextInput
                value={form.airline}
                onChange={(e) => set("airline", e.target.value)}
                autoFocus
                required
              />
            </Field>
            <Field label="Flight number">
              <TextInput
                value={form.flight_number}
                onChange={(e) => set("flight_number", e.target.value)}
                className="font-mono uppercase"
                required
              />
            </Field>
          </div>
        </Fieldset>

        <div className="grid gap-6 sm:grid-cols-2">
          <SideFields
            legend="Leaves"
            value={form.from}
            onChange={(v) => set("from", v)}
          />
          <SideFields
            legend="Lands"
            value={form.to}
            onChange={(v) => set("to", v)}
          />
        </div>

        <p
          aria-live="polite"
          className={cn(
            "rounded-md border px-3 py-2 font-mono text-xs tabular-nums slashed-zero",
            preview.tone === "bad"
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-border bg-background text-muted-foreground",
          )}
        >
          {preview.text}
        </p>

        <Fieldset legend="Booking">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Confirmation code" className="sm:col-span-1">
              <TextInput
                value={form.confirmation ?? ""}
                onChange={(e) => set("confirmation", e.target.value)}
                className="font-mono uppercase"
              />
            </Field>
            <Field label="Aaron's seat">
              <TextInput
                value={form.seat_aaron ?? ""}
                onChange={(e) => set("seat_aaron", e.target.value)}
                className="font-mono uppercase"
              />
            </Field>
            <Field label="Savea's seat">
              <TextInput
                value={form.seat_savea ?? ""}
                onChange={(e) => set("seat_savea", e.target.value)}
                className="font-mono uppercase"
              />
            </Field>
            <Field label="Cabin">
              <SelectField
                value={form.cabin}
                onChange={(v) => set("cabin", v)}
                options={CABINS}
              />
            </Field>
            <Field label="Aircraft">
              <TextInput
                value={form.aircraft ?? ""}
                onChange={(e) => set("aircraft", e.target.value)}
              />
            </Field>
            <Field label="Cost" group>
              <CostField
                value={form.cost_input}
                currency={form.cost_currency}
                onValueChange={(v) => set("cost_input", v)}
                onCurrencyChange={(c) => set("cost_currency", c)}
              />
            </Field>
            <Field label="Bags" className="sm:col-span-2">
              <TextInput
                value={form.baggage ?? ""}
                onChange={(e) => set("baggage", e.target.value)}
              />
            </Field>
            <Field label="Meal">
              <TextInput
                value={form.meal ?? ""}
                onChange={(e) => set("meal", e.target.value)}
              />
            </Field>
          </div>
        </Fieldset>

        <Fieldset legend="On the day">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Leaves from terminal">
              <TextInput
                value={form.departure_terminal ?? ""}
                onChange={(e) => set("departure_terminal", e.target.value)}
              />
            </Field>
            <Field label="Gate" hint="Usually only known on the day.">
              <TextInput
                value={form.departure_gate ?? ""}
                onChange={(e) => set("departure_gate", e.target.value)}
              />
            </Field>
            <Field label="Lands at terminal">
              <TextInput
                value={form.arrival_terminal ?? ""}
                onChange={(e) => set("arrival_terminal", e.target.value)}
              />
            </Field>
            <Field label="Check-in link" className="sm:col-span-3">
              <TextInput
                type="url"
                value={form.checkin_url ?? ""}
                onChange={(e) => set("checkin_url", e.target.value)}
                placeholder="https://"
              />
            </Field>
            <Field
              label="Flight status link"
              hint="Leave empty and the page links a status search for the flight number."
              className="sm:col-span-3"
            >
              <TextInput
                type="url"
                value={form.status_url ?? ""}
                onChange={(e) => set("status_url", e.target.value)}
                placeholder="https://"
              />
            </Field>
          </div>
        </Fieldset>

        <Field label="Notes">
          <TextArea
            value={form.notes ?? ""}
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
          {flight ? (
            <Button
              type="button"
              variant="ghost"
              onClick={remove}
              disabled={pending}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              Delete flight
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
            <Button type="submit" disabled={pending || preview.tone === "bad"}>
              {pending ? "Saving…" : flight ? "Save changes" : "Add flight"}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </>
  );
}

/** Live check while typing: the flight's length and day change, or what's wrong. */
function previewOf(form: FormState): {
  tone: "ok" | "bad" | "idle";
  text: string;
} {
  const { from, to } = form;
  if (!from.date || !from.time || !to.date || !to.time) {
    return {
      tone: "idle",
      text: "Add both dates and times to check the flight length.",
    };
  }
  try {
    const dep = zonedToUtc(from.date, from.time, from.tz);
    const arr = zonedToUtc(to.date, to.time, to.tz);
    const minutes = (Date.parse(arr) - Date.parse(dep)) / 60_000;
    if (minutes <= 0) {
      return {
        tone: "bad",
        text: "That lands before it takes off. Flying to Japan usually lands the next day.",
      };
    }
    const days = Math.round(
      (Date.parse(`${to.date}T00:00:00Z`) -
        Date.parse(`${from.date}T00:00:00Z`)) /
        86_400_000,
    );
    const shift =
      days === 0
        ? "lands the same day"
        : `lands ${days > 0 ? "+" : "−"}${Math.abs(days)} day`;
    const long =
      minutes > 20 * 60
        ? " — longer than almost any flight, double-check the dates"
        : "";
    return {
      tone: long ? "bad" : "ok",
      text: `${formatSpan(minutes)} in the air · ${shift}${long}`,
    };
  } catch {
    return { tone: "bad", text: "Pick a time zone for each airport." };
  }
}

const ZONES: string[] =
  typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone")
    : [];

const nativeSelect =
  "h-10 w-full rounded-md border border-input bg-background px-2 font-raleway text-base text-foreground sm:h-9 sm:text-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

function SideFields({
  legend,
  value,
  onChange,
}: {
  legend: string;
  value: Side;
  onChange: (next: Side) => void;
}) {
  const known = airport(value.code);
  const [other, setOther] = useState(!known && value.code !== "");
  const groups: [string, string[]][] = [
    ["Home and the US", ["US", "CA"]],
    ["Japan", ["JP"]],
    ["Connections", ["KR", "TW", "HK", "PH", "GU"]],
  ];

  return (
    <Fieldset legend={legend}>
      <Field label="Airport">
        {/* Native select: groups, long lists and phone keyboards all behave. */}
        <select
          className={nativeSelect}
          value={other ? OTHER : value.code}
          onChange={(e) => {
            if (e.target.value === OTHER) {
              setOther(true);
              onChange({ ...value, code: "", city: "" });
              return;
            }
            const picked = airport(e.target.value)!;
            setOther(false);
            onChange({
              ...value,
              code: picked.code,
              city: picked.city,
              tz: picked.tz,
            });
          }}
        >
          {groups.map(([label, countries]) => (
            <optgroup key={label} label={label}>
              {AIRPORTS.filter((a) => countries.includes(a.country)).map(
                (a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} · {a.city}
                    {a.name !== a.city ? ` (${a.name})` : ""}
                  </option>
                ),
              )}
            </optgroup>
          ))}
          <option value={OTHER}>Another airport…</option>
        </select>
      </Field>

      {other && (
        <div className="grid grid-cols-[5rem_1fr] gap-3">
          <Field label="Code">
            <TextInput
              value={value.code}
              onChange={(e) =>
                onChange({
                  ...value,
                  code: e.target.value.toUpperCase().slice(0, 3),
                })
              }
              className="font-mono uppercase"
            />
          </Field>
          <Field label="City">
            <TextInput
              value={value.city}
              onChange={(e) => onChange({ ...value, city: e.target.value })}
            />
          </Field>
          <Field label="Time zone" className="col-span-2">
            <select
              className={nativeSelect}
              value={value.tz}
              onChange={(e) => onChange({ ...value, tz: e.target.value })}
            >
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <TextInput
            type="date"
            value={value.date}
            onChange={(e) => onChange({ ...value, date: e.target.value })}
            required
          />
        </Field>
        <Field label="Local time">
          <TextInput
            type="time"
            value={value.time}
            onChange={(e) => onChange({ ...value, time: e.target.value })}
            required
          />
        </Field>
      </div>
    </Fieldset>
  );
}
