import { freshness, type PlanDay } from "@/lib/meal-types";
import { DinnerPicker } from "@/components/me/DinnerPicker";

/**
 * The month, as a table.
 *
 * A forum was tables and a calendar is a table, so this is the skin's own
 * grammar rather than a concession to it.
 *
 * THE ONE IDEA ON THIS PAGE: a delivery day is `bevel-out` and every other day
 * is `bevel-in`. The two days the box arrives rise out of a grid of sunken
 * cells, and the eye reads the two supply waves before it reads a word. The
 * raised/sunk pair already means available/engaged everywhere else here; this
 * is the same pair meaning arrived/spending-down, so it needs no key and no new
 * colour.
 *
 * The date then carries how far the day sits from its box — green on arrival
 * through to pink at the tail — because that distance, not the date, is the
 * thing that decides whether a dinner works. Everything else about a day is
 * text.
 */
export function MonthGrid({
  days,
  dinnerOptions,
}: {
  days: PlanDay[];
  dinnerOptions: { id: string; name: string }[];
}) {
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

  /*
   * `relative` on the scroller below is load-bearing, not decoration.
   *
   * Every dinner cell carries an `sr-only` label, and `sr-only` is
   * `position: absolute`. An absolutely positioned element is clipped by its
   * CONTAINING BLOCK, not by whatever happens to have overflow — so with no
   * positioned ancestor inside this scroller, those labels took their
   * containing block from far up the tree, escaped the horizontal clip, and
   * dragged the whole PAGE 97px wide at 390px.
   *
   * Invisible on its own terms, because the labels are 1px and clipped: it
   * showed up only as a page that scrolled sideways for no reason. Making the
   * scroller a containing block puts them back inside it. The same one-word
   * fix is on every other `rail-scroll` under /me, all of which wrap a
   * min-width table full of form controls with `sr-only` labels.
   */
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
                  <DayCell key={day.id} day={day} options={dinnerOptions} />
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

function DayCell({
  day,
  options,
}: {
  day: PlanDay;
  options: { id: string; name: string }[];
}) {
  const arriving = day.delivery_ordinal !== null;
  const fresh = freshness(day.days_out);
  const dayOfMonth = Number(day.on_date.slice(8, 10));

  return (
    <td
      className={`w-[14.28%] align-top ${
        arriving ? "bevel-out bg-me-bar" : "bevel-in bg-me-void"
      } p-2`}
    >
      <p className="flex items-baseline justify-between gap-2">
        <span className={`font-dot text-[15px] leading-none ${fresh.ink}`}>
          {dayOfMonth}
        </span>
        {arriving ? (
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

      <div className="mt-1.5">
        <DinnerPicker
          dayId={day.id}
          current={day.dinner_recipe_id}
          options={options}
        />
      </div>

      {day.kid_here || day.prep_day ? (
        <p className="mt-1 font-dot text-[10px] text-me-dim">
          {[day.kid_here && "Daniel here", day.prep_day && "prep"]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}
    </td>
  );
}

/**
 * What the colours on the dates mean.
 *
 * Shown once under the grid rather than as a tooltip on thirty cells. The
 * raised delivery days need no entry — a box that arrived is the only thing
 * standing up out of the page.
 */
export function FreshnessKey() {
  const bands = [0, 1, 5, 10, 14];
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t-2 border-me-edge-lo pt-2.5 text-[11px] text-me-dim">
      {bands.map((d) => {
        const f = freshness(d);
        return (
          <span key={d} className="flex items-center gap-1.5">
            <span aria-hidden className={`font-dot text-[13px] ${f.ink}`}>
              {d === 0 ? "■" : `d+${d}`}
            </span>
            {f.label.replace(/^day \d+ — /, "")}
          </span>
        );
      })}
    </p>
  );
}
