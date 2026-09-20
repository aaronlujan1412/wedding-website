"use client";

import { useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  BedDouble,
  ChevronLeft,
  ChevronRight,
  Copy,
  GripVertical,
  MapPin,
  Pin,
  Star,
  TramFront,
  X,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { setWanderItem } from "@/app/actions/honeymoon";
import { ItemMenu, cardKeys } from "./CardMenu";
import { Seal, StatusLabel, TONE_INK } from "./Seal";
import { useRate } from "./RateContext";
import { useBoardData } from "./BoardContext";
import { blockoutDetail } from "./blockouts";
import {
  LANES,
  PLANNERS,
  formatClock,
  formatDuration,
  formatCost,
  formatCostConverted,
  itemLength,
  itemWarnings,
  kindOf,
} from "./trip";
import type { BookingStatus, Lane, TripItem } from "./types";

export type CardActions = {
  onEdit: (item: TripItem) => void;
  /** Same lane, one day left or right. */
  onNudge: (item: TripItem, delta: number) => void;
  /** Same day, a different lane — the promote/send-back path. */
  onMoveLane: (item: TripItem, lane: Lane) => void;
  /** Leaves the original alone and puts a copy in another lane. */
  onCopy: (item: TripItem, lane: Lane) => void;
  /** Goes straight away, with an undo in the toast rather than a confirm. */
  onDelete: (item: TripItem) => void;

  /* The right-click menu's half. Everything above is a button on the card. */

  /** Onto the board's clipboard. A cut card moves when it lands. */
  onClip: (item: TripItem, cut: boolean) => void;
  /** Whatever is on the clipboard, into this cell. */
  onPaste: (lane: Lane, onDate: string | null) => void;
  /** A second copy in the same cell. */
  onDuplicate: (item: TripItem) => void;
  /** One column, without opening the form. */
  onFlag: (item: TripItem, flag: "must_do" | "pinned", value: boolean) => void;
  onStatus: (item: TripItem, status: BookingStatus) => void;
  /** Anywhere on the board: another lane, another day, or back to the pile. */
  onSend: (item: TripItem, lane: Lane, onDate: string | null) => void;
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
 *
 * Two shapes come out of here. An activity is a card: opaque paper, a border,
 * a coloured tab and a seal. A blockout is not a card at all — it is a band,
 * because it is time being protected rather than a thing being done, and
 * drawing it as another card with a different colour would say the opposite.
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
  const kind = kindOf(item.kind);
  const rate = useRate();
  const warnings = itemWarnings(item);
  const planner = PLANNERS[item.added_by];
  const copyTo = copyTarget(item.lane);

  if (kind.blockout) {
    return (
      <BlockoutBand
        item={item}
        actions={actions}
        dragging={dragging}
        overlay={overlay}
        handle={handle}
      />
    );
  }

  const unsorted = item.kind === "unsorted";

  const card = (
    <article
      onKeyDown={
        actions && !overlay ? (e) => cardKeys(e, item, actions) : undefined
      }
      className={cn(
        "group relative flex gap-2 overflow-hidden rounded-md border border-border bg-card",
        "transition-shadow",
        overlay && "shadow-lg ring-1 ring-primary/30",
        dragging && "opacity-40",
      )}
    >
      {/* Kind tab: the only place the card carries its type as colour. Unsorted
          is deliberately hollow — it is the default, so it has to read as a
          question rather than as an answer. */}
      <span
        aria-hidden="true"
        className="w-[3px] flex-none"
        style={
          unsorted
            ? {
                backgroundImage: `repeating-linear-gradient(to bottom, ${kind.color} 0 3px, transparent 3px 6px)`,
              }
            : { backgroundColor: kind.color }
        }
      />

      <div className="min-w-0 flex-1 py-2 pr-2">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-mono text-[0.65rem] tracking-wider text-muted-foreground tabular-nums slashed-zero">
              {item.start_time ? (
                <span className="text-foreground">
                  {formatClock(item.start_time)}
                </span>
              ) : unsorted ? (
                // Unsorted never gets to speak in its own colour: it does not
                // clear AA on the lane tints, and it should recede anyway.
                <span className="italic">{kind.label}</span>
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
          {/* In words as well as the stamp: a ticket icon alone could as
              easily mean "tickets needed". */}
          <StatusLabel status={item.booking_status} />
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
                  TONE_INK[w.tone],
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
          <CardControls item={item} actions={actions} copyTo={copyTo} />
        )}
      </div>
    </article>
  );

  // The card under the pointer mid-drag is a picture of a card, not one.
  return actions && !overlay ? (
    <ItemMenu item={item} actions={actions}>
      {card}
    </ItemMenu>
  ) : (
    card
  );
}

/**
 * A blockout: time claimed on purpose.
 *
 * Drawn as a band rather than a card, and kin to the rail's own "2h open"
 * marker — a blockout is that same stretch of time, signed for. The duration
 * leads and the title follows, because on a rest afternoon the number is the
 * point. No seal, no cost, no must-do star: none of them mean anything for an
 * hour you have decided not to fill.
 */
function BlockoutBand({
  item,
  actions,
  dragging,
  overlay,
  handle,
}: {
  item: TripItem;
  actions?: CardActions;
  dragging: boolean;
  overlay: boolean;
  handle?: React.ReactNode;
}) {
  const kind = kindOf(item.kind);
  const planner = PLANNERS[item.added_by];
  const copyTo = copyTarget(item.lane);
  const board = useBoardData();
  const detail = blockoutDetail(item, board);
  const [, startTransition] = useTransition();

  const band = (
    <article
      onKeyDown={
        actions && !overlay ? (e) => cardKeys(e, item, actions) : undefined
      }
      className={cn(
        "group relative flex overflow-hidden rounded-sm",
        overlay && "shadow-lg ring-1 ring-primary/30",
        dragging && "opacity-40",
      )}
      style={{
        // The tint carries the type; the hatch says "spoken for". Both are far
        // enough down that the band sits under the cards around it rather than
        // competing with them.
        backgroundColor: `color-mix(in srgb, ${kind.color} 7%, transparent)`,
        backgroundImage: `repeating-linear-gradient(135deg, transparent 0 5px, color-mix(in srgb, ${kind.color} 9%, transparent) 5px 6px)`,
      }}
    >
      <span
        aria-hidden="true"
        className="w-[3px] flex-none"
        style={{ backgroundColor: kind.color }}
      />

      <div className="min-w-0 flex-1 px-2.5 py-1.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {/* The start time is already in the rail gutter to the left, so
                this line is the duration and nothing else. Both halves stay on
                one line: a wrapped "2h / 45m" reads as two numbers. */}
            <p className="flex flex-wrap items-center gap-x-2 font-mono text-[0.65rem] tracking-wider tabular-nums slashed-zero">
              <span className="whitespace-nowrap text-foreground">
                {formatDuration(itemLength(item))}
              </span>
              <span className="whitespace-nowrap text-muted-foreground">
                {kind.label}
              </span>
            </p>

            <button
              type="button"
              onClick={() => actions?.onEdit(item)}
              disabled={!actions}
              className="mt-0.5 block w-full rounded-sm text-left font-raleway text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default"
            >
              {item.title}
            </button>

            {detail.text && (
              <p className="mt-0.5 flex items-center gap-1 font-mono text-[0.6rem] tracking-wide text-muted-foreground">
                {kind.links === "stay" ? (
                  <BedDouble
                    className="h-2.5 w-2.5 flex-none"
                    strokeWidth={2}
                  />
                ) : kind.links === "transit" ? (
                  <TramFront
                    className="h-2.5 w-2.5 flex-none"
                    strokeWidth={2}
                  />
                ) : (
                  <MapPin className="h-2.5 w-2.5 flex-none" strokeWidth={2} />
                )}
                {detail.text}
              </p>
            )}
          </div>

          {handle}
          <span
            title={`Added by ${planner.label}`}
            className="flex h-4 w-4 flex-none items-center justify-center rounded-full border border-border font-mono text-[0.55rem] text-muted-foreground"
          >
            {planner.initial}
          </span>
        </div>

        {/* The block's actual list, drawn inside it. These cards are hidden
            from the pile while they hang here, so the × is the only way back
            out — without it an attached card is a card you have to go and
            find the form for. It writes straight through, the same as the
            picker in the form does. */}
        {detail.ideas.length > 0 && !overlay && (
          <ul className="mt-1.5 space-y-px border-l border-border pl-2">
            {detail.ideas.map((idea) => {
              const sub = kindOf(idea.kind);
              return (
                <li key={idea.id} className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-[2px] flex-none rounded-full"
                    style={{ backgroundColor: sub.color }}
                  />
                  <button
                    type="button"
                    onClick={() => actions?.onEdit(idea)}
                    disabled={!actions}
                    className="min-w-0 flex-1 truncate rounded-sm text-left font-raleway text-[0.7rem] text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default"
                  >
                    {idea.must_do && (
                      <Star
                        className="mr-1 inline h-2.5 w-2.5 fill-current align-baseline"
                        strokeWidth={2}
                      />
                    )}
                    {idea.title}
                  </button>
                  <span className="flex-none font-mono text-[0.55rem] text-muted-foreground tabular-nums">
                    {formatDuration(itemLength(idea))}
                  </span>
                  {actions && (
                    <button
                      type="button"
                      title="Back to the pile"
                      aria-label={`Detach ${idea.title} from ${item.title}`}
                      onClick={() =>
                        startTransition(() => {
                          void setWanderItem(idea.id, null);
                        })
                      }
                      className="flex-none rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:p-2"
                    >
                      <X className="h-2.5 w-2.5" strokeWidth={2} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {actions && !overlay && (
          <CardControls item={item} actions={actions} copyTo={copyTo} />
        )}
      </div>
    </article>
  );

  return actions && !overlay ? (
    <ItemMenu item={item} actions={actions}>
      {band}
    </ItemMenu>
  ) : (
    band
  );
}

/** The move controls, shared so a band behaves exactly like a card. */
function CardControls({
  item,
  actions,
  copyTo,
}: {
  item: TripItem;
  actions: CardActions;
  copyTo: Lane | null;
}) {
  return (
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

      {/* Agreeing is the whole point of the board, so it gets a button rather
          than only a drag across two rows. */}
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

      {/* Sits apart from the moves, because it is the one that doesn't move
          anything. Deletes on the click and offers an undo in the toast. */}
      <NudgeButton
        label={`Delete ${item.title}`}
        destructive
        onClick={() => actions.onDelete(item)}
      >
        <X className="h-3 w-3" strokeWidth={2} />
      </NudgeButton>
    </div>
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
  destructive = false,
  children,
}: {
  label: string;
  onClick: () => void;
  accent?: boolean;
  destructive?: boolean;
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
        accent &&
          "border-primary/60 text-primary hover:bg-primary hover:text-primary-foreground",
        destructive &&
          "ml-auto border-border text-muted-foreground hover:border-destructive hover:text-destructive",
        !accent &&
          !destructive &&
          "border-border text-muted-foreground hover:border-primary hover:text-primary",
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
