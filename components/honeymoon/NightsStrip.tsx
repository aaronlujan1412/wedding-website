"use client";

import { BedDouble, Check, Plane, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatNights,
  isStayAdopted,
  nightCount,
  sleepsOn,
  stackStays,
  staysIn,
  type Night,
} from "./stays";
import { LANES, PLANNERS, addDays, legForDay, legsIn, parseDay } from "./trip";
import type { Lane, TripLeg, TripStay } from "./types";

/** The lane-name column. Narrower on a phone, where every night counts. */
const LABEL_WIDTH = "var(--strip-label)";
const NIGHT_WIDTH = "2.75rem";

/**
 * Every night of the trip, left to right, with where each lane sleeps.
 *
 * The one loud thing on the tab: a night in the agreed trip with no bed and no
 * flight is drawn in seal red. Everything else — the stays, the route, the
 * suggestions stacked under their lane — stays quiet around it, so a hole is
 * the first thing you see.
 *
 * Suggestions in a planner's lane can overlap, so each lane stacks into as
 * many rows as its most contested night needs. Bars link down to the stay's
 * details rather than opening a form: on a phone the strip is for looking.
 */
export function NightsStrip({
  columns,
  nights,
  legs,
  stays,
  tonight,
  onCreate,
}: {
  columns: string[];
  nights: Night[];
  legs: TripLeg[];
  stays: TripStay[];
  tonight: string;
  onCreate: (lane: Lane, from: string, to: string) => void;
}) {
  const byDate = new Map(nights.map((n) => [n.date, n]));
  const decidedLegs = legsIn(legs, "decided");
  const ideaLanes = (["savea", "aaron"] as const).map((lane) => ({
    lane,
    rows: stackStays(staysIn(stays, lane)),
  }));

  // Row 1 dates, row 2 the agreed route, row 3 Decided, then each idea lane's
  // stacked rows.
  let nextRow = 4;
  const placedLanes = ideaLanes.map(({ lane, rows }) => {
    const count = Math.max(rows.length, 1);
    const start = nextRow;
    nextRow += count;
    return { lane, rows: rows.length ? rows : [[]], start, count };
  });

  const place = (row: number, column: number, span = 1) => ({
    gridRow: row,
    gridColumn: `${column + 2} / span ${span}`,
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <div
        className="grid [--strip-label:8.5rem] max-sm:[--strip-label:5.75rem]"
        style={{
          gridTemplateColumns: `${LABEL_WIDTH} repeat(${columns.length}, minmax(${NIGHT_WIDTH}, 1fr))`,
          minWidth: `calc(${LABEL_WIDTH} + ${columns.length} * ${NIGHT_WIDTH})`,
        }}
      >
        {/* Painted first so everything else sits on top: each idea lane's
            tint, then a hairline per night to read the dates down by. */}
        {placedLanes.map(({ lane, start, count }) => (
          <div
            key={`tint-${lane}`}
            aria-hidden="true"
            className="border-t border-border"
            style={{
              gridRow: `${start} / span ${count}`,
              gridColumn: "1 / -1",
              backgroundColor: LANES[lane].tint,
            }}
          />
        ))}
        <div
          aria-hidden="true"
          className="border-t border-border"
          style={{ gridRow: 3, gridColumn: "1 / -1" }}
        />
        {columns.map((date, i) =>
          i === 0 ? null : (
            <div
              key={`line-${date}`}
              aria-hidden="true"
              className="pointer-events-none border-l border-border/40"
              style={{ gridRow: `2 / ${nextRow}`, gridColumn: i + 2 }}
            />
          ),
        )}

        <StickyLabel row={1} />
        {columns.map((date, i) => {
          const day = parseDay(date);
          const newMonth =
            i === 0 || parseDay(columns[i - 1]).getMonth() !== day.getMonth();
          const isTonight = date === tonight;
          return (
            <div
              key={date}
              style={place(1, i)}
              className={cn(
                "flex flex-col items-center justify-end pt-2 pb-1.5",
                i > 0 && "border-l border-border/40",
              )}
            >
              <span className="h-3 font-raleway text-[0.55rem] uppercase tracking-[0.15em] text-primary">
                {newMonth &&
                  day.toLocaleDateString("en-US", { month: "short" })}
              </span>
              <span className="font-raleway text-[0.55rem] uppercase text-muted-foreground">
                {day.toLocaleDateString("en-US", { weekday: "narrow" })}
              </span>
              <span
                className={cn(
                  "font-mono text-xs tabular-nums slashed-zero",
                  isTonight
                    ? "rounded-sm bg-primary px-1 font-semibold text-primary-foreground"
                    : "text-foreground",
                )}
                title={isTonight ? "Tonight" : undefined}
              >
                {day.getDate()}
              </span>
            </div>
          );
        })}

        <StickyLabel row={2}>
          <span className="font-raleway text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
            Route
          </span>
        </StickyLabel>
        {runs(columns, (date) => legForDay(decidedLegs, date)?.id ?? null).map(
          (run) => {
            const leg = decidedLegs.find((l) => l.id === run.key);
            return (
              <div
                key={`route-${run.from}`}
                style={place(2, run.column, run.span)}
                className="flex items-center overflow-hidden px-1.5 py-1"
              >
                {leg && (
                  <span
                    className="truncate font-garamond text-sm italic text-muted-foreground"
                    title={leg.name}
                  >
                    {leg.name}
                  </span>
                )}
              </div>
            );
          },
        )}

        <StickyLabel row={3} className="border-t">
          <LaneName lane="decided" />
        </StickyLabel>
        {runs(columns, (date) => {
          const night = byDate.get(date);
          if (!night) return null;
          if (night.stay) return `stay:${night.stay.id}`;
          return night.onPlane ? "plane" : "open";
        }).map((run) => {
          const at = place(3, run.column, run.span);
          const cell = "flex items-stretch px-0.5 py-1";

          if (run.key === null) {
            return <div key={`d-${run.from}`} style={at} />;
          }
          if (run.key === "plane") {
            return (
              <div key={`d-${run.from}`} style={at} className={cell}>
                <span
                  title={`On the plane · ${formatNights(run.span)}`}
                  className="flex w-full items-center justify-center rounded-md bg-muted text-muted-foreground"
                >
                  <Plane className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span className="sr-only">On the plane</span>
                </span>
              </div>
            );
          }
          if (run.key === "open") {
            return (
              <div key={`d-${run.from}`} style={at} className={cell}>
                <button
                  type="button"
                  onClick={() =>
                    onCreate("decided", run.from, addDays(run.to, 1))
                  }
                  aria-label={`No bed for ${formatNights(run.span)} from ${run.from}. Add a stay.`}
                  className="flex h-8 w-full items-center justify-center gap-1 rounded-md border border-dashed border-seal bg-seal/5 font-raleway text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-seal transition-colors hover:bg-seal/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                >
                  {run.span > 1 ? (
                    "No bed"
                  ) : (
                    <BedDouble className="h-3.5 w-3.5" strokeWidth={1.75} />
                  )}
                </button>
              </div>
            );
          }
          const stay = stays.find((s) => `stay:${s.id}` === run.key)!;
          return (
            <div key={stay.id} style={at} className={cell}>
              <StayBar stay={stay} lane="decided" />
            </div>
          );
        })}

        {placedLanes.map(({ lane, rows, start, count }) => (
          <LaneRows
            key={lane}
            lane={lane}
            rows={rows}
            start={start}
            count={count}
            columns={columns}
            stays={stays}
            place={place}
            onCreate={onCreate}
          />
        ))}
      </div>
    </div>
  );
}

function LaneRows({
  lane,
  rows,
  start,
  count,
  columns,
  stays,
  place,
  onCreate,
}: {
  lane: Lane;
  rows: TripStay[][];
  start: number;
  count: number;
  columns: string[];
  stays: TripStay[];
  place: (row: number, column: number, span?: number) => React.CSSProperties;
  onCreate: (lane: Lane, from: string, to: string) => void;
}) {
  const meta = LANES[lane];

  return (
    <>
      <div
        className="sticky left-0 z-10 flex items-start border-t border-r border-border px-3 pt-3"
        style={{
          gridRow: `${start} / span ${count}`,
          gridColumn: 1,
          backgroundColor: meta.tint,
        }}
      >
        <LaneName lane={lane} />
      </div>

      {rows.map((row, r) =>
        runs(columns, (date) => {
          const stay = row.find((s) => sleepsOn(s, date));
          return stay ? stay.id : null;
        }).map((run) => {
          const at = place(start + r, run.column, run.span);
          const stay = run.key ? row.find((s) => s.id === run.key) : undefined;

          if (stay) {
            return (
              <div key={stay.id} style={at} className="flex px-0.5 py-1">
                <StayBar
                  stay={stay}
                  lane={lane}
                  adopted={isStayAdopted(stay, stays)}
                />
              </div>
            );
          }
          // Only the top row offers to start a suggestion; the rows below it
          // exist because something above overlaps.
          if (r > 0) return <div key={`${lane}-${r}-${run.from}`} style={at} />;
          return (
            <div
              key={`${lane}-${r}-${run.from}`}
              style={at}
              className="flex px-0.5 py-1"
            >
              <button
                type="button"
                onClick={() => onCreate(lane, run.from, addDays(run.to, 1))}
                aria-label={`Suggest a stay for ${meta.label}, ${formatNights(run.span)} from ${run.from}`}
                className="group/gap flex h-8 w-full items-center justify-center rounded-md border border-transparent text-transparent transition-colors pointer-coarse:text-muted-foreground/50 hover:border-dashed hover:border-border hover:text-muted-foreground focus-visible:border-dashed focus-visible:border-border focus-visible:text-muted-foreground focus-visible:outline-none"
              >
                <Plus className="h-3 w-3" strokeWidth={2} />
              </button>
            </div>
          );
        }),
      )}
    </>
  );
}

function StayBar({
  stay,
  lane,
  adopted = false,
}: {
  stay: TripStay;
  lane: Lane;
  adopted?: boolean;
}) {
  const meta = LANES[lane];
  const anchor = lane === "decided" ? `stay-${stay.id}` : `option-${stay.id}`;
  const label = [stay.name, stay.city, formatNights(nightCount(stay))]
    .filter(Boolean)
    .join(" · ");

  return (
    <a
      href={`#${anchor}`}
      title={label}
      className="flex h-8 min-w-0 flex-1 items-center gap-1.5 overflow-hidden rounded-md border bg-background/80 pr-1.5 transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
      style={{ borderColor: meta.accent }}
    >
      <span
        aria-hidden="true"
        className="h-full w-1 flex-none"
        style={{ backgroundColor: meta.accent }}
      />
      <span className="truncate font-raleway text-xs font-semibold text-foreground">
        {stay.name}
      </span>
      {stay.city && (
        <span className="truncate font-garamond text-xs text-muted-foreground">
          {stay.city}
        </span>
      )}
      {adopted && (
        <Check
          className="ml-auto h-3 w-3 flex-none text-primary"
          strokeWidth={2}
          aria-label="In Decided"
        />
      )}
    </a>
  );
}

function StickyLabel({
  row,
  className,
  children,
}: {
  row: number;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "sticky left-0 z-10 flex items-center border-r border-border bg-card px-3",
        className,
      )}
      style={{ gridRow: row, gridColumn: 1 }}
    >
      {children}
    </div>
  );
}

function LaneName({ lane }: { lane: Lane }) {
  return (
    <span
      className="font-raleway text-[0.65rem] font-semibold uppercase tracking-[0.15em]"
      style={{ color: LANES[lane].accent }}
    >
      <span className="max-sm:hidden">{LANES[lane].label}</span>
      {/* "Savea's ideas" wraps in the narrow phone column; the name alone doesn't. */}
      <span className="sm:hidden">
        {LANES[lane].planner ? PLANNERS[LANES[lane].planner].label : "Decided"}
      </span>
    </span>
  );
}

/** Consecutive columns sharing a key, merged into one placed run. */
function runs(
  columns: string[],
  keyOf: (date: string) => string | null,
): {
  key: string | null;
  from: string;
  to: string;
  column: number;
  span: number;
}[] {
  const out: ReturnType<typeof runs> = [];
  columns.forEach((date, i) => {
    const key = keyOf(date);
    const last = out.at(-1);
    if (last && last.key === key && last.column + last.span === i) {
      last.span += 1;
      last.to = date;
    } else {
      out.push({ key, from: date, to: date, column: i, span: 1 });
    }
  });
  return out;
}
