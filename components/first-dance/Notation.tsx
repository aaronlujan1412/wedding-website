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

/**
 * The eight beats as columns, with the choreography written across them.
 *
 * Only appears on the eight-counts the source sheet wrote beat by beat — the
 * hand offered on 5 and taken on 7, the three steps back on 1·3·5, the mirrored
 * phrase in four pairs. Everywhere else the eight-count is the unit and a beat
 * grid would be eight empty boxes.
 */
export function BeatStrip({
  beats,
  on,
  label,
  numbers = true,
  className,
}: {
  beats: BeatSpan[];
  on?: number;
  /** Set when two strips are stacked and you need to know whose feet. */
  label?: string;
  numbers?: boolean;
  className?: string;
}) {
  const covers = (span: BeatSpan) =>
    on !== undefined && on >= span.from && on <= (span.to ?? span.from);

  // Whether the eight columns survive a phone. A column is about 41px at
  // 390px wide, so roughly seven characters fit in one — and a span two beats
  // long has twice the room. Short enough and the grid is kept at every width,
  // because listing "L R L R" as sixteen rows of one letter buries the only
  // thing it is for: seeing at a glance which foot you finish on.
  const terse = beats.every(
    (span) =>
      span.text.length <= 7 * ((span.to ?? span.from) - span.from + 1),
  );

  return (
    <div className={cn("mt-3", className)}>
      {label && (
        <p className="mb-1 font-raleway text-[0.65rem] tracking-[0.2em] text-muted-foreground uppercase">
          {label}
        </p>
      )}
      {/* Below sm the eight columns come out around 37px and clip every label.
          The grid's information is WHERE in the eight-count, and at phone width
          the beat numbers say that in far less room. Both are in the DOM and
          CSS picks one, so there is no media-query hook and no hydration flash. */}
      <ul className={cn("space-y-1 sm:hidden", terse && "hidden")}>
        {beats.map((span) => (
          <li
            key={span.from}
            className={cn(
              "flex gap-3 rounded-sm px-2 py-1",
              covers(span) ? "bg-primary text-primary-foreground" : "bg-card",
            )}
          >
            <span className="w-9 shrink-0 font-mono text-xs tabular-nums">
              {span.to ? `${span.from}–${span.to}` : span.from}
            </span>
            <span className="font-garamond text-base leading-snug">
              {span.text}
            </span>
          </li>
        ))}
      </ul>

      <div className={cn("max-w-lg", !terse && "max-sm:hidden")}>
        <div className="grid grid-cols-8 gap-px overflow-hidden rounded-sm border border-border bg-border">
          {beats.map((span) => (
            <div
              key={span.from}
              // Every item placed explicitly. Leave the fillers to auto-flow and
              // they land on a second, content-less row behind the first, which
              // reads as the whole strip being one filled block.
              style={{
                gridRow: 1,
                gridColumn: `${span.from} / ${(span.to ?? span.from) + 1}`,
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
          {BEATS.filter(
            (b) => !beats.some((s) => b >= s.from && b <= (s.to ?? s.from)),
          ).map((b) => (
            <div
              key={`gap-${b}`}
              style={{ gridRow: 1, gridColumn: b }}
              className="bg-background"
            />
          ))}
        </div>
        {numbers && (
        <div className="mt-1 grid grid-cols-8 px-1.5">
          {BEATS.map((b) => (
            <span
              key={b}
              className={cn(
                "font-mono text-[0.6rem] tabular-nums",
                on === b ? "text-primary" : "text-muted-foreground/70",
              )}
            >
              {b}
            </span>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}

/**
 * Both of you, on the same eight beats.
 *
 * Stacked rather than side by side so the columns line up: the useful thing is
 * reading straight down a beat and seeing what each of you is doing on it. It
 * also makes the commonest beginner error checkable at a glance — whether you
 * finish the eight-count on the foot that lets you start the next one.
 */
export function Footsteps({
  footwork,
  on,
}: {
  footwork: Footwork;
  on?: number;
}) {
  return (
    <div className="mt-4">
      <BeatStrip
        beats={footwork.lead}
        on={on}
        label="Lead"
        numbers={false}
        className="mt-0"
      />
      <BeatStrip beats={footwork.follow} on={on} label="Follow" className="mt-2" />
      {footwork.note && (
        <p className="mt-2 max-w-[62ch] font-garamond text-base leading-relaxed text-muted-foreground">
          {footwork.note}
        </p>
      )}
    </div>
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
