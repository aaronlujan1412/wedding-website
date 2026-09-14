"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { legForDay, parseDay } from "./trip";
import type { TripItem, TripLeg } from "./types";

/** A ribbon chip is a drop target, so a card can be flung eight days away. */
export const RIBBON_PREFIX = "ribbon:";

/**
 * The whole trip at a glance.
 *
 * Twelve day columns do not fit on a screen, and a horizontal scroller alone
 * loses the shape of the trip. The ribbon keeps every day reachable — as a
 * drop target and as a jump link — while the board below shows only the leg
 * you are working on.
 */
export function DayRibbon({
  days,
  legs,
  items,
  activeLegId,
  today,
}: {
  days: string[];
  legs: TripLeg[];
  items: TripItem[];
  activeLegId: string | null;
  today: string;
}) {
  return (
    <ol className="rail-scroll flex gap-1 overflow-x-auto pb-1">
      {days.map((date) => {
        const leg = legForDay(legs, date);
        const dayItems = items.filter((i) => i.on_date === date);
        return (
          <RibbonDay
            key={date}
            date={date}
            legName={leg?.name}
            count={dayItems.length}
            booked={
              dayItems.filter(
                (i) =>
                  i.booking_status === "booked" || i.booking_status === "in_hand",
              ).length
            }
            inActiveLeg={activeLegId === null || leg?.id === activeLegId}
            isToday={date === today}
          />
        );
      })}
    </ol>
  );
}

function RibbonDay({
  date,
  legName,
  count,
  booked,
  inActiveLeg,
  isToday,
}: {
  date: string;
  legName?: string;
  count: number;
  booked: number;
  inActiveLeg: boolean;
  isToday: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${RIBBON_PREFIX}${date}` });
  const day = parseDay(date);

  return (
    <li ref={setNodeRef} className="flex-none">
      <a
        href={`#day-${date}`}
        title={`${legName ? `${legName} · ` : ""}${count} on this day`}
        className={cn(
          "flex w-[3.25rem] flex-col items-center rounded-md border px-1 py-1.5 transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          isOver
            ? "border-primary bg-secondary"
            : "border-border hover:border-primary/60",
          inActiveLeg ? "bg-paper" : "bg-transparent opacity-50",
          isToday && "ring-1 ring-primary",
        )}
      >
        <span className="font-raleway text-[0.55rem] uppercase tracking-[0.15em] text-muted-foreground">
          {day.toLocaleDateString("en-US", { weekday: "narrow" })}
        </span>
        <span className="font-mono text-sm leading-none text-foreground tabular-nums slashed-zero">
          {day.getDate()}
        </span>
        {/* Filled pips are booked, hollow ones are still just plans. */}
        <span className="mt-1 flex h-1.5 items-center gap-px" aria-hidden="true">
          {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 w-1 rounded-full",
                i < booked ? "bg-seal" : "bg-border",
              )}
            />
          ))}
        </span>
      </a>
    </li>
  );
}
