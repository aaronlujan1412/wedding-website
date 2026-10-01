"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { freshness, type PlanDay } from "@/lib/meal-types";
import { DayEditor } from "@/components/me/DayEditor";

/**
 * The month, as a table.
 *
 * A forum was tables and a calendar is a table, so this is the skin's own
 * grammar rather than a concession to it.
 *
 * WHAT RISES OUT OF THE PAGE IS TODAY. It used to be the two delivery days,
 * on the reasoning that the supply waves are what the plan turns on. True when
 * you are building a month; wrong every other day of it, because the question
 * you actually arrive with is "what are we eating tonight", and the answer was
 * flat against thirty other flat cells. Today is raised now; a delivery keeps
 * its gold and its label, which is plenty to find twice in a grid.
 *
 * The date still carries how far the day sits from its box — green on arrival
 * through to pink at the tail — because that distance, not the date, decides
 * whether a dinner works.
 *
 * TWO MODES, one grid. `plan` is the editable calendar on Plan, where a cell
 * opens a dialog to set the dinner and say what kind of day it is. `read` is
 * This Month, where the dish is a link into cook mode and nothing can be
 * changed by a stray tap on a phone in a kitchen.
 */
export function MonthGrid({
  days,
  dinnerOptions,
  mode = "read",
  dayTypes = [],
}: {
  days: PlanDay[];
  dinnerOptions: { id: string; name: string }[];
  mode?: "plan" | "read";
  /** Types already in use this month, offered before typing a new one. */
  dayTypes?: string[];
}) {
  const today = useToday();

  if (!days.length) {
    return (
      <p className="text-[13px] text-me-dim">
        No days yet. Fill the range and the calendar appears here.
      </p>
    );
  }

  // Monday-first weeks. Blank leading cells so the first day lands on its real
  // weekday rather than in the corner.
  const first = new Date(`${days[0].on_date}T00:00:00`);
  const lead = (first.getDay() + 6) % 7;
  const cells: (PlanDay | null)[] = [...Array<null>(lead).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (PlanDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div className="rail-scroll relative overflow-x-auto">
      <table className="w-full min-w-[640px] border-separate border-spacing-1">
        <thead>
          <tr>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <th
                key={d}
                scope="col"
                className="pb-1 text-left font-dot text-[11px] font-normal text-me-dim"
              >
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, w) => (
            <tr key={w}>
              {week.map((day, i) =>
                day ? (
                  <DayCell
                    key={day.id}
                    day={day}
                    options={dinnerOptions}
                    mode={mode}
                    dayTypes={dayTypes}
                    isToday={today !== null && day.on_date === today}
                  />
                ) : (
                  <td key={`gap-${i}`} />
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Today, read where the clock actually is.
 *
 * THIS COMPONENT USED TO BE A SERVER COMPONENT, and `new Date()` in one runs on
 * the server, whose clock is UTC. At 7:42 pm in Salt Lake City it is already
 * tomorrow in UTC, so the raised cell sat on the wrong day for the last six
 * hours of every day — which is exactly the stretch when somebody opens this
 * asking what is for dinner. The old code computed local date PARTS, which was
 * right, and ran them in the wrong place, which made it useless; I checked the
 * expression in a browser console and never checked where it executed.
 *
 * `useSyncExternalStore` rather than state in an effect: it has a server
 * snapshot built in, so the server and the first client render agree on null
 * and no cell is marked until the browser has answered. No hydration mismatch
 * and no setState in an effect, which this repo treats as an error.
 *
 * The subscription re-reads every minute so a page left open overnight moves
 * the marker at midnight. The snapshot is a string, so an unchanged date is
 * `Object.is`-equal and re-renders nothing.
 */
function localDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function subscribeToMidnight(onChange: () => void) {
  const timer = setInterval(onChange, 60_000);
  return () => clearInterval(timer);
}

function useToday(): string | null {
  return useSyncExternalStore(
    subscribeToMidnight,
    localDate,
    // The server has no idea what day it is where the reader is, and saying so
    // beats guessing UTC.
    () => null,
  );
}

function DayCell({
  day,
  options,
  mode,
  dayTypes,
  isToday,
}: {
  day: PlanDay;
  options: { id: string; name: string }[];
  mode: "plan" | "read";
  dayTypes: string[];
  isToday: boolean;
}) {
  const arriving = day.delivery_ordinal !== null;
  const fresh = freshness(day.days_out);
  const dayOfMonth = Number(day.on_date.slice(8, 10));

  return (
    <td
      aria-current={isToday ? "date" : undefined}
      className={`w-[14.28%] align-top p-2 ${
        isToday
          ? "bevel-out bg-me-bar"
          : arriving
            ? "bevel-in bg-me-panel"
            : "bevel-in bg-me-void"
      }`}
    >
      <p className="flex items-baseline justify-between gap-2">
        <span
          className={`font-dot text-[15px] leading-none ${
            isToday ? "text-[var(--me-phosphor)]" : fresh.ink
          }`}
        >
          {dayOfMonth}
        </span>
        {isToday ? (
          <span className="font-dot text-[10px] leading-none text-[var(--me-phosphor)]">
            today
          </span>
        ) : arriving ? (
          <span className="font-dot text-[10px] leading-none text-me-gold">
            order {day.delivery_ordinal}
          </span>
        ) : day.days_out !== null ? (
          // "d+9" — how long this food has been in the house. The number the
          // whole plan turns on, so it is on every cell rather than in a key.
          <span className="font-dot text-[10px] leading-none text-me-dim">
            d+{day.days_out}
          </span>
        ) : null}
      </p>

      {/* A delivery that is also today loses its label to "today", so the gold
          says it instead — the one thing a cell cannot afford is to stop
          saying a box arrives. */}
      {isToday && arriving ? (
        <p className="font-dot text-[10px] leading-none text-me-gold">
          order {day.delivery_ordinal} lands
        </p>
      ) : null}

      <div className="mt-1.5">
        {mode === "plan" ? (
          <DayEditor day={day} options={options} dayTypes={dayTypes} />
        ) : (
          <ReadDay day={day} />
        )}
      </div>
    </td>
  );
}

/**
 * The dish, on a page you are reading rather than editing.
 *
 * The title is a link into cook mode, because "what are we eating" and "how do
 * I make it" are the same question ten minutes apart, and the answer to the
 * second used to be three pages away.
 */
function ReadDay({ day }: { day: PlanDay }) {
  return (
    <>
      {day.dinner && day.dinner_recipe_id ? (
        <Link
          href={`/me/meals/recipes/${day.dinner_recipe_id}`}
          className="block text-[12px] leading-snug text-me-link underline underline-offset-2 hover:text-me-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
        >
          {day.dinner}
        </Link>
      ) : (
        <p className="text-[12px] leading-snug text-me-dim">—</p>
      )}

      {day.tags.length ? (
        <p className="mt-1 font-dot text-[10px] leading-snug text-me-dim">
          {day.tags.join("  ")}
        </p>
      ) : null}
    </>
  );
}

/**
 * What the colours on the dates mean.
 *
 * Shown once under the grid rather than as a tooltip on thirty cells.
 */
export function FreshnessKey() {
  const bands = [0, 1, 5, 10, 14];
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t-2 border-me-edge-lo pt-2.5 text-[11px] text-me-dim">
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="inline-block size-2.5 bg-[var(--me-phosphor)]"
        />
        today
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="inline-block size-2.5 bg-me-panel" />
        <span className="text-me-gold">order 1</span> a box lands
      </span>
      {/* The zero band is dropped: "arrival — box lands" said exactly what the
          gold marker beside it already says, in the same key, two words
          apart. */}
      {bands.slice(1).map((n) => {
        const f = freshness(n);
        return (
          <span key={n} className={f.ink}>
            d+{n}{" "}
            <span className="text-me-dim">{f.label.replace(/^day \d+ — /, "")}</span>
          </span>
        );
      })}
    </p>
  );
}
