"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The fact grid shared by the Flights and Lodging tabs: a labelled cell, the
 * dashed "add it" prompt for a fact nobody has filled in, and a code big enough
 * to read out at a desk.
 */

export function Fact({
  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("bg-card px-5 py-4 sm:px-8", wide && "sm:col-span-2")}>
      <dt className="font-raleway text-[0.6rem] uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-foreground">{children}</dd>
    </div>
  );
}

export function Missing({
  onAdd,
  children,
}: {
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="font-garamond text-lg text-muted-foreground underline decoration-dashed underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {children}
    </button>
  );
}

/** Big enough to read out to a check-in agent, one tap to paste into an app. */
export function CopyCode({
  code,
  size = "lg",
}: {
  code: string;
  size?: "lg" | "sm";
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          // No clipboard (old browser, or not a secure context): the code is
          // still right there on screen to read out.
        }
      }}
      aria-label={`Copy confirmation code ${code.split("").join(" ")}`}
      className="group inline-flex items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span
        className={cn(
          "font-mono font-medium tracking-[0.15em] tabular-nums slashed-zero",
          size === "lg" ? "text-2xl" : "text-sm",
        )}
      >
        {code}
      </span>
      <span
        aria-live="polite"
        className="flex items-center gap-1 font-raleway text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3" strokeWidth={2} /> Copied
          </>
        ) : (
          <Copy className="h-3 w-3" strokeWidth={1.5} />
        )}
      </span>
    </button>
  );
}
