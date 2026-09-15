"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  GripVertical,
  MapPin,
  Pin,
  Star,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Seal } from "./Seal";
import { useRate } from "./RateContext";
import {
  BOOKING_STATUSES,
  KINDS,
  LANES,
  PLANNERS,
  formatClock,
  formatDuration,
  formatCost,
  formatCostConverted,
  itemLength,
  itemWarnings,
} from "./trip";
import type { Lane, TripItem } from "./types";

export type CardActions = {
  onEdit: (item: TripItem) => void;
  /** Same lane, one day left or right. */
  onNudge: (item: TripItem, delta: number) => void;
  /** Same day, a different lane — the promote/send-back path. */
  onMoveLane: (item: TripItem, lane: Lane) => void;
  /** Leaves the original alone and puts a copy in another lane. */
  onCopy: (item: TripItem, lane: Lane) => void;
};

/** An idea card's copy goes to the other person's lane. Decided has none. */
function copyTarget(lane: Lane): Lane | null {
  if (lane === "savea") return "aaron";
  if (lane === "aaron") return "savea";
  return null;
}

/**
 * The card face, with no drag wiring, so the same markup can be handed to the
 * drag overlay.
 */
export function ItemCardFace({
  item,
  actions,
  dragging = false,
  overlay = false,
  handle,
}: {
  item: TripItem;
  actions?: CardActions;
  dragging?: boolean;
  overlay?: boolean;
  handle?: React.ReactNode;
}) {
  const kind = KINDS[item.kind];
  const rate = useRate();
  const warnings = itemWarnings(item);
  const planner = PLANNERS[item.added_by];
  const copyTo = copyTarget(item.lane);

  return (
    <article
      className={cn(
        "group relative flex gap-2 overflow-hidden rounded-md border border-border bg-card",
        "transition-shadow",
        overlay && "shadow-lg ring-1 ring-primary/30",
        dragging && "opacity-40",
      )}
    >
      {/* Kind tab: the only place the card carries its type as colour. */}
      <span
        aria-hidden="true"
        className="w-[3px] flex-none"
        style={{ backgroundColor: kind.color }}
      />

      <div className="min-w-0 flex-1 py-2 pr-2">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-mono text-[0.65rem] tracking-wider text-muted-foreground tabular-nums slashed-zero">
              {item.start_time ? (
                <span className="text-foreground">
                  {formatClock(item.start_time)}
                </span>
              ) : (
                <span style={{ color: kind.color }}>{kind.label}</span>
              )}
              <span>{formatDuration(itemLength(item))}</span>
              {item.pinned && (
                <Pin
                  className="h-3 w-3"
                  strokeWidth={1.5}
                  aria-label="Pinned"
                />
              )}
            </p>

            <button
              type="button"
              onClick={() => actions?.onEdit(item)}
              disabled={!actions}
              className="mt-0.5 block w-full rounded-sm text-left font-raleway text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default"
            >
              {item.must_do && (
                <Star
                  className="mr-1 inline h-3 w-3 -translate-y-px fill-accent text-accent"
                  strokeWidth={1.5}
                  aria-label="Must do"
                />
              )}
              {item.title}
            </button>

            {item.title_ja && (
              <p className="font-jp text-xs leading-snug text-muted-foreground">
                {item.title_ja}
              </p>
            )}
          </div>

          {handle}
          <Seal status={item.booking_status} animate={!overlay} size="sm" />
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[0.6rem] tracking-wide text-muted-foreground tabular-nums slashed-zero">
          <span
            title={`Added by ${planner.label}`}
            className="flex h-4 w-4 items-center justify-center rounded-full border border-border text-[0.55rem]"
          >
            {planner.initial}
          </span>
          {item.cost_amount !== null && (
            <span title={formatCostConverted(item, rate)}>
              {formatCost(item)}
            </span>
          )}
          {item.booking_status === "to_book" && (
            <span className="uppercase tracking-[0.15em] text-kind-food">
              {BOOKING_STATUSES.to_book.label}
            </span>
          )}
          {item.city && (
            <span className="flex items-center gap-0.5">
              <MapPin className="h-2.5 w-2.5" strokeWidth={2} />
              {item.city}
            </span>
          )}
        </div>

        {warnings.length > 0 && (
          <ul className="mt-1.5 space-y-0.5">
            {warnings.map((w) => (
              <li
                key={w.text}
                className={cn(
                  "flex items-start gap-1 font-raleway text-[0.65rem] leading-snug",
                  w.tone === "warn"
                    ? "text-kind-food"
                    : "text-muted-foreground",
                )}
              >
                <TriangleAlert
                  className="mt-px h-2.5 w-2.5 flex-none"
                  strokeWidth={2}
                />
                {w.text}
              </li>
            ))}
          </ul>
        )}

        {actions && !overlay && (
          <div className="mt-1.5 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100 pointer-coarse:gap-2 pointer-coarse:opacity-100">
            <NudgeButton
              label="Move a day earlier"
              onClick={() => actions.onNudge(item, -1)}
            >
              <ChevronLeft className="h-3 w-3" strokeWidth={2} />
            </NudgeButton>
            <NudgeButton
              label="Move a day later"
              onClick={() => actions.onNudge(item, 1)}
            >
              <ChevronRight className="h-3 w-3" strokeWidth={2} />
            </NudgeButton>

            {/* Agreeing is the whole point of the board, so it gets a button
                rather than only a drag across two rows. */}
            {item.lane === "decided" ? (
              <NudgeButton
                label={`Send back to ${LANES[item.added_by].label}`}
                onClick={() => actions.onMoveLane(item, item.added_by)}
              >
                <ArrowDown className="h-3 w-3" strokeWidth={2} />
              </NudgeButton>
            ) : (
              <NudgeButton
                label="Agreed — move it to Decided"
                accent
                onClick={() => actions.onMoveLane(item, "decided")}
              >
                <ArrowUp className="h-3 w-3" strokeWidth={2} />
              </NudgeButton>
            )}

            {copyTo && (
              <NudgeButton
                label={`Copy to ${LANES[copyTo].label}`}
                onClick={() => actions.onCopy(item, copyTo)}
              >
                <Copy className="h-3 w-3" strokeWidth={2} />
              </NudgeButton>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

/**
 * The day nudges. Dragging between columns is miserable on a phone, so these
 * are the real move control and the drag is the desktop luxury on top.
 */
function NudgeButton({
  label,
  onClick,
  accent = false,
  children,
}: {
  label: string;
  onClick: () => void;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded-sm border transition-colors pointer-coarse:h-9 pointer-coarse:w-9 pointer-coarse:rounded-md [&_svg]:pointer-coarse:h-4 [&_svg]:pointer-coarse:w-4 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
        accent
          ? "border-primary/60 text-primary hover:bg-primary hover:text-primary-foreground"
          : "border-border text-muted-foreground hover:border-primary hover:text-primary",
      )}
    >
      {children}
    </button>
  );
}

export function SortableItemCard({
  item,
  actions,
}: {
  item: TripItem;
  actions: CardActions;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: item.pinned });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <ItemCardFace
        item={item}
        actions={actions}
        dragging={isDragging}
        handle={
          item.pinned ? (
            <span
              className="flex h-5 w-4 flex-none items-center justify-center text-muted-foreground/50"
              title="Pinned — this one doesn't move"
            >
              <Pin className="h-3 w-3" strokeWidth={1.5} />
            </span>
          ) : (
            <button
              type="button"
              {...attributes}
              {...listeners}
              aria-label={`Move ${item.title}`}
              className="flex h-5 w-4 flex-none cursor-grab touch-none items-center justify-center rounded-sm text-muted-foreground/50 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring active:cursor-grabbing"
            >
              <GripVertical className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          )
        }
      />
    </div>
  );
}
