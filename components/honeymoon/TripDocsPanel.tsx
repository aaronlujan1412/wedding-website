"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteDoc, saveDoc } from "@/app/actions/honeymoon";
import { Field, Fieldset, SelectField, TextArea, TextInput } from "./FormParts";
import { DOC_CATEGORIES, formatYen, yenToUsd } from "./trip";
import type { DocCategory, TripDoc, TripLeg } from "./types";

/**
 * Everything that isn't an itinerary item.
 *
 * Flights, rail passes, the pocket wifi, luggage forwarding — none of it is a
 * thing you drag onto a day, so none of it is a card. Forcing it onto the board
 * is what turns a trip planner into a mess.
 */
export function TripDocsPanel({
  docs,
  legs,
}: {
  docs: TripDoc[];
  legs: TripLeg[];
}) {
  const [editing, setEditing] = useState<TripDoc | null>(null);
  const [open, setOpen] = useState(false);

  const categories = (Object.keys(DOC_CATEGORIES) as DocCategory[]).filter(
    (c) => docs.some((d) => d.category === c) || c === "flight",
  );

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-3">
        <div>
          <p className="font-raleway text-[0.65rem] uppercase tracking-[0.25em] text-primary">
            Not an itinerary item
          </p>
          <h2 className="mt-1 font-garamond text-3xl text-foreground">
            Trip papers
          </h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="flex items-center gap-1 rounded-sm font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Plus className="h-3 w-3" strokeWidth={2} />
          Add
        </button>
      </div>

      {/* Lodging is read off the legs rather than duplicated here — one place
          to change where you're sleeping. */}
      {legs.some((l) => l.lodging_name) && (
        <div className="mt-6">
          <h3 className="font-raleway text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
            Beds
          </h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {legs
              .filter((l) => l.lodging_name)
              .map((leg) => (
                <li
                  key={leg.id}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <p className="font-mono text-[0.6rem] tracking-wider text-muted-foreground tabular-nums slashed-zero">
                    {leg.name.toUpperCase()} · {leg.starts_on} → {leg.ends_on}
                  </p>
                  <p className="mt-1 font-garamond text-xl text-foreground">
                    {leg.lodging_name}
                  </p>
                  {leg.lodging_address && (
                    <p className="mt-1 font-garamond text-sm leading-snug text-muted-foreground">
                      {leg.lodging_address}
                    </p>
                  )}
                  <p className="mt-2 font-mono text-[0.6rem] tracking-wide text-muted-foreground tabular-nums slashed-zero">
                    {leg.lodging_check_in && `in ${leg.lodging_check_in}`}
                    {leg.lodging_check_in && leg.lodging_check_out && " · "}
                    {leg.lodging_check_out && `out ${leg.lodging_check_out}`}
                    {leg.lodging_confirmation &&
                      ` · ${leg.lodging_confirmation}`}
                  </p>
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="mt-8 space-y-8">
        {categories.map((category) => {
          const rows = docs.filter((d) => d.category === category);
          if (rows.length === 0) return null;
          return (
            <div key={category}>
              <h3 className="font-raleway text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
                {DOC_CATEGORIES[category]}
              </h3>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((doc) => (
                  <DocCard
                    key={doc.id}
                    doc={doc}
                    onEdit={() => {
                      setEditing(doc);
                      setOpen(true);
                    }}
                  />
                ))}
              </ul>
            </div>
          );
        })}

        {docs.length === 0 && (
          <p className="rounded-lg border border-dashed border-border px-6 py-10 text-center font-garamond text-lg text-muted-foreground">
            Flight numbers, the rail pass, the pocket wifi, the bags you&apos;re
            shipping ahead. Everything you&apos;ll want at 6am in an airport.
          </p>
        )}
      </div>

      <DocDialog
        open={open}
        doc={editing}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
      />
    </section>
  );
}

function DocCard({ doc, onEdit }: { doc: TripDoc; onEdit: () => void }) {
  return (
    <li className="flex flex-col rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-garamond text-xl leading-tight text-foreground">
          {doc.title}
        </p>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${doc.title}`}
          className="flex h-6 w-6 flex-none items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {doc.detail && (
        <p className="mt-1 font-garamond text-base leading-relaxed text-foreground/90">
          {doc.detail}
        </p>
      )}

      <p className="mt-3 flex flex-wrap gap-x-2.5 gap-y-1 font-mono text-[0.65rem] tracking-wide text-muted-foreground tabular-nums slashed-zero">
        {doc.confirmation && (
          <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-foreground">
            {doc.confirmation}
          </span>
        )}
        {doc.starts_at && <span>{formatStamp(doc.starts_at)}</span>}
        {doc.ends_at && <span>→ {formatStamp(doc.ends_at)}</span>}
        {doc.cost_yen !== null && (
          <span>
            {formatYen(doc.cost_yen)} / {yenToUsd(doc.cost_yen)}
          </span>
        )}
      </p>

      {doc.url && (
        <a
          href={doc.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-primary underline-offset-4 hover:underline"
        >
          Open
          <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
        </a>
      )}
    </li>
  );
}

function formatStamp(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const EMPTY = {
  category: "flight" as DocCategory,
  title: "",
  detail: "",
  confirmation: "",
  url: "",
  starts_at: "",
  ends_at: "",
  cost_yen: "",
};

function toDocForm(doc: TripDoc | null) {
  if (!doc) return EMPTY;
  return {
    category: doc.category,
    title: doc.title,
    detail: doc.detail ?? "",
    confirmation: doc.confirmation ?? "",
    url: doc.url ?? "",
    // <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm".
    starts_at: doc.starts_at?.slice(0, 16) ?? "",
    ends_at: doc.ends_at?.slice(0, 16) ?? "",
    cost_yen: doc.cost_yen !== null ? String(doc.cost_yen) : "",
  };
}

function DocDialog({
  open,
  doc,
  onClose,
}: {
  open: boolean;
  doc: TripDoc | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto bg-card sm:max-w-lg">
        {/* Keyed on the paper, so editing a different one remounts the form. */}
        {open && <DocForm key={doc?.id ?? "new"} doc={doc} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function DocForm({
  doc,
  onClose,
}: {
  doc: TripDoc | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState(() => toDocForm(doc));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const cost = Number.parseInt(form.cost_yen, 10);
      const result = await saveDoc(doc?.id ?? null, {
        ...form,
        cost_yen: Number.isFinite(cost) ? cost : null,
      });
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  function remove() {
    if (!doc) return;
    startTransition(async () => {
      const result = await deleteDoc(doc.id);
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-garamond text-2xl">
          {doc ? "Edit this" : "Add a paper"}
        </DialogTitle>
        <DialogDescription className="font-garamond text-base">
          Confirmation numbers, times, and the link you&apos;ll need to open in
          a hurry.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={submit} className="space-y-6">
        <Fieldset legend="What it is">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kind">
              <SelectField
                value={form.category}
                onChange={(v) => setForm((p) => ({ ...p, category: v }))}
                options={(Object.keys(DOC_CATEGORIES) as DocCategory[]).map(
                  (c) => ({ value: c, label: DOC_CATEGORIES[c] }),
                )}
              />
            </Field>
            <Field label="Cost in yen">
              <TextInput
                type="number"
                min={0}
                step={100}
                value={form.cost_yen}
                onChange={(e) =>
                  setForm((p) => ({ ...p, cost_yen: e.target.value }))
                }
              />
            </Field>
          </div>
          <Field label="Name">
            <TextInput
              value={form.title}
              onChange={(e) =>
                setForm((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="SLC → HND · Delta 167"
              autoFocus
              required
            />
          </Field>
          <Field label="Detail">
            <TextArea
              value={form.detail}
              onChange={(e) =>
                setForm((p) => ({ ...p, detail: e.target.value }))
              }
              placeholder="Seats 22A/22B. Bags checked through."
            />
          </Field>
        </Fieldset>

        <Fieldset legend="Numbers and times">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Starts">
              <TextInput
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) =>
                  setForm((p) => ({ ...p, starts_at: e.target.value }))
                }
              />
            </Field>
            <Field label="Ends">
              <TextInput
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) =>
                  setForm((p) => ({ ...p, ends_at: e.target.value }))
                }
              />
            </Field>
            <Field label="Confirmation number">
              <TextInput
                value={form.confirmation}
                onChange={(e) =>
                  setForm((p) => ({ ...p, confirmation: e.target.value }))
                }
              />
            </Field>
            <Field label="Link">
              <TextInput
                type="url"
                value={form.url}
                onChange={(e) =>
                  setForm((p) => ({ ...p, url: e.target.value }))
                }
                placeholder="https://"
              />
            </Field>
          </div>
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
          {doc ? (
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
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </>
  );
}
