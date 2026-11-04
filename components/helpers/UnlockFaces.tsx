"use client";

import { useActionState, useId } from "react";
import { unlockFaces, type UnlockState } from "@/app/actions/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: UnlockState = { error: null };

/** Who's who before the code: what's behind it, and the four digits. A
    right code sets the cookie and the page redraws with the album here. */
export function UnlockFaces() {
  const [state, formAction, pending] = useActionState(unlockFaces, initialState);
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <form
      action={formAction}
      className="mt-6 rounded-lg border border-border bg-card p-6 md:p-8 print:hidden"
    >
      <p className="font-garamond text-lg leading-relaxed text-foreground/90">
        Photos of our family and friends, so you can put a face to every name
        on the shot list. They’re behind a four-digit code; if you don’t have
        it, ask Aaron or Savea.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-3">
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
          {pending ? "Checking…" : "Show the faces"}
        </Button>
      </div>

      {state.error && (
        <p id={errorId} role="alert" className="mt-3 font-garamond text-base text-pop2">
          {state.error}
        </p>
      )}
    </form>
  );
}
