"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SortableItemCard, type CardActions } from "./ItemCard";
import { useRate } from "./RateContext";
import { LANES, POOL, cellId, formatYen, sumYen } from "./trip";
import type { Lane, TripItem } from "./types";

/**
 * A lane's pile: everything in that row with no day yet, and the row's label.
 *
 * It is the sticky left column, so each row stays named and its pile stays
 * reachable while twenty-odd days scroll past underneath the drag.
 */
export function LanePile({
  lane,
  items,
  query,
  actions,
  onAdd,
  onAdoptRoute,
  legCount,
  style,
}: {
  style?: React.CSSProperties;
  /** How many legs this lane's route has; "use this route" needs at least one. */
  legCount: number;
  onAdoptRoute: (lane: Lane) => void;
  lane: Lane;
  items: TripItem[];
  query: string;
  actions: CardActions;
  onAdd: (lane: Lane, date: string | null) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: cellId(lane, null) });
  const meta = LANES[lane];
  const rate = useRate();
  const loose = sumYen(items, rate);
  const unsorted = items.filter((i) => i.kind === "unsorted").length;

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? items.filter((item) =>
        `${item.title} ${item.title_ja ?? ""} ${item.city ?? ""} ${item.notes ?? ""}`
          .toLowerCase()
          .includes(needle),
      )
    : items;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, backgroundColor: meta.tint }}
      className={cn(
        "sticky left-0 z-20 flex flex-col border-r-2 border-b border-border px-3 py-2.5",
        isOver && "ring-2 ring-inset ring-primary",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p
          className="font-raleway text-[0.65rem] uppercase tracking-[0.25em]"
          style={{ color: meta.accent }}
        >
          {meta.label}
        </p>
        <span className="font-mono text-[0.6rem] text-muted-foreground tabular-nums slashed-zero">
          {items.length}
        </span>
      </div>
      <p className="mt-0.5 font-garamond text-sm leading-snug text-muted-foreground">
        {meta.blurb}
      </p>

      {lane !== "decided" && legCount > 0 && (
        <button
          type="button"
          onClick={() => onAdoptRoute(lane)}
          className="mt-2 flex items-center gap-1 self-start rounded-sm font-raleway text-[0.6rem] uppercase tracking-[0.2em] underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          style={{ color: meta.accent }}
        >
          Use this whole route
        </button>
      )}

      <p className="mt-2 border-t border-border/70 pt-2 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground tabular-nums slashed-zero">
        {meta.pile}
        {loose > 0 && ` · ${formatYen(loose)}`}
        {/* A count, not a warning. Nothing is wrong with an unsorted card —
            it just hasn't been looked at yet, and the hollow tabs in the pile
            are already saying so. This only puts a number on them. */}
        {unsorted > 0 && ` · ${unsorted} unsorted`}
      </p>

      <div className="mt-2 flex-1 space-y-2">
        <SortableContext
          items={visible.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {visible.map((item) => (
            <SortableItemCard key={item.id} item={item} actions={actions} />
          ))}
        </SortableContext>

        {visible.length === 0 && (
          <p
            id={`empty-${cellId(lane, null)}-${POOL}`}
            className="rounded-md border border-dashed border-border px-3 py-4 text-center font-garamond text-sm leading-snug text-muted-foreground"
          >
            {items.length === 0
              ? "Nothing loose. Throw an idea in — it doesn't have to be good."
              : "Nothing matches that."}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onAdd(lane, null)}
        className="mt-2 flex w-full items-center justify-center gap-1 rounded-sm border border-dashed border-border py-1 font-raleway text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
      >
        <Plus className="h-3 w-3" strokeWidth={2} />
        Add an idea
      </button>
    </div>
  );
}
