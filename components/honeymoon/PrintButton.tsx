"use client";

import { Printer } from "lucide-react";

/**
 * The Itinerary's printout is the pocket copy — the one that still works in a
 * Tokyo basement with no signal. The browser's own print is the whole job; the
 * page's print styles do the rest.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 font-raleway text-sm text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:py-2.5"
    >
      <Printer className="h-3.5 w-3.5" strokeWidth={1.75} />
      Print
    </button>
  );
}
