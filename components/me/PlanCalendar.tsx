"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setDayTag, setNeedsDinner } from "@/app/actions/meal-library";
import { DayEditor } from "@/components/me/DayEditor";
import { MonthGrid } from "@/components/me/MonthGrid";
import { FIELD } from "@/components/me/form-bits";
import { dayType, longDate, type PlanDay } from "@/lib/meal-types";

/**
 * The calendar on Plan, painted rather than filled in.
 *
 * A month starts blank and the job is to say which days need a dinner and
 * what kind of day each one is. That used to be a dialog per day — open it,
 * pick, close it, thirty times — which is a form, not a calendar. Now you pick
 * a brush and tap the days: "needs a dinner", or a kind of day (which needs a
 * dinner too), or "pick dishes", which is the old dialog.
 *
 * Every tap is drawn at once (`useOptimistic`) and saved behind it. The server
 * calls take the state wanted rather than toggling, so a tap's request means
 * the same thing however late it lands.
 */

type Brush = { kind: "dinner" } | { kind: "dish" } | { kind: "type"; type: string };

const DINNER: Brush = { kind: "dinner" };
const DISH: Brush = { kind: "dish" };
const EMPTY = { error: null, note: null };

type DayPatch = { id: string } & Partial<
  Pick<PlanDay, "needs_dinner" | "tags" | "dinner" | "dinner_recipe_id" | "dinner_window">
>;

/** What `setNeedsDinner(false)` does to a day, drawn before it has. */
const NOT_NEEDED = {
  needs_dinner: false,
  tags: [],
  dinner: null,
  dinner_recipe_id: null,
  dinner_window: null,
} satisfies Omit<DayPatch, "id">;

export function PlanCalendar({
  days,
  dinnerOptions,
  dayTypes,
}: {
  days: PlanDay[];
  dinnerOptions: { id: string; name: string }[];
  /** Every kind of day ever used, across all plans. */
  dayTypes: string[];
}) {
  // A month with dishes on it is being adjusted, not drawn, and "needs a
  // dinner" in hand would turn the first stray tap into a deleted dish.
  const [brush, setBrush] = useState<Brush>(() =>
    days.some((d) => d.dinner_recipe_id) ? DISH : DINNER,
  );
  // Kinds typed here that no day has yet. A kind exists because a day has it,
  // so one never painted is gone on the next visit, as it should be.
  const [invented, setInvented] = useState<string[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const [shown, patch] = useOptimistic(days, (current: PlanDay[], change: DayPatch) =>
    current.map((d) => (d.id === change.id ? { ...d, ...change } : d)),
  );

  const types = [...new Set([...dayTypes, ...invented, ...shown.flatMap((d) => d.tags)])].sort();

  function paint(day: PlanDay) {
    if (brush.kind === "dish") return;
    setProblem(null);

    const data = new FormData();
    data.set("day_id", day.id);

    let change: DayPatch;
    let save: typeof setNeedsDinner;

    if (brush.kind === "dinner") {
      const needed = !day.needs_dinner;
      change = needed ? { id: day.id, needs_dinner: true } : { id: day.id, ...NOT_NEEDED };
      data.set("needed", String(needed));
      save = setNeedsDinner;
    } else {
      const on = !day.tags.includes(brush.type);
      change = {
        id: day.id,
        tags: on ? [...day.tags, brush.type] : day.tags.filter((t) => t !== brush.type),
        needs_dinner: day.needs_dinner || on,
      };
      data.set("tag", brush.type);
      data.set("on", String(on));
      save = setDayTag;
    }

    start(async () => {
      patch(change);
      const result = await save(EMPTY, data);
      if (result.error) setProblem(`${longDate(day.on_date)}: ${result.error}`);
    });
  }

  function invent(raw: string) {
    const type = dayType(raw);
    if (!type) return;
    if (!types.includes(type)) setInvented((list) => [...list, type]);
    setBrush({ kind: "type", type });
  }

  return (
    <>
      <BrushBar
        brush={brush}
        types={types}
        onPick={setBrush}
        onInvent={invent}
      />

      <p aria-live="polite" className="mb-2.5 min-h-[1.1rem] px-1 text-[12px] leading-relaxed">
        {problem ? (
          <span className="text-me-live">{problem}</span>
        ) : (
          <span className="text-me-dim">
            {hint(brush)}
            {saving ? <span className="ml-2 font-dot text-[11px]">saving…</span> : null}
          </span>
        )}
      </p>

      <MonthGrid
        days={shown}
        renderDay={(day) => (
          <>
            <DayFace day={day} />
            {brush.kind === "dish" ? (
              <DayEditor day={day} options={dinnerOptions} dayTypes={types} />
            ) : (
              <button
                type="button"
                aria-pressed={brush.kind === "dinner" ? day.needs_dinner : day.tags.includes(brush.type)}
                aria-label={describe(day)}
                onClick={() => paint(day)}
                className="absolute inset-0 hover:bg-me-ink/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-me-gold"
              />
            )}
          </>
        )}
      />
    </>
  );
}

function hint(brush: Brush): string {
  switch (brush.kind) {
    case "dinner":
      return "Tap the days you need a dinner. Tap one again to take it off — that clears its dish and kinds too.";
    case "type":
      return `Tap the days that are ${brush.type} days. Marking one also says it needs a dinner.`;
    case "dish":
      return "Tap a day to pick its dinner, or let “place the dinners” fill every marked day.";
  }
}

/** For a screen reader: the day and everything the face shows. */
function describe(day: PlanDay): string {
  const dinner = day.dinner ?? (day.needs_dinner ? "needs a dinner" : "no dinner");
  return [longDate(day.on_date), dinner, ...day.tags].join(", ");
}

/**
 * The brushes: what a tap on a day will do.
 *
 * "Needs a dinner" first because it's the first thing a blank month needs,
 * then every kind of day ever used, then room to make one up, then the dish
 * picker set apart — it opens a dialog where the others paint.
 */
function BrushBar({
  brush,
  types,
  onPick,
  onInvent,
}: {
  brush: Brush;
  types: string[];
  onPick: (brush: Brush) => void;
  onInvent: (raw: string) => void;
}) {
  const [fresh, setFresh] = useState("");

  return (
    <div
      role="toolbar"
      aria-label="What a tap on a day does"
      className="mb-1.5 flex flex-wrap items-center gap-1.5 px-1"
    >
      <span className="mr-1 font-dot text-[11px] text-me-dim">brush</span>

      <BrushButton on={brush.kind === "dinner"} onClick={() => onPick(DINNER)}>
        needs a dinner
      </BrushButton>

      {types.map((type) => (
        <BrushButton
          key={type}
          on={brush.kind === "type" && brush.type === type}
          onClick={() => onPick({ kind: "type", type })}
        >
          {type}
        </BrushButton>
      ))}

      <input
        value={fresh}
        onChange={(event) => setFresh(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          onInvent(fresh);
          setFresh("");
        }}
        placeholder="new kind…"
        aria-label="Make up a kind of day and paint with it"
        className={`${FIELD} w-28 !text-[11px] pointer-coarse:!text-[16px]`}
      />

      <span aria-hidden className="mx-1 h-4 w-px bg-me-edge-hi" />

      <BrushButton on={brush.kind === "dish"} onClick={() => onPick(DISH)}>
        pick dishes
      </BrushButton>
    </div>
  );
}

function BrushButton({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`border px-2 py-1 font-dot text-[11px] leading-none pointer-coarse:py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold ${
        on
          ? "border-me-gold bg-me-gold/15 text-me-gold"
          : "border-me-edge-lo text-me-dim hover:border-me-edge-hi hover:text-me-ink"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * A day as it reads on Plan, whichever brush is in hand.
 *
 * A day that needs a dinner is tinted gold — that is what painting it does —
 * and says "dinner" until one is picked. The tint sits behind the words
 * (`-z-10`, inside the cell's `isolate`), so it washes the cell rather than
 * the text. A day that needs nothing is left blank: on a new month, that's
 * every day, which is the point.
 */
function DayFace({ day }: { day: PlanDay }) {
  return (
    <>
      {day.needs_dinner ? (
        <span aria-hidden className="absolute inset-0 -z-10 bg-me-gold/10" />
      ) : null}

      {day.dinner ? (
        <p className="text-[12px] leading-snug text-me-link">{day.dinner}</p>
      ) : day.needs_dinner ? (
        <p className="font-dot text-[11px] leading-snug text-me-gold">dinner</p>
      ) : (
        // Holds the line so painting a day doesn't make its week jump.
        <p aria-hidden className="text-[12px] leading-snug">&nbsp;</p>
      )}

      {day.tags.length ? (
        <p className="mt-1 font-dot text-[10px] leading-snug text-me-gold">
          {day.tags.join("  ")}
        </p>
      ) : null}
    </>
  );
}
