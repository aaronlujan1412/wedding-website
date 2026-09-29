"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { buildList, schedulePlan, type MealState } from "@/app/actions/meals";

const EMPTY: MealState = { error: null, note: null };

const BUTTON =
  "bevel-out bg-me-bar px-3 py-1.5 font-dot text-[13px] leading-none text-me-ink hover:bg-me-edge-hi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold active:bevel-in disabled:opacity-60";

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={BUTTON}>
      {pending ? "working…" : children}
    </button>
  );
}

/**
 * The two things you do to a month, in the order you do them.
 *
 * Placing dinners and building the list are separate buttons rather than one,
 * because they answer to different people: the schedule is a suggestion you
 * will overrule, and the list is arithmetic you will not. Running them together
 * would hide the moment where you are meant to look at the calendar.
 */
export function PlanControls({ planId }: { planId: string }) {
  const [scheduleState, schedule] = useActionState(schedulePlan, EMPTY);
  const [listState, build] = useActionState(buildList, EMPTY);

  const message = scheduleState.note ?? listState.note;
  const error = scheduleState.error ?? listState.error;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-2">
        <form action={schedule}>
          <input type="hidden" name="plan_id" value={planId} />
          <Submit>place the dinners</Submit>
        </form>
        <form action={build}>
          <input type="hidden" name="plan_id" value={planId} />
          <Submit>build the shopping list</Submit>
        </form>
      </div>

      <p aria-live="polite" className="min-h-[1.1rem] text-[12px] leading-relaxed">
        {error ? (
          <span className="text-me-live">{error}</span>
        ) : message ? (
          <span className="text-me-dim">{message}</span>
        ) : null}
      </p>
    </div>
  );
}
