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

/** Defaults to the coming calendar month, which is what you almost always want. */
export function NewPlanForm() {
  const [state, create] = useActionState(createPlan, EMPTY);

  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return (
    <form action={create} className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-dot text-[11px] text-me-dim">month</span>
          <input
            name="name"
            defaultValue={first.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            className={FIELD}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-dot text-[11px] text-me-dim">from</span>
          <input type="date" name="starts_on" defaultValue={iso(first)} className={FIELD} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-dot text-[11px] text-me-dim">to</span>
          <input type="date" name="ends_on" defaultValue={iso(last)} className={FIELD} />
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
        through. Change either afterwards and rebuild.
      </p>
    </form>
  );
}
