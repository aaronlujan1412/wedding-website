"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { StatusMark } from "./Seal";
import {
  LANES,
  cellId,
  formatClock,
  formatDuration,
  itemLength,
  kindOf,
} from "./trip";
import type { TripItem } from "./types";

/**
 * Decided, as one line per card, under the day headers in Compare.
 *
 * Compare is where the two drafts get weighed, and it used to weigh them
 * against nothing: Decided was off screen, so the day header quietly showed
 * Decided's numbers and had to label them "decided:" to stop them being read
 * as the row beneath. With the baseline on screen, "she has the shrine at ten,
 * he has the market at ten, and we already said the knife shop at ten" is one
 * glance — and the header's numbers sit directly over the row they describe.
 *
 * It is a drop target, so dragging a draft card up into it agrees to it. That
 * is the gesture the board was built around, and the only view that shows two
 * drafts is where it belongs.
 */
export function DecidedSpineCell({
  date,
  items,
  isToday,
  onEdit,
  style,
}: {
  date: string;
  items: TripItem[];
  isToday: boolean;
  onEdit: (item: TripItem) => void;
  style?: React.CSSProperties;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: cellId("decided", date) });

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, backgroundColor: LANES.decided.tint }}
      className={cn(
        "min-h-[4.25rem] border-r border-b-2 border-r-border border-b-primary/30 px-2.5 py-2 transition-shadow",
        isOver && "ring-2 ring-primary ring-inset",
        isToday && "shadow-[inset_3px_0_0_var(--color-primary)]",
      )}
    >
      {items.length === 0 ? (
        <p className="font-garamond text-sm text-muted-foreground italic">
          Nothing agreed yet
        </p>
      ) : (
        <ol className="space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <SpineRow item={item} onEdit={onEdit} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function SpineRow({
  item,
  onEdit,
}: {
  item: TripItem;
  onEdit: (item: TripItem) => void;
}) {
  const kind = kindOf(item.kind);

  return (
    <button
      type="button"
      onClick={() => onEdit(item)}
      title={`${item.title} — open it`}
      className="flex w-full min-w-0 items-stretch gap-2 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
    >
      {/* The same kind tab as a card, so a row and its card read as one thing.
          Unsorted stays hollow here too. */}
      <span
        aria-hidden="true"
        className="w-[3px] flex-none rounded-full"
        style={
          item.kind === "unsorted"
            ? {
                backgroundImage: `repeating-linear-gradient(to bottom, ${kind.color} 0 2px, transparent 2px 4px)`,
              }
            : { backgroundColor: kind.color }
        }
      />
      <span className="w-9 flex-none pt-px font-mono text-[0.6rem] text-muted-foreground tabular-nums slashed-zero">
        {item.start_time
          ? formatClock(item.start_time)
          : formatDuration(itemLength(item))}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate font-raleway text-xs leading-snug",
          // A blockout recedes here as it does on the board.
          kind.blockout
            ? "text-muted-foreground italic"
            : "text-foreground",
        )}
      >
        {item.title}
      </span>
      {!kind.blockout && (
        <StatusMark status={item.booking_status} className="self-start pt-px" />
      )}
    </button>
  );
}
