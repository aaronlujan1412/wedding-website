"use client";

import { useActionState, useId } from "react";
import { unlockHelpers, type UnlockState } from "@/app/actions/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: UnlockState = { error: null };

/**
 * A staff helper page before the code: what's on it, and the four digits.
 * A right code sets the cookie and the page redraws with its tabs here.
 * `contents` finishes "Your page has…" — names only, nothing from the cards.
 */
export function UnlockHelpers({ contents }: { contents: string }) {
  const [state, formAction, pending] = useActionState(unlockHelpers, initialState);
  const id = useId();
  const titleId = `${id}-title`;
  const errorId = `${id}-error`;

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-lg border border-border bg-card p-6 max-md:mb-16 md:p-8 print:hidden"
    >
      <h2 id={titleId} className="font-garamond text-3xl text-foreground">
        The helpers’ code
      </h2>
      <p className="mt-3 font-garamond text-lg leading-relaxed text-foreground/90">
        Your page has {contents}. It’s behind the four-digit code we sent you;
        if you don’t have it, ask Aaron or Savea.
      </p>

      <form action={formAction} className="mt-5 flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <label htmlFor={id} className="font-raleway text-sm text-muted-foreground">
            The code
          </label>
          <Input
            id={id}
            name="code"
            inputMode="numeric"
            autoComplete="off"
            pattern="[0-9]{4}"
            title="Four digits"
            maxLength={4}
            required
            aria-describedby={state.error ? errorId : undefined}
            className="h-12 w-36 bg-background text-center font-raleway text-2xl tracking-[0.4em] tabular-nums"
          />
        </div>
        <Button type="submit" size="lg" disabled={pending} className="h-12">
          {pending ? "Checking…" : "Let me in"}
        </Button>
      </form>

      {state.error && (
        <p id={errorId} role="alert" className="mt-3 font-garamond text-base text-pop2">
          {state.error}
        </p>
      )}
      <p className="mt-5 font-raleway text-sm text-muted-foreground">
        You’ll only need it once on this phone or computer.
      </p>
    </section>
  );
}
