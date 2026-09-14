"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SortableItemCard, type CardActions } from "./ItemCard";
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
}: {
  lane: Lane;
  items: TripItem[];
  query: string;
  actions: CardActions;
  onAdd: (lane: Lane, date: string | null) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: cellId(lane, null) });
  const meta = LANES[lane];

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
      style={{ backgroundColor: meta.tint }}
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

      <p className="mt-2 border-t border-border/70 pt-2 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground tabular-nums slashed-zero">
        {meta.pile}
        {sumYen(items) > 0 && ` · ${formatYen(sumYen(items))}`}
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
