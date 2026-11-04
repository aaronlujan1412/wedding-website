import { Fragment } from "react";

import { cn } from "@/lib/utils";
import {
  type BeatSpan,
  type Footwork,
  type Gear,
  GEARS,
  weightedBeats,
} from "@/lib/first-dance";

const BEATS = [1, 2, 3, 4, 5, 6, 7, 8];

/**
 * Eight pips, drawn to the gear.
 *
 * This is the one piece of ornament on the page that is really information:
 * Gear 1 fills 1·3·5·7 because that is where the weight changes, Gear 2 fills
 * all eight, and Gear 3 splits each one in half because it is sixteen. So the
 * rhythm of an eight-count is legible before you have read a word of it, and
 * during a walk-through the pips are what you watch.
 */
export function Pips({
  gear,
  /** 1–8 while this eight-count is the one sounding. */
  on,
  dim,
}: {
  gear: Gear;
  on?: number;
  dim?: boolean;
}) {
  const weighted = weightedBeats(gear);

  // Gear 3 is sixteen changes, so it is drawn as sixteen marks. Splitting eight
  // wider ones with a hairline was the same silhouette as Gear 2 at this size,
  // which lost the one eight-count in the routine where the gear is the point.
  if (gear === 3) {
    return (
      <div className="flex items-end gap-px" aria-hidden>
        {Array.from({ length: 16 }, (_, i) => {
          const beat = Math.floor(i / 2) + 1;
          return (
            <span
              key={i}
              className={cn(
                "block w-[3px] rounded-[1px] transition-colors duration-75 motion-reduce:transition-none",
                beat === 1 && i % 2 === 0 ? "h-4" : "h-3",
                on === beat
                  ? "bg-primary"
                  : dim
                    ? "bg-foreground/35"
                    : "bg-foreground/60",
              )}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="flex items-end gap-[3px]"
      aria-hidden
      // The gear is stated in words in the movement heading; the pips are a
      // picture of it, so they say nothing again to a screen reader.
    >
      {BEATS.map((beat) => {
        const carries = weighted.includes(beat);
        const lit = on === beat;
        const down = beat === 1;

        return (
          <span
            key={beat}
            className={cn(
              "block w-[7px] rounded-[1px] transition-colors duration-75 motion-reduce:transition-none",
              // A beat that carries no weight change is a tick, not a faint
              // bar: the DENSITY of the row is what makes the gear legible at
              // a glance, and eight bars of two greys just read as a smear.
              carries ? (down ? "h-4" : "h-3") : "h-[2px]",
              lit
                ? "bg-primary"
                : carries
                  ? dim
                    ? "bg-foreground/35"
                    : "bg-foreground/60"
                  : "bg-foreground/25",
            )}
          />
        );
      })}
    </div>
  );
}

/** One line of the staff: whose feet, and what they do across the eight. */
export type Voice = {
  key: string;
  /** Absent when the pair does one thing and there is nothing to tell apart. */
  label?: string;
  beats: BeatSpan[];
};

/**
 * The label column is a fixed width rather than `auto` because the ruler
 * underneath is a second grid, and two grids only line up if they are told the
 * same columns.
 */
const STAFF_COLUMNS = "3.5rem repeat(8, minmax(0, 1fr))";

/**
 * The eight beats as columns, with every voice written across them.
 *
 * One grid and one ruler, however many voices there are. These used to be a
 * strip each — the count's own beats, then Lead, then Follow — stacked with a
 * ruler apiece, which drew the same eight columns three times and still left
 * you comparing them by eye. Stacked inside one grid the columns are shared,
 * so you read DOWN a beat: on 3 she is walking the turn round while he holds
 * his ground. It also makes the commonest beginner error checkable at a
 * glance — whether you finish the eight-count on the foot that starts the
 * next one.
 *
 * Only eight-counts the source sheet wrote beat by beat get one. Everywhere
 * else the eight-count is the unit and a grid would be eight empty boxes.
 */
export function Staff({
  voices,
  on,
  note,
  className,
}: {
  voices: Voice[];
  on?: number;
  /** The footwork's prose, which belongs to the staff rather than the row. */
  note?: string;
  className?: string;
}) {
  const covers = (span: BeatSpan) =>
    on !== undefined && on >= span.from && on <= (span.to ?? span.from);

  const missing = (beats: BeatSpan[]) =>
    BEATS.filter((b) => !beats.some((s) => b >= s.from && b <= (s.to ?? s.from)));

  // Whether the eight columns survive a phone. A column is about 39px at
  // 390px wide, so roughly seven characters fit in one — and a span two beats
  // long has twice the room. Short enough and the grid is kept at every width,
  // because listing "L R L R" as sixteen rows of one letter buries the only
  // thing it is for: seeing at a glance which foot you finish on. One voice
  // too wordy sends the whole staff to the list, since half a staff would be
  // the comparison it exists for, broken.
  const terse = voices.every((voice) =>
    voice.beats.every(
      (span) => span.text.length <= 7 * ((span.to ?? span.from) - span.from + 1),
    ),
  );

  return (
    <div className={cn("mt-3", className)}>
      {/* Below sm the eight columns come out around 37px and clip every label.
          The grid's information is WHERE in the eight-count, and at phone width
          the beat numbers say that in far less room. Both are in the DOM and
          CSS picks one, so there is no media-query hook and no hydration flash. */}
      <div className={cn("space-y-2 sm:hidden", terse && "hidden")}>
        {voices.map((voice) => (
          <div key={voice.key}>
            {voice.label && (
              <p className="mb-1 font-raleway text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase">
                {voice.label}
              </p>
            )}
            <ul className="space-y-1">
              {voice.beats.map((span) => (
                <li
                  key={span.from}
                  className={cn(
                    "flex gap-3 rounded-sm px-2 py-1",
                    covers(span)
                      ? "bg-primary text-primary-foreground"
                      : "bg-card",
                  )}
                >
                  <span className="w-9 shrink-0 font-mono text-xs tabular-nums">
                    {span.to ? `${span.from}\u2013${span.to}` : span.from}
                  </span>
                  <span className="font-garamond text-base leading-snug">
                    {span.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className={cn("max-w-lg", !terse && "max-sm:hidden")}>
        <div
          className="grid gap-px overflow-hidden rounded-sm border border-border bg-border"
          style={{ gridTemplateColumns: STAFF_COLUMNS }}
        >
          {voices.map((voice, row) => (
            <Fragment key={voice.key}>
              <span
                style={{ gridRow: row + 1, gridColumn: 1 }}
                className="flex items-center justify-end overflow-hidden bg-card px-1.5 py-1 font-raleway text-[0.55rem] tracking-[0.08em] text-muted-foreground uppercase"
              >
                {voice.label}
              </span>
              {voice.beats.map((span) => (
                <div
                  key={span.from}
                  // Every item placed explicitly. Leave the fillers to
                  // auto-flow and they land on a row of their own behind the
                  // first, which reads as the whole strip being one block.
                  style={{
                    gridRow: row + 1,
                    gridColumn: `${span.from + 1} / ${(span.to ?? span.from) + 2}`,
                  }}
                  className={cn(
                    "px-1.5 py-1 font-garamond leading-snug",
                    terse ? "text-center text-xs sm:text-sm" : "text-sm",
                    covers(span)
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-foreground",
                  )}
                >
                  {span.text}
                </div>
              ))}
              {/* Beats nobody wrote anything on still hold their column open. */}
              {missing(voice.beats).map((b) => (
                <div
                  key={`gap-${b}`}
                  style={{ gridRow: row + 1, gridColumn: b + 1 }}
                  className="bg-background"
                />
              ))}
            </Fragment>
          ))}
        </div>

        <div className="mt-1 grid" style={{ gridTemplateColumns: STAFF_COLUMNS }}>
          <span />
          {BEATS.map((b) => (
            <span
              key={b}
              className={cn(
                "px-1.5 font-mono text-[0.6rem] tabular-nums",
                on === b ? "text-primary" : "text-muted-foreground/70",
              )}
            >
              {b}
            </span>
          ))}
        </div>
      </div>

      {note && (
        <p className="mt-2 max-w-[62ch] font-garamond text-base leading-relaxed text-muted-foreground">
          {note}
        </p>
      )}
    </div>
  );
}

/**
 * Both of you, on the same eight beats.
 *
 * A movement-level staff: the figure's footwork with no eight-count of its own
 * to sit under.
 */
export function Footsteps({
  footwork,
  on,
}: {
  footwork: Footwork;
  on?: number;
}) {
  return (
    <Staff
      className="mt-4"
      on={on}
      note={footwork.note}
      voices={[
        { key: "lead", label: "Lead", beats: footwork.lead },
        { key: "follow", label: "Follow", beats: footwork.follow },
      ]}
    />
  );
}

/**
 * The key to the pips.
 *
 * Without it the rows above are a texture. The source sheet named the three
 * gears in a table of its own and then used them forty times; naming them once
 * beside the actual marks is the same fact in the place you meet it.
 */
export function GearKey() {
  return (
    <div className="mt-6">
      <p className="max-w-[62ch] font-garamond text-base leading-relaxed text-muted-foreground">
        The marks beside each eight-count are its rhythm — one slot per beat,
        drawn where the weight changes.
      </p>
      <div className="mt-2 flex flex-wrap gap-x-7 gap-y-2">
        {([1, 2, 3] as Gear[]).map((gear) => (
          <div key={gear} className="flex items-center gap-2.5">
            <Pips gear={gear} />
            <span className="font-garamond text-base text-muted-foreground">
              {GEARS[gear].name}, {GEARS[gear].short}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
