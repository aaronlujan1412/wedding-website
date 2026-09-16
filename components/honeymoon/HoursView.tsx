"use client";

import { useState } from "react";
import Link from "next/link";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  BedDouble,
  Coffee,
  GripVertical,
  Plane,
  Plus,
  Star,
  TramFront,
  TriangleAlert,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBoardData } from "./BoardContext";
import { blockoutDetail } from "./blockouts";
import { ItemMenu, cardKeys } from "./CardMenu";
import type { CardActions } from "./ItemCard";
import {
  PAGE_HALF_HOUR_REM,
  SHELF_LIMIT,
  WAKING,
  freeMinutes,
  hoursId,
  hoursRange,
  percentAt,
  placeSpans,
  shelfId,
  toTime,
  type Anchor,
  type Mark,
  type Range,
} from "./hours";
import { StatusLabel, StatusMark, TONE_INK } from "./Seal";
import type { Sun } from "./sun";
import {
  LANES,
  formatCost,
  formatDuration,
  itemLength,
  itemStart,
  itemWarnings,
  kindOf,
  openHours,
  overlaps,
  type Warning,
} from "./trip";
import type { Lane, TripItem } from "./types";

/**
 * The pieces of the Hours layout. `HoneymoonBoard` places them in its grid —
 * a ruler column, then per day a Sometime shelf over a column of hours — and
 * owns every drag. Nothing here writes; it all goes back up through `actions`.
 */

/* ------------------------------------------------------------ the ruler -- */

export function HoursRuler({
  range,
  pinned = true,
  style,
}: {
  range: Range;
  /**
   * Stays put while the days scroll past it sideways. A phone's page doesn't
   * scroll sideways, and pinned there it rode up over the sticky day strip.
   */
  pinned?: boolean;
  style?: React.CSSProperties;
}) {
  const hours: number[] = [];
  for (let m = range.start; m <= range.end; m += 60) hours.push(m);

  return (
    <div
      aria-hidden="true"
      style={style}
      className={cn(
        "border-r border-border bg-background py-2",
        pinned && "sticky left-0 z-20",
      )}
    >
      <div className="relative h-full">
        {hours.map((m) => (
          <span
            key={m}
            style={{ top: `${percentAt(m, range)}%` }}
            className="absolute right-1.5 -translate-y-1/2 font-mono text-[0.6rem] leading-none text-muted-foreground tabular-nums slashed-zero"
          >
            {m === 24 * 60 ? "24:00" : toTime(m)}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The half-hour lines, drawn once across every day column rather than as a
 * background on each. A repeating gradient sized in percent lands on half
 * pixels at most heights, and the rounding doubled some lines and dropped
 * others. It sits over the columns' tint and under their cards.
 */
export function HoursLines({
  range,
  style,
}: {
  range: Range;
  style?: React.CSSProperties;
}) {
  const lines: number[] = [];
  for (let m = range.start; m <= range.end; m += 30) lines.push(m);

  return (
    <div
      aria-hidden="true"
      style={style}
      className="pointer-events-none relative z-1 py-2"
    >
      <div className="relative h-full">
        {lines.map((m) => (
          <span
            key={m}
            style={{ top: `${percentAt(m, range)}%` }}
            className={cn(
              "absolute inset-x-0 border-t",
              m % 60 === 0 ? "border-border/60" : "border-border/25",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------ Sometime shelf -- */

/**
 * The day's cards that don't have a time yet.
 *
 * Most cards are here most of the time — a loose card is a real decision ("the
 * market on Sunday, whenever"), not an unfinished one — so this is where the
 * Hours layout actually gets used. It answers one question before any card
 * moves: can this day still take what's on it? The cards' total is set against
 * what's left of the waking day, and turns warn-coloured when it doesn't fit.
 *
 * Dragging a card off it and onto the hours is how a card gets a time, and
 * dragging a block back onto it takes the time away.
 */
export function SometimeShelf({
  lane,
  date,
  items,
  timed,
  anchors,
  expanded,
  onExpand,
  actions,
  onAdd,
  isToday,
  label,
  style,
}: {
  lane: Lane;
  date: string;
  /** In Compare the shelf also names whose it is. */
  label?: React.ReactNode;
  /** This day's loose cards, in drag order. */
  items: TripItem[];
  /** This day's timed cards, for what's left of the day. */
  timed: TripItem[];
  anchors: Anchor[];
  /** Every shelf opens and closes together: they share one grid row. */
  expanded: boolean;
  onExpand: (next: boolean) => void;
  actions: CardActions;
  onAdd: (lane: Lane, date: string) => void;
  isToday: boolean;
  style?: React.CSSProperties;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: shelfId(lane, date) });
  const shown = expanded ? items : items.slice(0, SHELF_LIMIT);
  const hidden = items.length - shown.length;

  return (
    <div
      ref={setNodeRef}
      data-drop-zone=""
      style={{
        ...style,
        backgroundColor: `color-mix(in srgb, ${LANES[lane].tint} 55%, var(--color-background))`,
      }}
      className={cn(
        "group/shelf flex min-w-0 flex-col border-r border-b border-border px-2.5 pt-1.5 pb-2 transition-shadow",
        isOver && "ring-2 ring-primary ring-inset",
        isToday && "shadow-[inset_3px_0_0_var(--color-primary)]",
      )}
    >
      <ShelfHeader
        lane={lane}
        date={date}
        label={label}
        items={items}
        timed={timed}
        anchors={anchors}
        onAdd={onAdd}
      />

      <SortableContext
        items={shown.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <ol className="mt-1 space-y-1">
          {shown.map((item) => (
            <ShelfChip key={item.id} item={item} actions={actions} />
          ))}
        </ol>
      </SortableContext>

      {items.length === 0 && (
        <p className="font-garamond text-sm text-muted-foreground/70 italic">
          Nothing loose
        </p>
      )}

      {(hidden > 0 || (expanded && items.length > SHELF_LIMIT)) && (
        <button
          type="button"
          onClick={() => onExpand(!expanded)}
          className="mt-1 self-start rounded-sm font-mono text-[0.6rem] text-muted-foreground tabular-nums slashed-zero hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
        >
          {hidden > 0 ? `+${hidden} more` : "Show fewer"}
        </button>
      )}
    </div>
  );
}

/** The shelf's name, whether its cards still fit the day, and its add button. */
function ShelfHeader({
  lane,
  date,
  label,
  items,
  timed,
  anchors,
  onAdd,
}: {
  lane: Lane;
  date: string;
  label?: React.ReactNode;
  items: TripItem[];
  timed: TripItem[];
  anchors: Anchor[];
  onAdd: (lane: Lane, date: string) => void;
}) {
  const need = items.reduce((sum, i) => sum + itemLength(i), 0);
  const free = freeMinutes(timed, anchors);
  const tight = need > free;

  return (
    <div className="flex items-center gap-2">
      <p className="min-w-0 truncate font-garamond text-sm text-muted-foreground italic">
        {label ?? "Sometime"}
      </p>
      {items.length > 0 && (
        <p
          title={`How long the cards without a time need, against what's left of ${toTime(WAKING.start)}–${toTime(WAKING.end)} once the timed cards, trains and flights are in`}
          className={cn(
            "ml-auto font-mono text-[0.6rem] whitespace-nowrap tabular-nums slashed-zero",
            tight ? "text-warn" : "text-muted-foreground",
          )}
        >
          {formatDuration(need)}
          {/* Half a day's width has no room for the words; the title has them. */}
          {!label && " to fit"}
          {tight && `, ${formatDuration(free)} free`}
        </p>
      )}
      <button
        type="button"
        onClick={() => onAdd(lane, date)}
        aria-label={`Add to ${LANES[lane].label} with no time yet`}
        title="Add a card with no time yet"
        className={cn(
          "flex h-5 w-5 flex-none items-center justify-center rounded-sm text-muted-foreground opacity-0 transition hover:text-primary focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring group-hover/shelf:opacity-100 pointer-coarse:h-9 pointer-coarse:w-9 pointer-coarse:opacity-100",
          items.length === 0 && "ml-auto",
        )}
      >
        <Plus className="h-3 w-3" strokeWidth={2} />
      </button>
    </div>
  );
}

function ShelfChip({
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
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: item.pinned });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      // The whole chip picks up with a pointer; the grip is the keyboard's way
      // in. Split like this so the title can stay a real button.
      onPointerDown={listeners?.onPointerDown as React.PointerEventHandler}
      className={cn(!item.pinned && "cursor-grab active:cursor-grabbing")}
    >
      <ShelfChipFace
        item={item}
        actions={actions}
        dragging={isDragging}
        grip={
          item.pinned ? null : (
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...attributes}
              onKeyDown={listeners?.onKeyDown as React.KeyboardEventHandler}
              aria-label={`Move ${item.title}`}
              className="flex w-4 flex-none items-center justify-center rounded-sm text-muted-foreground/50 hover:text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <GripVertical className="h-3 w-3" strokeWidth={1.5} />
            </button>
          )
        }
      />
    </li>
  );
}

/** A shelf card, also drawn under the pointer while one is dragged. */
export function ShelfChipFace({
  item,
  actions,
  dragging = false,
  overlay = false,
  page = false,
  grip,
}: {
  item: TripItem;
  actions?: CardActions;
  dragging?: boolean;
  overlay?: boolean;
  /** On the phone's page, where its arrow is always shown and thumb-sized. */
  page?: boolean;
  grip?: React.ReactNode;
}) {
  const kind = kindOf(item.kind);
  // Only the ones worth stopping for: "closed Sundays" matters most at exactly
  // the moment you're about to give a card a time.
  const warnings = itemWarnings(item).filter((w) => w.tone !== "info");

  const chip = (
    <article
      onKeyDown={
        actions && !overlay ? (e) => cardKeys(e, item, actions) : undefined
      }
      style={kind.blockout ? bandStyle(kind.color) : undefined}
      className={cn(
        "group/chip flex h-full items-stretch overflow-hidden",
        page ? "min-h-9" : "min-h-7",
        kind.blockout
          ? "rounded-sm"
          : "rounded-md border border-border bg-card",
        overlay && "shadow-lg ring-1 ring-primary/30",
        dragging && "opacity-40",
      )}
    >
      <KindTab item={item} />
      <button
        type="button"
        onClick={() => actions?.onEdit(item)}
        disabled={!actions}
        title={item.title}
        className="flex min-w-0 flex-1 items-center gap-1 rounded-sm px-2 text-left font-raleway text-xs text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:cursor-default"
      >
        {item.must_do && <MustDo />}
        <span
          className={cn("truncate", kind.blockout ? "italic" : "font-medium")}
        >
          {item.title}
        </span>
      </button>
      <WarnMark warnings={warnings} />
      <StatusMark status={item.booking_status} className="ml-1" />
      <span className="flex-none self-center px-1.5 font-mono text-[0.6rem] text-muted-foreground tabular-nums slashed-zero">
        {formatDuration(itemLength(item))}
      </span>
      {actions && !overlay && (
        <span
          className={cn(
            "flex flex-none items-center pr-1 transition-opacity",
            !page &&
              "opacity-0 group-focus-within/chip:opacity-100 group-hover/chip:opacity-100 pointer-coarse:opacity-100",
          )}
        >
          <LaneButton item={item} actions={actions} big={page} />
        </span>
      )}
      {grip}
    </article>
  );

  return actions && !overlay ? (
    <ItemMenu item={item} actions={actions}>
      {chip}
    </ItemMenu>
  ) : (
    chip
  );
}

/* ------------------------------------------------------------ the hours -- */

export type Slot = {
  /** The hours id (`hoursId`) of the track it would land in. */
  cell: string;
  item: TripItem;
  start: number;
  /** From `slotProblems`. Any at all and the preview turns warn-coloured. */
  problems: string[];
};

/**
 * One day, by the hour. Blocks sit at their exact minute; the lines are a
 * ruler to read against. Trains, flights and hotel times are drawn in place
 * and link to their tabs, and the evening is shaded after sunset.
 *
 * A day is one track per lane on screen. In Compare that's two — Savea's and
 * Aaron's side by side — laid over what Decided already has, so "she has the
 * shrine at ten, he has the market at ten, and we agreed on the knife shop"
 * is one look.
 */
export function HoursCell({
  date,
  range,
  tracks,
  ghosts = [],
  anchors,
  marks,
  sun,
  slot,
  dragging,
  isToday,
  actions,
  onAddAt,
  onResize,
  style,
}: {
  date: string;
  range: Range;
  /** Each lane's timed cards on this day, left to right. */
  tracks: { lane: Lane; items: TripItem[] }[];
  /** Decided's timed cards, drawn behind the tracks. Compare only. */
  ghosts?: TripItem[];
  anchors: Anchor[];
  marks: Mark[];
  sun: Sun;
  /** Where the card being dragged would land, when it's over this day. */
  slot: Slot | null;
  /** True while anything is being dragged, anywhere. */
  dragging: boolean;
  isToday: boolean;
  actions: CardActions;
  onAddAt: (lane: Lane, date: string, time: string) => void;
  onResize: (item: TripItem, minutes: number) => void;
  style?: React.CSSProperties;
}) {
  const at = (minute: number) => `${percentAt(minute, range)}%`;
  const split = tracks.length > 1;
  const width = 100 / tracks.length;
  // Each track's tint runs the full height, padding included.
  const background = tracks
    .map((t, i) => `${LANES[t.lane].tint} ${i * width}% ${(i + 1) * width}%`)
    .join(", ");

  return (
    <div
      style={{
        ...style,
        backgroundImage: `linear-gradient(to right, ${background})`,
      }}
      className={cn(
        "relative min-w-0 border-r border-border py-2",
        isToday && "shadow-[inset_3px_0_0_var(--color-primary)]",
      )}
    >
      <div className="relative h-full">
        {sun.rise > range.start && <Dark from={null} to={at(sun.rise)} />}
        {sun.set < range.end && <Dark from={at(sun.set)} to={null} />}

        {marks.map((mark) => (
          <MarkLine key={mark.key} mark={mark} top={at(mark.at)} />
        ))}

        {/* With two tracks a train belongs to neither, so it runs under both
            rather than taking a share of one. */}
        {split &&
          anchors.map((anchor) => {
            const start = anchor.start ?? range.start;
            const end = Math.min(anchor.end ?? range.end, range.end);
            return (
              <AnchorBlock
                key={anchor.key}
                anchor={anchor}
                style={{
                  top: at(start),
                  height: `${percentAt(end, range) - percentAt(start, range)}%`,
                  left: "0.25rem",
                  right: "0.25rem",
                }}
              />
            );
          })}

        {ghosts.map((item) => (
          <Ghost key={item.id} item={item} range={range} />
        ))}

        {tracks.map((track, i) => (
          <HoursTrack
            key={track.lane}
            lane={track.lane}
            date={date}
            range={range}
            items={track.items}
            // One track keeps trains in its own side-by-side layout.
            anchors={split ? [] : anchors}
            slot={slot?.cell === hoursId(track.lane, date) ? slot : null}
            dragging={dragging}
            divided={i > 0}
            actions={actions}
            onAddAt={onAddAt}
            onResize={onResize}
            style={{ left: `${i * width}%`, width: `${width}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/** One lane's column of hours within a day: its own drop target and ruler box. */
function HoursTrack({
  lane,
  date,
  range,
  items,
  anchors,
  slot,
  dragging,
  divided,
  actions,
  onAddAt,
  onResize,
  style,
}: {
  lane: Lane;
  date: string;
  range: Range;
  items: TripItem[];
  anchors: Anchor[];
  slot: Slot | null;
  dragging: boolean;
  /** A hairline from the track to its left. */
  divided: boolean;
  actions: CardActions;
  onAddAt: (lane: Lane, date: string, time: string) => void;
  onResize: (item: TripItem, minutes: number) => void;
  style: React.CSSProperties;
}) {
  const id = hoursId(lane, date);
  const { setNodeRef, isOver } = useDroppable({ id });
  const [hover, setHover] = useState<number | null>(null);

  const at = (minute: number) => `${percentAt(minute, range)}%`;
  const { placed, clashing } = placeTrack(items, anchors, range);

  function trackHover(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || dragging) return;
    // Over a card or a train, there's nothing to add.
    if ((e.target as HTMLElement).closest("[data-hours-solid]")) {
      setHover(null);
      return;
    }
    const box = e.currentTarget.getBoundingClientRect();
    const minute =
      range.start +
      ((e.clientY - box.top) / box.height) * (range.end - range.start);
    const next = Math.max(
      range.start,
      Math.min(Math.floor(minute / 30) * 30, range.end - 30),
    );
    setHover((prev) => (prev === next ? prev : next));
  }

  return (
    <div
      ref={setNodeRef}
      // The board's collision check finds the track under the pointer by this.
      data-hours-cell={id}
      style={style}
      // Reaches back over the day's padding, so a drop at the very top or
      // bottom still lands on a track.
      className={cn(
        "absolute -top-2 -bottom-2 py-2 transition-shadow",
        divided && "border-l border-border/70",
        isOver && "ring-2 ring-primary ring-inset",
      )}
    >
      {/* The box every minute in this track is measured against. */}
      <div
        data-hours={id}
        onPointerMove={trackHover}
        onPointerLeave={() => setHover(null)}
        className="relative h-full"
      >
        {hover !== null && !dragging && (
          <button
            type="button"
            onClick={() => onAddAt(lane, date, toTime(hover))}
            style={{
              top: at(hover),
              height: `${percentAt(Math.min(hover + 60, range.end), range) - percentAt(hover, range)}%`,
            }}
            // Mouse only, and it follows the pointer: a keyboard adds from the
            // shelf, then sets the time in the form.
            tabIndex={-1}
            aria-hidden="true"
            className="absolute inset-x-1.5 z-1 flex items-start rounded-md bg-primary/5 px-1.5 py-0.5 font-mono text-[0.6rem] text-primary/80 tabular-nums slashed-zero"
          >
            + {toTime(hover)}
          </button>
        )}

        {slot && <Shut item={slot.item} range={range} />}

        {placed.map((span) =>
          "anchor" in span ? (
            <AnchorBlock
              key={span.key}
              anchor={span.anchor}
              style={{
                top: at(span.start),
                height: `${percentAt(Math.min(span.end, range.end), range) - percentAt(span.start, range)}%`,
                ...across(span.column, span.columns),
              }}
            />
          ) : (
            <HoursBlock
              key={span.key}
              item={span.item}
              start={span.start}
              range={range}
              clash={clashing.has(span.item.id)}
              actions={actions}
              onResize={onResize}
              style={across(span.column, span.columns)}
            />
          ),
        )}

        {slot && (
          <div
            aria-hidden="true"
            style={{
              top: at(slot.start),
              height: `${percentAt(Math.min(slot.start + itemLength(slot.item), range.end), range) - percentAt(slot.start, range)}%`,
            }}
            className={cn(
              "pointer-events-none absolute inset-x-1.5 z-4 rounded-md border-2 border-dashed",
              slot.problems.length > 0
                ? "border-warn bg-warn/10"
                : "border-primary bg-primary/10",
            )}
          />
        )}
      </div>
    </div>
  );
}

/**
 * A card Decided already has, under both drafts in Compare: a solid slab of
 * Decided's green, the floor the two tracks are laid over. It was a dashed
 * outline first, meant to stay quiet, but dashed is how this board says "not
 * settled" — a route gap, an unsorted tab, a booking still to make — so the
 * one thing you'd both agreed on read as the most up in the air.
 *
 * It never takes a click: the tracks on top are where the work happens.
 */
function Ghost({ item, range }: { item: TripItem; range: Range }) {
  const start = itemStart(item)!;
  const end = Math.min(start + itemLength(item), range.end);
  const kind = kindOf(item.kind);
  return (
    <div
      aria-hidden="true"
      style={{
        top: `${percentAt(start, range)}%`,
        height: `${percentAt(end, range) - percentAt(start, range)}%`,
        ...(kind.blockout && {
          backgroundImage: `repeating-linear-gradient(135deg, transparent 0 5px, color-mix(in srgb, var(--color-primary) 14%, transparent) 5px 6px)`,
        }),
      }}
      className="pointer-events-none absolute inset-x-1 z-2 flex overflow-hidden rounded-md border border-primary/45 bg-primary/16"
    >
      <KindTab item={item} />
      <p className="flex min-w-0 flex-1 items-baseline gap-1.5 px-1.5 pt-0.5 leading-snug">
        <span className="flex-none font-mono text-[0.6rem] text-foreground/75 tabular-nums slashed-zero">
          {toTime(start)}
        </span>
        <span
          className={cn(
            "truncate font-raleway text-[0.7rem] text-foreground",
            kind.blockout ? "italic" : "font-medium",
          )}
        >
          {item.title}
        </span>
      </p>
      {!kind.blockout && (
        <StatusMark
          status={item.booking_status}
          className="mt-1 mr-1.5 self-start"
        />
      )}
    </div>
  );
}

/**
 * A track's cards and trains, laid out. They share the width when they share
 * minutes, so a card booked over a train is drawn beside it rather than on
 * top of it; cards that overlap each other are the clashes.
 */
function placeTrack(items: TripItem[], anchors: Anchor[], range: Range) {
  const clashing = new Set(
    overlaps(items).flatMap(({ first, second }) => [first.id, second.id]),
  );
  const placed = placeSpans([
    ...items.map((item) => {
      const start = itemStart(item)!;
      return { key: item.id, start, end: start + itemLength(item), item };
    }),
    ...anchors.map((anchor) => ({
      key: anchor.key,
      start: anchor.start ?? range.start,
      end: anchor.end ?? range.end,
      anchor,
    })),
  ]);
  return { placed, clashing };
}

/** Horizontal placement for a span sharing its minutes with `columns - 1` others. */
function across(column: number, columns: number): React.CSSProperties {
  return {
    left: `calc(${column} * (100% - 0.75rem) / ${columns} + 0.375rem)`,
    width: `calc((100% - 0.75rem) / ${columns} - ${columns > 1 ? 2 : 0}px)`,
  };
}

/**
 * When the place on the card being dragged is shut: before it opens and after
 * it closes, hatched, on the track the card is over. Only while it's being
 * dragged — a board that drew every card's hours all the time would be
 * stripes — and it's the same answer the badge gives in words.
 */
function Shut({ item, range }: { item: TripItem; range: Range }) {
  const hours = openHours(item);
  if (!hours) return null;
  const bands: [number, number][] = [];
  if (hours.opens !== null && hours.opens > range.start) {
    bands.push([range.start, Math.min(hours.opens, range.end)]);
  }
  // A close past midnight is beyond the bottom of the ruler, so nothing to draw.
  if (hours.closes !== null && hours.closes < range.end) {
    bands.push([Math.max(hours.closes, range.start), range.end]);
  }

  return bands.map(([from, to]) => (
    <div
      key={from}
      aria-hidden="true"
      style={{
        top: `${percentAt(from, range)}%`,
        height: `${percentAt(to, range) - percentAt(from, range)}%`,
        backgroundImage: `repeating-linear-gradient(135deg, transparent 0 4px, color-mix(in srgb, var(--color-warn) 12%, transparent) 4px 5px)`,
      }}
      className="pointer-events-none absolute inset-x-0 z-1"
    />
  ));
}

/** After sunset, or before sunrise when the ruler starts that early. */
function Dark({ from, to }: { from: string | null; to: string | null }) {
  return (
    <div
      aria-hidden="true"
      style={{
        top: from ?? undefined,
        bottom: to ? `calc(100% - ${to})` : undefined,
      }}
      className={cn(
        "pointer-events-none absolute inset-x-0 bg-foreground/5",
        from === null ? "-top-2 border-b" : "-bottom-2 border-t",
        "border-dashed border-foreground/15",
      )}
    />
  );
}

function HoursBlock({
  item,
  start,
  range,
  clash,
  actions,
  onResize,
  style,
}: {
  item: TripItem;
  start: number;
  range: Range;
  clash: boolean;
  actions: CardActions;
  onResize: (item: TripItem, minutes: number) => void;
  style: React.CSSProperties;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } =
    useDraggable({ id: item.id, disabled: item.pinned });
  // The length while its bottom edge is being dragged, before it's saved.
  const [stretch, setStretch] = useState<number | null>(null);
  const length = stretch ?? itemLength(item);
  const end = Math.min(start + length, range.end);

  function beginResize(e: React.PointerEvent<HTMLSpanElement>) {
    // Not a drag of the whole block.
    e.stopPropagation();
    e.preventDefault();
    const handle = e.currentTarget;
    const column = handle.closest<HTMLElement>("[data-hours]");
    if (!column) return;
    const perMinute =
      column.getBoundingClientRect().height / (range.end - range.start);
    const from = e.clientY;
    const original = itemLength(item);
    let latest = original;

    handle.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      latest = Math.max(
        15,
        Math.round((original + (ev.clientY - from) / perMinute) / 15) * 15,
      );
      setStretch(latest);
    };
    const finish = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", finish);
      setStretch(null);
      if (latest !== original) onResize(item, latest);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  }

  return (
    <div
      ref={setNodeRef}
      data-hours-solid=""
      onPointerDown={listeners?.onPointerDown as React.PointerEventHandler}
      style={{
        ...style,
        top: `${percentAt(start, range)}%`,
        height: `${percentAt(end, range) - percentAt(start, range)}%`,
      }}
      className={cn(
        "absolute z-3",
        !item.pinned && "cursor-grab active:cursor-grabbing",
      )}
    >
      <HoursBlockFace
        item={item}
        start={start}
        length={length}
        clash={clash}
        dragging={isDragging}
        actions={actions}
        grip={
          item.pinned ? null : (
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...attributes}
              onKeyDown={listeners?.onKeyDown as React.KeyboardEventHandler}
              aria-label={`Move ${item.title}`}
              className="flex h-4 w-4 items-center justify-center rounded-sm bg-card/80 text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
            >
              <GripVertical className="h-3 w-3" strokeWidth={1.5} />
            </button>
          )
        }
      />
      {!item.pinned && (
        <span
          onPointerDown={beginResize}
          aria-hidden="true"
          title="Drag to change how long"
          className="absolute inset-x-2 -bottom-0.5 h-2 cursor-ns-resize rounded-full after:absolute after:inset-x-1/3 after:top-1/2 after:h-0.5 after:-translate-y-1/2 after:rounded-full after:bg-primary/60 after:opacity-0 hover:after:opacity-100"
        />
      )}
    </div>
  );
}

/**
 * A card on the hours, also drawn under the pointer while one is dragged.
 * How much it says depends on how long it is: a half-hour block has room for
 * its title, an afternoon has room for everything.
 */
export function HoursBlockFace({
  item,
  start,
  length,
  clash = false,
  dragging = false,
  overlay = false,
  page = false,
  actions,
  grip,
}: {
  item: TripItem;
  start: number;
  length: number;
  clash?: boolean;
  dragging?: boolean;
  overlay?: boolean;
  /** On the phone's page, where its arrow is always shown and thumb-sized. */
  page?: boolean;
  actions?: CardActions;
  grip?: React.ReactNode;
}) {
  const kind = kindOf(item.kind);
  const board = useBoardData();
  const size = length <= 45 ? "short" : length < 90 ? "medium" : "long";
  const detail =
    kind.blockout && size === "long" ? blockoutDetail(item, board).text : null;
  // The card's own trouble, on the card: the day header lists it too, but a
  // "closed Tuesdays" there doesn't point at the block it's about.
  const warnings = itemWarnings(item).filter((w) => w.tone !== "info");
  const status = kind.blockout ? null : item.booking_status;

  const block = (
    <article
      onKeyDown={
        actions && !overlay ? (e) => cardKeys(e, item, actions) : undefined
      }
      style={
        kind.blockout ? bandStyle(kind.color, "var(--color-card)") : undefined
      }
      title={`${toTime(start)}–${toTime(start + length)} ${item.title}`}
      className={cn(
        "group/block relative flex h-full overflow-hidden",
        kind.blockout
          ? "rounded-sm"
          : "rounded-md border border-border bg-card",
        clash && "border-warn ring-1 ring-warn ring-inset",
        overlay && "shadow-lg ring-1 ring-primary/30",
        dragging && "opacity-40",
      )}
    >
      <KindTab item={item} />
      {/* A column that wraps: a line that doesn't fit the block's height
          moves into a second column, off to the right and clipped, instead
          of being sliced through the middle at the bottom edge. The gap
          keeps that column clear of the padding, where it would show. The
          lines run in order of what's worth losing last. */}
      <div
        className={cn(
          "min-w-0 flex-1 px-1.5",
          // Clear of the arrow, which is always there on a phone.
          page && actions && "pr-9",
          size === "short"
            ? "flex items-center gap-1.5"
            : "flex h-full flex-col flex-wrap content-start gap-x-6 overflow-hidden pt-0.5 *:w-full",
        )}
      >
        {size === "short" ? (
          <>
            <span className="flex-none font-mono text-[0.6rem] text-muted-foreground tabular-nums slashed-zero">
              {toTime(start)}
            </span>
            <WarnMark warnings={warnings} />
          </>
        ) : (
          <p className="flex min-w-0 items-center gap-1 font-mono text-[0.6rem] leading-tight text-muted-foreground tabular-nums slashed-zero">
            <span className="text-foreground">{toTime(start)}</span>
            <span className="truncate">
              {formatDuration(length)}
              {kind.blockout && ` ${kind.label}`}
            </span>
            {/* A long block says both in words further down instead. */}
            {size === "medium" && <WarnMark warnings={warnings} />}
            {size === "medium" && status && <StatusMark status={status} />}
          </p>
        )}
        <button
          type="button"
          onClick={() => actions?.onEdit(item)}
          disabled={!actions}
          className={cn(
            "block min-w-0 truncate rounded-sm text-left font-raleway text-xs leading-snug text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:cursor-default",
            size === "short" ? "flex-1" : "w-full",
            kind.blockout ? "italic" : "font-medium",
          )}
        >
          {item.must_do && <MustDo />}
          {item.title}
        </button>
        {size === "short" && status && <StatusMark status={status} />}
        {size === "long" && warnings.length > 0 && (
          <p
            className={cn(
              "flex min-w-0 items-center gap-1 font-raleway text-[0.65rem] leading-snug",
              TONE_INK[worstTone(warnings)],
            )}
          >
            <TriangleAlert
              className="h-2.5 w-2.5 flex-none"
              strokeWidth={2}
              aria-hidden="true"
            />
            <span className="truncate">
              {warnings.map((w) => w.text).join(". ")}
            </span>
          </p>
        )}
        {size === "long" &&
          status &&
          (item.cost_amount !== null || status !== "idea") && (
            <p className="flex min-w-0 gap-1.5 truncate font-mono text-[0.55rem] text-muted-foreground tabular-nums slashed-zero">
              {item.cost_amount !== null && <span>{formatCost(item)}</span>}
              <StatusLabel status={status} />
            </p>
          )}
        {size === "long" && item.title_ja && (
          <p className="truncate font-jp text-[0.65rem] leading-snug text-muted-foreground">
            {item.title_ja}
          </p>
        )}
        {detail && (
          <p className="flex items-center gap-1 truncate font-mono text-[0.55rem] text-muted-foreground">
            {kind.links === "stay" && (
              <BedDouble className="h-2.5 w-2.5 flex-none" strokeWidth={2} />
            )}
            {detail}
          </p>
        )}
      </div>

      {actions && !overlay && (
        <span
          className={cn(
            "absolute top-0.5 right-0.5 flex gap-0.5 transition-opacity",
            !page &&
              "opacity-0 group-focus-within/block:opacity-100 group-hover/block:opacity-100 pointer-coarse:opacity-100",
          )}
        >
          <LaneButton item={item} actions={actions} big={page} />
          {grip}
        </span>
      )}
    </article>
  );

  return actions && !overlay ? (
    <ItemMenu item={item} actions={actions}>
      {block}
    </ItemMenu>
  ) : (
    block
  );
}

function AnchorBlock({
  anchor,
  style,
}: {
  anchor: Anchor;
  style: React.CSSProperties;
}) {
  const Icon = anchor.kind === "flight" ? Plane : TramFront;
  const began = anchor.start !== null;
  const ends = anchor.end !== null;
  const times =
    began && ends
      ? `${toTime(anchor.start!)}–${toTime(anchor.end!)}`
      : began
        ? `from ${toTime(anchor.start!)}`
        : ends
          ? `until ${toTime(anchor.end!)}`
          : "all day";

  return (
    <Link
      href={anchor.href}
      data-hours-solid=""
      style={style}
      title={`${anchor.title}, ${times}. ${anchor.detail}`}
      // Fixed, not a card: outlined in the route's green, never dragged. A
      // side that runs off the day fades out instead of stopping at an edge.
      className={cn(
        "absolute z-2 flex flex-col overflow-hidden rounded-md border border-primary/50 bg-primary/5 px-1.5 py-0.5 text-primary transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
        !began &&
          "justify-end rounded-t-none border-t-0 mask-[linear-gradient(to_bottom,transparent,black_3rem)]",
        began &&
          !ends &&
          "rounded-b-none border-b-0 mask-[linear-gradient(to_top,transparent,black_3rem)]",
      )}
    >
      <span className="flex min-w-0 items-center gap-1 font-raleway text-xs font-semibold">
        <Icon
          className="h-3 w-3 flex-none"
          strokeWidth={2}
          aria-hidden="true"
        />
        <span className="truncate">{anchor.title}</span>
      </span>
      <span className="truncate font-mono text-[0.55rem] tabular-nums slashed-zero">
        {times} · {anchor.detail}
      </span>
    </Link>
  );
}

const MARK_ICONS = {
  "check-in": BedDouble,
  "check-out": BedDouble,
  breakfast: Coffee,
  dinner: UtensilsCrossed,
} as const;

function MarkLine({ mark, top }: { mark: Mark; top: string }) {
  const Icon = MARK_ICONS[mark.kind];
  return (
    <div
      style={{ top }}
      className="pointer-events-none absolute inset-x-0 z-1 border-t border-primary/60"
    >
      <Link
        href="/honeymoon/lodging"
        data-hours-solid=""
        className="pointer-events-auto absolute left-1.5 inline-flex max-w-[calc(100%-0.75rem)] -translate-y-1/2 items-center gap-1 rounded-sm bg-background/90 px-1 font-mono text-[0.55rem] leading-relaxed text-primary tabular-nums slashed-zero hover:underline focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Icon
          className="h-2.5 w-2.5 flex-none"
          strokeWidth={2}
          aria-hidden="true"
        />
        <span className="truncate">
          {toTime(mark.at)} {mark.label}
        </span>
      </Link>
    </div>
  );
}

/* ---------------------------------------------------------- on a phone -- */

/**
 * One lane's day by the hour, on a phone: to read and tap. Nothing is dragged,
 * as nowhere on the phone board is — a card opens its form, an empty stretch
 * of the day starts a card at that time, and the arrow agrees to it. The form
 * is where a loose card gets its time.
 *
 * It's the desk's pieces at a thumb's scale, not a second design: the same
 * shelf total, the same blocks, trains and hotel times, the same dark after
 * sunset. The ruler covers only this day, since pages don't sit side by side.
 */
export function HoursPage({
  lane,
  date,
  items,
  anchors,
  marks,
  sun,
  actions,
  onAdd,
  onAddAt,
}: {
  lane: Lane;
  date: string;
  /** The lane's cards on this day, in drag order. */
  items: TripItem[];
  anchors: Anchor[];
  marks: Mark[];
  sun: Sun;
  actions: CardActions;
  onAdd: (lane: Lane, date: string) => void;
  onAddAt: (lane: Lane, date: string, time: string) => void;
}) {
  const loose = items.filter((i) => i.start_time === null);
  const timed = items.filter((i) => i.start_time !== null);
  const range = hoursRange([
    ...timed.flatMap((item) => {
      const start = itemStart(item)!;
      return [start, Math.min(start + itemLength(item), 24 * 60)];
    }),
    ...anchors.flatMap((a) =>
      [a.start, a.end].filter((m): m is number => m !== null),
    ),
    ...marks.map((m) => m.at),
  ]);
  const at = (minute: number) => `${percentAt(minute, range)}%`;
  const { placed, clashing } = placeTrack(timed, anchors, range);

  function addAt(e: React.MouseEvent<HTMLDivElement>) {
    // A card, a train or a hotel time answers its own tap.
    if ((e.target as HTMLElement).closest("[data-hours-solid], button, a")) {
      return;
    }
    const box = e.currentTarget.getBoundingClientRect();
    const minute =
      range.start +
      ((e.clientY - box.top) / box.height) * (range.end - range.start);
    const start = Math.max(
      range.start,
      Math.min(Math.floor(minute / 30) * 30, range.end - 30),
    );
    onAddAt(lane, date, toTime(start));
  }

  return (
    <div className="space-y-3">
      <section
        aria-label="Sometime"
        style={{
          backgroundColor: `color-mix(in srgb, ${LANES[lane].tint} 55%, var(--color-background))`,
        }}
        className="rounded-xl border border-border/70 px-3 pt-2 pb-3"
      >
        <ShelfHeader
          lane={lane}
          date={date}
          items={loose}
          timed={timed}
          anchors={anchors}
          onAdd={onAdd}
        />
        {loose.length > 0 ? (
          <ol className="mt-1.5 space-y-1.5">
            {loose.map((item) => (
              <li key={item.id}>
                <ShelfChipFace item={item} actions={actions} page />
              </li>
            ))}
          </ol>
        ) : (
          <p className="font-garamond text-sm text-muted-foreground/70 italic">
            Nothing loose
          </p>
        )}
      </section>

      <p className="px-1 font-garamond text-sm text-muted-foreground italic">
        Tap a free stretch to add something then.
      </p>

      <div
        style={{
          gridTemplateRows: `${((range.end - range.start) / 30) * PAGE_HALF_HOUR_REM}rem`,
        }}
        className="grid grid-cols-[2.75rem_minmax(0,1fr)] overflow-hidden rounded-xl border border-border/70"
      >
        <HoursRuler
          range={range}
          pinned={false}
          style={{ gridRow: 1, gridColumn: 1 }}
        />
        <div
          style={{
            gridRow: 1,
            gridColumn: 2,
            backgroundColor: LANES[lane].tint,
          }}
          className="relative py-2"
        >
          <div onClick={addAt} className="relative h-full">
            {sun.rise > range.start && <Dark from={null} to={at(sun.rise)} />}
            {sun.set < range.end && <Dark from={at(sun.set)} to={null} />}

            {marks.map((mark) => (
              <MarkLine key={mark.key} mark={mark} top={at(mark.at)} />
            ))}

            {placed.map((span) => {
              const position = {
                top: at(span.start),
                height: `${percentAt(Math.min(span.end, range.end), range) - percentAt(span.start, range)}%`,
                ...across(span.column, span.columns),
              };
              return "anchor" in span ? (
                <AnchorBlock
                  key={span.key}
                  anchor={span.anchor}
                  style={position}
                />
              ) : (
                <div
                  key={span.key}
                  data-hours-solid=""
                  style={position}
                  // The whole card is the tap, not only its title.
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("button, a")) return;
                    actions.onEdit(span.item);
                  }}
                  className="absolute z-3"
                >
                  <HoursBlockFace
                    item={span.item}
                    start={span.start}
                    length={itemLength(span.item)}
                    clash={clashing.has(span.item.id)}
                    actions={actions}
                    page
                  />
                </div>
              );
            })}
          </div>
        </div>
        <HoursLines range={range} style={{ gridRow: 1, gridColumn: 2 }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- shared -- */

/** Agreeing is the point of the board, so every card keeps its arrow here too. */
function LaneButton({
  item,
  actions,
  big = false,
}: {
  item: TripItem;
  actions: CardActions;
  /** Thumb-sized, for the phone's page: still inside a half-hour card. */
  big?: boolean;
}) {
  const decided = item.lane === "decided";
  const label = decided
    ? `Send back to ${LANES[item.added_by].label}`
    : "Agreed — move it to Decided";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() =>
        actions.onMoveLane(item, decided ? item.added_by : "decided")
      }
      className={cn(
        "flex items-center justify-center border bg-card transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
        big ? "h-7 w-7 rounded-md" : "h-4 w-4 rounded-sm",
        decided
          ? "border-border text-muted-foreground hover:border-primary hover:text-primary"
          : "border-primary/60 text-primary hover:bg-primary hover:text-primary-foreground",
      )}
    >
      {decided ? (
        <ArrowDown
          className={big ? "h-4 w-4" : "h-2.5 w-2.5"}
          strokeWidth={2}
        />
      ) : (
        <ArrowUp className={big ? "h-4 w-4" : "h-2.5 w-2.5"} strokeWidth={2} />
      )}
    </button>
  );
}

/** The card's type as a 3px tab. Unsorted stays hollow, as it is everywhere. */
function KindTab({ item }: { item: TripItem }) {
  const kind = kindOf(item.kind);
  return (
    <span
      aria-hidden="true"
      className="w-[3px] flex-none"
      style={
        item.kind === "unsorted"
          ? {
              backgroundImage: `repeating-linear-gradient(to bottom, ${kind.color} 0 3px, transparent 3px 6px)`,
            }
          : { backgroundColor: kind.color }
      }
    />
  );
}

/** A blockout's hatch, the same one `BlockoutBand` draws in the list. */
function bandStyle(color: string, ground = "transparent"): React.CSSProperties {
  return {
    backgroundColor: `color-mix(in srgb, ${color} 7%, ${ground})`,
    backgroundImage: `repeating-linear-gradient(135deg, transparent 0 5px, color-mix(in srgb, ${color} 9%, transparent) 5px 6px)`,
  };
}

/** Red if anything is wrong, amber if it's only still to do. */
function worstTone(warnings: Warning[]): "warn" | "pending" {
  return warnings.some((w) => w.tone === "warn") ? "warn" : "pending";
}

/** A card's warnings as one triangle, for where there's no room for words. */
function WarnMark({ warnings }: { warnings: Warning[] }) {
  if (warnings.length === 0) return null;
  const text = warnings.map((w) => w.text).join(". ");
  return (
    <span
      title={text}
      className={cn(
        "flex flex-none items-center",
        TONE_INK[worstTone(warnings)],
      )}
    >
      <TriangleAlert className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
      <span className="sr-only">{text}</span>
    </span>
  );
}

function MustDo() {
  return (
    <Star
      className="mr-1 inline h-3 w-3 flex-none -translate-y-px fill-accent text-accent"
      strokeWidth={1.5}
      aria-label="Must do"
    />
  );
}
