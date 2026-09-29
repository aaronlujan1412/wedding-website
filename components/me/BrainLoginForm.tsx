"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signInToBrain, type BrainSignInState } from "@/app/actions/auth";

const EMPTY: BrainSignInState = { error: null };

const FIELD =
  "bevel-in w-full bg-me-void px-2.5 py-2 text-[13px] text-me-ink placeholder:text-me-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="bevel-out bg-me-bar px-4 py-2 font-dot text-[15px] leading-none text-me-ink hover:bg-me-edge-hi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold active:bevel-in disabled:opacity-60"
    >
      {pending ? "checking…" : "sign in"}
    </button>
  );
}

export function BrainLoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(signInToBrain, EMPTY);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <div className="space-y-1.5">
        <label
          htmlFor="username"
          className="block font-dot text-[13px] text-me-gold"
        >
          username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          className={FIELD}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block font-dot text-[13px] text-me-gold"
        >
          password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={FIELD}
        />
      </div>

      {/* aria-live so the failure is announced rather than only drawn — the
          field keeps its value, so there is nothing else to signal it. */}
      <p aria-live="polite" className="min-h-[1.25rem] text-[12px] text-me-live">
        {state.error}
      </p>

      <SubmitButton />
    </form>
  );
}
