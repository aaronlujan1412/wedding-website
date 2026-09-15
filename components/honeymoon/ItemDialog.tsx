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
import { createItem, deleteItem, updateItem } from "@/app/actions/honeymoon";
import type { ItemInput } from "@/app/actions/honeymoon";
import {
  Field,
  Fieldset,
  SelectField,
  TextArea,
  TextInput,
  Toggle,
} from "./FormParts";
import {
  BOOKING_STATUSES,
  KINDS,
  LANES,
  LANE_ORDER,
  PLANNERS,
  WEEKDAYS,
  costToInput,
  formatDayLong,
  parseCostInput,
} from "./trip";
import { CostField } from "./CostField";
import type {
  BookingStatus,
  Currency,
  ItemKind,
  Lane,
  Planner,
  TripItem,
} from "./types";

/** A brand-new card, or an existing one being edited. */
export type ItemDraft = {
  item: TripItem | null;
  lane: Lane;
  onDate: string | null;
};

type FormState = {
  title: string;
  lane: Lane;
  title_ja: string;
  kind: ItemKind;
  on_date: string;
  start_time: string;
  duration_min: string;
  pinned: boolean;
  booking_status: BookingStatus;
  booking_url: string;
  booking_opens_on: string;
  booking_ref: string;
  closed_days: number[];
  cost_input: string;
  cost_currency: Currency;
  city: string;
  address: string;
  map_url: string;
  url: string;
  notes: string;
  added_by: Planner;
  must_do: boolean;
};

const POOL_VALUE = "__pool__";

function toForm(draft: ItemDraft): FormState {
  const item = draft.item;
  return {
    title: item?.title ?? "",
    lane: item?.lane ?? draft.lane,
    title_ja: item?.title_ja ?? "",
    kind: item?.kind ?? "sight",
    on_date: item ? (item.on_date ?? "") : (draft.onDate ?? ""),
    // Postgres hands back "09:00:00"; <input type="time"> wants "09:00".
    start_time: item?.start_time?.slice(0, 5) ?? "",
    duration_min: item?.duration_min ? String(item.duration_min) : "",
    pinned: item?.pinned ?? false,
    booking_status: item?.booking_status ?? "idea",
    booking_url: item?.booking_url ?? "",
    booking_opens_on: item?.booking_opens_on ?? "",
    booking_ref: item?.booking_ref ?? "",
    closed_days: item?.closed_days ?? [],
    cost_input: costToInput(
      item?.cost_amount ?? null,
      item?.cost_currency ?? "JPY",
    ),
    cost_currency: item?.cost_currency ?? "JPY",
    city: item?.city ?? "",
    address: item?.address ?? "",
    map_url: item?.map_url ?? "",
    url: item?.url ?? "",
    notes: item?.notes ?? "",
    // A card thrown into someone's own row is theirs by default.
    added_by: item?.added_by ?? LANES[draft.lane].planner ?? "aaron",
    must_do: item?.must_do ?? false,
  };
}

function toInput({ cost_input, ...form }: FormState): ItemInput {
  const duration = Number.parseInt(form.duration_min, 10);
  return {
    ...form,
    on_date: form.on_date || null,
    start_time: form.start_time || null,
    duration_min: Number.isFinite(duration) ? duration : null,
    cost_amount: parseCostInput(cost_input, form.cost_currency),
  };
}

export function ItemDialog({
  draft,
  days,
  onClose,
}: {
  draft: ItemDraft | null;
  days: string[];
  onClose: () => void;
}) {
  return (
    <Dialog open={draft !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto bg-card sm:max-w-xl">
        {/* Keyed on the card being edited, so opening a different one remounts
            the form with fresh state instead of syncing it out of an effect. */}
        {draft && (
          <ItemForm
            key={
              draft.item?.id ?? `new-${draft.lane}-${draft.onDate ?? "pool"}`
            }
            draft={draft}
            days={days}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ItemForm({
  draft,
  days,
  onClose,
}: {
  draft: ItemDraft;
  days: string[];
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => toForm(draft));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const existing = draft.item;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const input = toInput(form);
      const result = existing
        ? await updateItem(existing.id, input)
        : await createItem(input);

      if (result.error) setError(result.error);
      else onClose();
    });
  }

  function remove() {
    if (!existing) return;
    startTransition(async () => {
      const result = await deleteItem(existing.id);
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-garamond text-2xl">
          {existing ? "Edit this" : "Add something"}
        </DialogTitle>
        <DialogDescription className="font-garamond text-base">
          {form.on_date
            ? formatDayLong(form.on_date)
            : "Lands in the maybe pile until you give it a day."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={submit} className="space-y-6">
        <Fieldset legend="What it is">
          <Field label="Name">
            <TextInput
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              autoFocus
              required
            />
          </Field>
          <Field
            label="Name in Japanese"
            hint="Worth filling in — it's what you show a taxi driver."
          >
            <TextInput
              value={form.title_ja}
              onChange={(e) => set("title_ja", e.target.value)}
              className="font-jp"
            />
          </Field>
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
            <Field label="Type">
              <SelectField
                value={form.kind}
                onChange={(v) => set("kind", v)}
                options={(Object.keys(KINDS) as ItemKind[]).map((k) => ({
                  value: k,
                  label: KINDS[k].label,
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
          </div>
        </Fieldset>

        <Fieldset legend="When">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Day" className="sm:col-span-3">
              <SelectField
                value={form.on_date || POOL_VALUE}
                onChange={(v) => set("on_date", v === POOL_VALUE ? "" : v)}
                options={[
                  { value: POOL_VALUE, label: "The maybe pile" },
                  ...days.map((d) => ({ value: d, label: formatDayLong(d) })),
                ]}
              />
            </Field>
            <Field
              label="Start time"
              hint="Leave empty to let it float in the day."
              className="sm:col-span-2"
            >
              <TextInput
                type="time"
                value={form.start_time}
                onChange={(e) => set("start_time", e.target.value)}
              />
            </Field>
            <Field label="Minutes">
              <TextInput
                type="number"
                min={1}
                step={15}
                value={form.duration_min}
                onChange={(e) => set("duration_min", e.target.value)}
              />
            </Field>
          </div>
          <Toggle
            checked={form.pinned}
            onChange={(v) => set("pinned", v)}
            label="Pin it"
            hint="Flights, check-ins, trains you've already paid for. Pinned cards can't be dragged."
          />
        </Fieldset>

        <Fieldset legend="Booking">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Status">
              <SelectField
                value={form.booking_status}
                onChange={(v) => set("booking_status", v)}
                options={(Object.keys(BOOKING_STATUSES) as BookingStatus[]).map(
                  (s) => ({ value: s, label: BOOKING_STATUSES[s].label }),
                )}
              />
            </Field>
            <Field label="Tickets go on sale">
              <TextInput
                type="date"
                value={form.booking_opens_on}
                onChange={(e) => set("booking_opens_on", e.target.value)}
              />
            </Field>
            <Field label="Booking link">
              <TextInput
                type="url"
                value={form.booking_url}
                onChange={(e) => set("booking_url", e.target.value)}
                placeholder="https://"
              />
            </Field>
            <Field label="Confirmation number">
              <TextInput
                value={form.booking_ref}
                onChange={(e) => set("booking_ref", e.target.value)}
              />
            </Field>
          </div>
          <Field
            label="Closed on"
            hint="Half the museums in Japan shut on Mondays. Tick the days and the card goes red if it lands on one."
          >
            <div className="flex flex-wrap gap-1">
              {WEEKDAYS.map((name, index) => {
                const on = form.closed_days.includes(index);
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      set(
                        "closed_days",
                        on
                          ? form.closed_days.filter((d) => d !== index)
                          : [...form.closed_days, index],
                      )
                    }
                    className={
                      on
                        ? "rounded-full border border-kind-food px-2.5 py-0.5 font-raleway text-[0.65rem] text-kind-food"
                        : "rounded-full border border-border px-2.5 py-0.5 font-raleway text-[0.65rem] text-muted-foreground hover:border-primary/50"
                    }
                  >
                    {name.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </Field>
        </Fieldset>

        <Fieldset legend="Where and how much">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="City">
              <TextInput
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
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
          </div>
          <Field label="Address">
            <TextInput
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Map link">
              <TextInput
                type="url"
                value={form.map_url}
                onChange={(e) => set("map_url", e.target.value)}
                placeholder="https://"
              />
            </Field>
            <Field label="Anything else link">
              <TextInput
                type="url"
                value={form.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://"
              />
            </Field>
          </div>
        </Fieldset>

        <Fieldset legend="Notes">
          <Field label="Notes">
            <TextArea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
          <Toggle
            checked={form.must_do}
            onChange={(v) => set("must_do", v)}
            label="This one's non-negotiable"
            hint="Starred, and it survives every round of cutting."
          />
        </Fieldset>

        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 font-raleway text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {existing ? (
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
              {pending ? "Saving…" : existing ? "Save changes" : "Add it"}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </>
  );
}
