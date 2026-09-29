"use client";

import { useRef, useState, useTransition } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { deletePaper, uploadPaper } from "@/app/actions/trip-papers";
import { cn } from "@/lib/utils";
import type { TripPaper } from "./types";

/**
 * The confirmation PDFs held against one booking.
 *
 * Everything else on this tab is text in a grid. A stored paper is the one
 * thing on the trip you would otherwise be holding, so it is the only element
 * here drawn as an object: a slip in the board's own page tint with a folded
 * corner. The fold is the mark of a paper that exists — an empty slot has no
 * corner to turn down — so adding one is an ordinary line with a `+`, the same
 * gesture as adding to the checklist beside it. A second dashed box next to
 * the checklist's dashed box would have been one accessory too many; the
 * dashed outline appears only while a file is actually over the drop zone.
 */

/** The cut corner. One value, so the slip and its fold can't drift apart. */
const FOLD = "0.85rem";

const SLIP = "relative block w-full min-w-0 border border-border bg-paper";

/**
 * The corner is cut out of the slip and drawn back as a triangle, so the fold
 * has a shaded underside rather than just a missing corner.
 */
const CUT = {
  clipPath: `polygon(0 0, calc(100% - ${FOLD}) 0, 100% ${FOLD}, 100% 100%, 0 100%)`,
};

function sizeOf(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PaperSlips({
  owner,
  papers,
  hint,
}: {
  /** `stay:<id>` — the thing these confirm. */
  owner: string;
  papers: TripPaper[];
  hint?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  function send(file: File | undefined) {
    if (!file) return;
    setError(null);
    setSaving(file.name);
    const body = new FormData();
    body.set("file", file);
    startTransition(async () => {
      const result = await uploadPaper(owner, body);
      setSaving(null);
      if (result.error) setError(result.error);
      if (input.current) input.current.value = "";
    });
  }

  return (
    <section
      className="min-w-[14rem] flex-1"
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        // Only when the pointer has actually left the block, not on the way
        // across a slip inside it.
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        send(e.dataTransfer.files[0]);
      }}
    >
      <p className="font-raleway text-[0.6rem] uppercase tracking-[0.25em] text-muted-foreground">
        Papers
      </p>

      <div
        className={cn(
          "mt-2 rounded-sm",
          over &&
            "-m-1 border border-dashed border-primary bg-primary/5 p-1 pt-1",
        )}
      >
        <ul className="space-y-1.5">
          {papers.map((paper) => (
            <Slip key={paper.id} paper={paper} pending={pending} />
          ))}

          {saving && (
            <li>
              <span style={CUT} aria-busy className={cn(SLIP, "px-3 py-2")}>
                <Fold />
                <Line
                  name={saving}
                  trailing="Saving"
                  className="text-muted-foreground"
                />
              </span>
            </li>
          )}
        </ul>

        <label
          className={cn(
            "mt-1.5 flex cursor-pointer items-center gap-2",
            "font-garamond text-base text-muted-foreground",
            "hover:text-primary",
            "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
          )}
        >
          <Plus className="h-3.5 w-3.5 flex-none" strokeWidth={2} />
          <input
            ref={input}
            type="file"
            accept="application/pdf"
            disabled={pending}
            onChange={(e) => send(e.target.files?.[0])}
            className="sr-only"
          />
          {over ? "Drop it here" : "Add a PDF"}
        </label>
      </div>

      {hint && !error && (
        <p className="mt-1.5 font-garamond text-xs leading-snug text-muted-foreground">
          {hint}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-1.5 font-garamond text-xs leading-snug text-warn"
        >
          {error}
        </p>
      )}
    </section>
  );
}

function Slip({ paper, pending }: { paper: TripPaper; pending: boolean }) {
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <li className="group/slip flex items-stretch gap-1">
      <a
        href={`/honeymoon/paper/${paper.id}`}
        target="_blank"
        rel="noreferrer"
        style={CUT}
        className={cn(
          SLIP,
          "px-3 py-2 hover:border-primary/50",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        )}
      >
        <Fold />
        <Line name={paper.name} trailing={sizeOf(paper.bytes)} mono />
      </a>
      <button
        type="button"
        disabled={pending}
        aria-label={`Remove ${paper.name}`}
        onClick={() =>
          startTransition(async () => {
            const result = await deletePaper(paper.id);
            if (result.error) setError(result.error);
          })
        }
        className={cn(
          "flex-none rounded-sm px-1 text-muted-foreground hover:text-warn",
          "opacity-0 transition-opacity motion-reduce:transition-none",
          "group-hover/slip:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        )}
        title={error ?? undefined}
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
    </li>
  );
}

/** The one line a slip holds: what it is, and how big. */
function Line({
  name,
  trailing,
  mono = false,
  className,
}: {
  name: string;
  trailing: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <span className="flex items-baseline gap-2 pr-3">
      <FileText
        className="h-3.5 w-3.5 flex-none translate-y-0.5 text-muted-foreground"
        strokeWidth={1.5}
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate font-garamond text-base leading-snug",
          className ?? "text-foreground",
        )}
      >
        {name}
      </span>
      <span
        className={cn(
          "flex-none text-muted-foreground",
          mono
            ? "font-mono text-[0.65rem] tabular-nums"
            : "font-raleway text-[0.6rem] uppercase tracking-[0.2em]",
        )}
      >
        {trailing}
      </span>
    </span>
  );
}

/** The underside of the folded corner, in the shade the fold would cast. */
function Fold() {
  return (
    <span
      aria-hidden
      className="absolute top-0 right-0 bg-border/60"
      style={{
        width: FOLD,
        height: FOLD,
        clipPath: "polygon(0 0, 100% 100%, 0 100%)",
      }}
    />
  );
}
