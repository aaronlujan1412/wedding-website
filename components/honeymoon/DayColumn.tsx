"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ArrowDownWideNarrow, NotebookPen, Plus, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { SortableItemCard } from "./ItemCard";
import {
  PACE_CEILING,
  PACE_TARGET,
  cashYen,
  dayWarnings,
  formatClock,
  formatDuration,
  formatYen,
  layoutDay,
  legForDay,
  paceMinutes,
  parseDay,
  sumYen,
  yenToUsd,
} from "./trip";
import type { TripDay, TripItem, TripLeg } from "./types";

type Props = {
  date: string;
  note?: TripDay;
  legs: TripLeg[];
  items: TripItem[];
  isToday: boolean;
  onEdit: (item: TripItem) => void;
  onNudge: (item: TripItem, delta: number) => void;
  onAdd: (date: string) => void;
  onEditNote: (date: string) => void;
  onSortByTime: (date: string) => void;
};

/**
 * One page of the book.
 *
 * The column is a clock, not a stack: timed cards print their hour in the
 * gutter, loose cards sit between them, and wherever real open time is left the
 * rail says how much. Finding the empty Tuesday afternoon is the whole point.
 */
export function DayColumn({
  date,
  note,
  legs,
  items,
  isToday,
  onEdit,
  onNudge,
  onAdd,
  onEditNote,
  onSortByTime,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: date });
  const leg = legForDay(legs, date);
  const rows = layoutDay(items);
  const warnings = dayWarnings(date, items);
  const pace = paceMinutes(items);
  const spend = sumYen(items);
  const cash = cashYen(items);

  const day = parseDay(date);
  const weekday = day.toLocaleDateString("en-US", { weekday: "short" });
  const monthDay = day.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <section
      id={`day-${date}`}
      ref={setNodeRef}
      className={cn(
        "flex w-[19rem] flex-none flex-col rounded-lg border border-border bg-paper transition-colors",
        isOver && "border-primary bg-secondary",
        isToday && "ring-1 ring-primary",
      )}
    >
      <header className="border-b border-border px-3 py-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-mono text-xs tracking-wider text-foreground tabular-nums slashed-zero">
            <span className="uppercase text-muted-foreground">{weekday}</span>{" "}
            {monthDay}
          </p>
          <div className="flex items-center gap-1">
            <IconButton label="Day note" onClick={() => onEditNote(date)}>
              <NotebookPen className="h-3.5 w-3.5" strokeWidth={1.5} />
            </IconButton>
            <IconButton
              label="Sort this day by time"
              onClick={() => onSortByTime(date)}
            >
              <ArrowDownWideNarrow className="h-3.5 w-3.5" strokeWidth={1.5} />
            </IconButton>
          </div>
        </div>

        <p className="mt-0.5 font-garamond text-lg leading-tight text-foreground">
          {note?.title || leg?.name || "Unplaced day"}
          {leg?.name_ja && (
            <span className="ml-1.5 font-jp text-xs text-muted-foreground">
              {leg.name_ja}
            </span>
          )}
        </p>

        {note?.note && (
          <p className="mt-1 font-garamond text-sm leading-snug text-muted-foreground">
            {note.note}
          </p>
        )}

        <PaceBar minutes={pace} />

        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 font-mono text-[0.6rem] tracking-wide text-muted-foreground tabular-nums slashed-zero">
          <span>{items.length === 0 ? "empty" : formatDuration(pace)}</span>
          {spend > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                {formatYen(spend)} / {yenToUsd(spend)}
              </span>
            </>
          )}
          {cash > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span title="Cash you'll want on you — anything not already ticketed">
                {formatYen(cash)} cash
              </span>
            </>
          )}
        </p>

        {warnings.length > 0 && (
          <ul className="mt-2 space-y-1">
            {warnings.map((w, i) => (
              <li
                key={`${w.text}-${i}`}
                className={cn(
                  "flex items-start gap-1 font-raleway text-[0.65rem] leading-snug",
                  w.tone === "warn" ? "text-kind-food" : "text-muted-foreground",
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
      </header>

      <div className="rail-scroll min-h-[7rem] flex-1 overflow-y-auto px-3 py-3">
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <ol>
            {rows.map((row) =>
              row.kind === "gap" ? (
                <li key={row.key} className="grid grid-cols-[2.5rem_1fr]">
                  <span aria-hidden="true" />
                  <span className="flex items-center gap-2 border-l border-dashed border-border py-1.5 pl-2 font-mono text-[0.6rem] tracking-wide text-muted-foreground tabular-nums slashed-zero">
                    <span className="h-px flex-none w-3 bg-border" />
                    {formatDuration(row.minutes)} open
                  </span>
                </li>
              ) : (
                <li key={row.item.id} className="grid grid-cols-[2.5rem_1fr]">
                  <span className="pt-2 pr-2 text-right font-mono text-[0.6rem] leading-none text-muted-foreground tabular-nums slashed-zero">
                    {row.item.start_time ? (
                      formatClock(row.item.start_time)
                    ) : (
                      <span aria-hidden="true">·</span>
                    )}
                  </span>
                  <div className="border-l border-border pb-2 pl-2">
                    <SortableItemCard
                      item={row.item}
                      actions={{ onEdit, onNudge }}
                    />
                  </div>
                </li>
              ),
            )}
          </ol>
        </SortableContext>

        {items.length === 0 && (
          <p className="rounded-md border border-dashed border-border px-3 py-6 text-center font-garamond text-sm text-muted-foreground">
            Nothing here yet. Drag something over, or add one.
          </p>
        )}
      </div>

      <footer className="border-t border-border px-3 py-2">
        <button
          type="button"
          onClick={() => onAdd(date)}
          className="flex w-full items-center justify-center gap-1 rounded-sm py-1 font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Plus className="h-3 w-3" strokeWidth={2} />
          Add to this day
        </button>
      </footer>
    </section>
  );
}

/** How full the day is. A honeymoon that reads like a conference agenda is a bug. */
function PaceBar({ minutes }: { minutes: number }) {
  const fill = Math.min(minutes / PACE_CEILING, 1) * 100;
  const tone =
    minutes > PACE_CEILING
      ? "bg-kind-food"
      : minutes > PACE_TARGET
        ? "bg-kind-workshop"
        : "bg-primary";

  return (
    <div
      className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border/60"
      role="img"
      aria-label={`${formatDuration(minutes)} of activity planned`}
    >
      <div
        className={cn("h-full rounded-full transition-[width]", tone)}
        style={{ width: `${fill}%` }}
      />
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
    >
      {children}
    </button>
  );
}
