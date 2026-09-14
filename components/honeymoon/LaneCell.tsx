"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SortableItemCard, type CardActions } from "./ItemCard";
import { LANES, cellId, formatDuration, layoutDay } from "./trip";
import type { Lane, TripItem } from "./types";

/**
 * One cell of the grid: a lane crossed with a day.
 *
 * The time rail only draws its gap markers in `decided`. A hole in a draft lane
 * isn't information — that row is a half-finished argument, not a plan.
 */
export function LaneCell({
  lane,
  date,
  items,
  isToday,
  actions,
  onAdd,
}: {
  lane: Lane;
  date: string;
  items: TripItem[];
  isToday: boolean;
  actions: CardActions;
  onAdd: (lane: Lane, date: string) => void;
}) {
  const id = cellId(lane, date);
  const { setNodeRef, isOver } = useDroppable({ id });
  const meta = LANES[lane];
  const rows = layoutDay(items);
  const showGaps = lane === "decided";

  return (
    <div
      ref={setNodeRef}
      id={`cell-${id}`}
      style={{ backgroundColor: meta.tint }}
      className={cn(
        "group/cell flex min-h-[8rem] flex-col border-r border-b border-border px-2.5 py-2 transition-shadow",
        isOver && "ring-2 ring-inset ring-primary",
        isToday && "shadow-[inset_3px_0_0_var(--color-primary)]",
      )}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ol className="flex-1">
          {rows.map((row) =>
            row.kind === "gap" ? (
              showGaps ? (
                <li key={row.key} className="grid grid-cols-[2.25rem_1fr]">
                  <span aria-hidden="true" />
                  <span className="flex items-center gap-1.5 border-l border-dashed border-border py-1 pl-2 font-mono text-[0.6rem] tracking-wide text-muted-foreground tabular-nums slashed-zero">
                    <span className="h-px w-2.5 flex-none bg-border" />
                    {formatDuration(row.minutes)} open
                  </span>
                </li>
              ) : null
            ) : (
              <li key={row.item.id} className="grid grid-cols-[2.25rem_1fr]">
                <span className="pt-2 pr-2 text-right font-mono text-[0.6rem] leading-none text-muted-foreground tabular-nums slashed-zero">
                  {row.item.start_time ? (
                    row.item.start_time.slice(0, 5)
                  ) : (
                    <span aria-hidden="true">·</span>
                  )}
                </span>
                <div className="border-l border-border pb-2 pl-2">
                  <SortableItemCard item={row.item} actions={actions} />
                </div>
              </li>
            ),
          )}
        </ol>
      </SortableContext>

      <button
        type="button"
        onClick={() => onAdd(lane, date)}
        aria-label={`Add to ${meta.label} on this day`}
        className="mt-1 flex w-full items-center justify-center gap-1 rounded-sm border border-dashed border-transparent py-1 font-raleway text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground opacity-0 transition hover:border-border hover:text-primary focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring group-hover/cell:opacity-100 max-md:opacity-100"
      >
        <Plus className="h-3 w-3" strokeWidth={2} />
        Add
      </button>
    </div>
  );
}
