"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createPlan, type MealState } from "@/app/actions/meals";

const EMPTY: MealState = { error: null, note: null };

const FIELD =
  "bevel-in bg-me-void px-2.5 py-2 text-[13px] text-me-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bevel-out bg-me-bar px-4 py-2 font-dot text-[14px] leading-none text-me-ink hover:bg-me-edge-hi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold active:bevel-in disabled:opacity-60"
    >
      {pending ? "creating…" : "start this month"}
    </button>
  );
}

/**
 * The month a new plan most likely covers: from the day after the last plan
 * ends to the end of that month. Next calendar month when there is no plan.
 *
 * It used to always be next calendar month, which was right in October and
 * wrong the first time anybody planned two months ahead.
 *
 * UTC throughout: these are calendar dates, and local-midnight arithmetic
 * slips a day across a daylight-saving change.
 */
function suggestedRange(after: string | null) {
  const now = new Date();
  const start = after
    ? new Date(Date.UTC(+after.slice(0, 4), +after.slice(5, 7) - 1, +after.slice(8, 10) + 1))
    : new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  return {
    name: start.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
    starts_on: iso(start),
    ends_on: iso(end),
  };
}

export function NewPlanForm({ after }: { after: string | null }) {
  const [state, create] = useActionState(createPlan, EMPTY);
  const range = suggestedRange(after);

  return (
    <form action={create} className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-dot text-[11px] text-me-dim">month</span>
          <input
            name="name"
            defaultValue={range.name}
            className={FIELD}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-dot text-[11px] text-me-dim">from</span>
          <input type="date" name="starts_on" defaultValue={range.starts_on} className={FIELD} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-dot text-[11px] text-me-dim">to</span>
          <input type="date" name="ends_on" defaultValue={range.ends_on} className={FIELD} />
        </label>
        <Submit />
      </div>

      <p aria-live="polite" className="min-h-[1.1rem] text-[12px]">
        {state.error ? (
          <span className="text-me-live">{state.error}</span>
        ) : state.note ? (
          <span className="text-me-dim">{state.note}</span>
        ) : null}
      </p>

      <p className="text-[12px] leading-relaxed text-me-dim">
        Two deliveries are placed for you — one on the first day, one halfway
        through. They aren&apos;t dinners: they&apos;re what the freshness
        numbers on each day count from.
      </p>
    </form>
  );
}
