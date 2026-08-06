"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

export default function NotOnTheList() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex items-center gap-1 font-raleway text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Don&apos;t see your name?
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          strokeWidth={1.5}
        />
      </button>

      <div
        id={panelId}
        className={`grid transition-all duration-300 motion-reduce:transition-none ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mt-3 border-l-2 border-primary bg-primary/5 px-4 py-3">
            <p className="font-raleway text-xs uppercase tracking-[0.3em] text-primary">
              The guest list is final
            </p>
            <p className="mt-2 font-garamond text-lg text-foreground">
              Invites went out by household, so check for a family name or your
              partner&apos;s name before you count yourself out.
            </p>
            <p className="mt-2 font-garamond text-lg text-foreground">
              If it&apos;s still not there, we weren&apos;t able to include you
              this time. Our venue seats a fixed number and every seat is
              already spoken for, so we can&apos;t add anyone at the door —
              please don&apos;t make the trip expecting to get in.
            </p>
            <p className="mt-3 font-garamond text-lg italic text-muted-foreground">
              It&apos;s a small venue, not a small amount of love for you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
