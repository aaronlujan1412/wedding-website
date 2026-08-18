"use client";

import { useActionState } from "react";
import { signInAsHost, type SignInState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: SignInState = { error: null };

export function HostLoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(
    signInAsHost,
    initialState,
  );

  return (
    <form action={formAction} className="mt-10 space-y-4">
      <input type="hidden" name="next" value={next} />

      <div className="space-y-2">
        <Label
          htmlFor="passcode"
          className="font-raleway text-xs uppercase tracking-[0.2em] text-muted-foreground"
        >
          Passphrase
        </Label>
        <Input
          id="passcode"
          name="passcode"
          type="password"
          autoComplete="current-password"
          required
          aria-describedby={state.error ? "passcode-error" : undefined}
          className="bg-card font-mono"
        />
      </div>

      {state.error && (
        <p
          id="passcode-error"
          role="alert"
          className="font-garamond text-base text-pop2"
        >
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Checking…" : "Sign in"}
      </Button>
    </form>
  );
}
