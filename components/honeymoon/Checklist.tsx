"use client";

import { useState, useTransition } from "react";
import { Check, Plus, X } from "lucide-react";
import {
  addChecklistItems,
  deleteChecklistItem,
  updateChecklistItem,
} from "@/app/actions/checklists";
import { cn } from "@/lib/utils";
import { LANES, PLANNERS } from "./trip";
import type { ChecklistItem, Planner } from "./types";

const OWNER_CYCLE: (Planner | null)[] = [null, "aaron", "savea"];

/**
 * A shared checklist with who's got each thing.
 *
 * Nothing in here knows what it's a list of. Flights hand it the essentials
 * for one journey; a packing tab would hand it "packing". `items` can span
 * several list keys — a journey's checklist is the items on all its flights —
 * and new items go to `list`.
 *
 * The owner tag uses each person's lane colour from the board, so "whose is
 * this" reads the same everywhere in the planner.
 */
export function Checklist({
  title,
  list,
  items: serverItems,
  suggestions = [],
  className,
}: {
  title: string;
  list: string;
  items: ChecklistItem[];
  suggestions?: string[];
  className?: string;
}) {
  // Local mirror so ticking is instant; adopt fresh server rows when they land.
  const [items, setItems] = useState(serverItems);
  const [seededFrom, setSeededFrom] = useState(serverItems);
  if (seededFrom !== serverItems) {
    setSeededFrom(serverItems);
    setItems(serverItems);
  }

  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sorted = [...items].sort((a, b) => a.position - b.position);
  const done = sorted.filter((i) => i.done).length;
  const unused = suggestions.filter(
    (s) => !sorted.some((i) => i.label.toLowerCase() === s.toLowerCase()),
  );

  function patch(
    id: string,
    change: Partial<Pick<ChecklistItem, "done" | "owner">>,
  ) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...change } : i)),
    );
    startTransition(async () => {
      const result = await updateChecklistItem(id, change);
      if (result.error) setError(result.error);
    });
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    startTransition(async () => {
      const result = await deleteChecklistItem(id);
      if (result.error) setError(result.error);
    });
  }

  function add(labels: string[]) {
    setError(null);
    startTransition(async () => {
      const result = await addChecklistItems(list, labels);
      if (result.error) setError(result.error);
      else if (result.data) setItems((prev) => [...prev, ...result.data]);
    });
  }

  return (
    <section className={className} aria-label={title}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-raleway text-[0.65rem] uppercase tracking-[0.25em] text-primary">
          {title}
        </h3>
        {sorted.length > 0 && (
          <p className="font-mono text-[0.65rem] text-muted-foreground tabular-nums slashed-zero">
            {done} of {sorted.length}
          </p>
        )}
      </div>

      <ul className="mt-2 divide-y divide-border/70">
        {sorted.map((item) => (
          <li key={item.id} className="group flex items-center gap-3 py-2">
            <button
              type="button"
              role="checkbox"
              aria-checked={item.done}
              aria-label={item.label}
              onClick={() => patch(item.id, { done: !item.done })}
              className={cn(
                "flex h-5 w-5 flex-none items-center justify-center rounded-sm border transition-colors pointer-coarse:h-7 pointer-coarse:w-7",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                item.done
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:border-primary",
              )}
            >
              {item.done && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
            </button>

            <span
              className={cn(
                "min-w-0 flex-1 font-garamond text-lg leading-snug",
                item.done
                  ? "text-muted-foreground line-through"
                  : "text-foreground",
              )}
            >
              {item.label}
            </span>

            <OwnerTag
              owner={item.owner}
              onCycle={() => {
                const next =
                  OWNER_CYCLE[
                    (OWNER_CYCLE.indexOf(item.owner) + 1) % OWNER_CYCLE.length
                  ];
                patch(item.id, { owner: next });
              }}
            />

            <button
              type="button"
              onClick={() => remove(item.id)}
              aria-label={`Remove ${item.label}`}
              className="flex h-6 w-6 flex-none items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring group-hover:opacity-100 max-md:opacity-100 pointer-coarse:h-9 pointer-coarse:w-9 pointer-coarse:opacity-100"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </li>
        ))}
      </ul>

      {sorted.length === 0 && unused.length > 0 && (
        <button
          type="button"
          onClick={() => add(unused)}
          className="mt-1 w-full rounded-md border border-dashed border-border px-3 py-3 text-left font-garamond text-base text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="font-raleway text-[0.65rem] uppercase tracking-[0.2em]">
            Start with the usual
          </span>
          <span className="mt-0.5 block">{unused.join(" · ")}</span>
        </button>
      )}

      <form
        className="mt-2 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          add([draft]);
          setDraft("");
        }}
      >
        <Plus
          className="h-3.5 w-3.5 flex-none text-muted-foreground"
          strokeWidth={2}
        />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add something to grab"
          aria-label={`Add to ${title}`}
          className="h-8 min-w-0 flex-1 border-b border-transparent bg-transparent font-garamond text-base text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none"
        />
      </form>

      {error && (
        <p role="alert" className="mt-2 font-raleway text-xs text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}

function OwnerTag({
  owner,
  onCycle,
}: {
  owner: Planner | null;
  onCycle: () => void;
}) {
  const label = owner
    ? `${PLANNERS[owner].label} has this`
    : "Nobody's got this yet";
  const accent = owner ? LANES[owner].accent : undefined;

  return (
    <button
      type="button"
      onClick={onCycle}
      title={`${label} — tap to change`}
      aria-label={`${label}. Change who has it.`}
      style={accent ? { borderColor: accent, color: accent } : undefined}
      className={cn(
        "flex h-6 w-6 flex-none items-center justify-center rounded-full border font-raleway text-[0.65rem] font-semibold transition-colors pointer-coarse:h-9 pointer-coarse:w-9 pointer-coarse:text-xs",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        owner
          ? "bg-background"
          : "border-dashed border-border text-muted-foreground",
      )}
    >
      {owner ? PLANNERS[owner].initial : "·"}
    </button>
  );
}
