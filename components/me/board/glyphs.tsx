/**
 * The status gutter.
 *
 * A 2004 forum index put one small icon to the left of every thread row — a
 * padlock on a locked thread, a pin on a sticky, a marker on one with new
 * posts. That is the same job the board needs doing: what state is this item
 * in, readable at a glance, down a dense list. So these are those icons.
 *
 * Pixel art as data, the same idiom as `components/me/sprite.tsx`, with its
 * own ink map because these need the gold and the alert pink rather than the
 * beige-and-phosphor of a CRT. Kept local rather than widening that palette:
 * the sprite module draws one picture of a computer, and this draws interface
 * furniture.
 */

const INK: Record<string, string> = {
  o: "var(--color-me-edge-lo)", // outline
  d: "var(--color-me-dim)", // the body of a quiet glyph
  g: "var(--color-me-gold)", // headings, and the lock's shackle
  p: "var(--color-me-live)", // the alert pink, used only for the flag
  i: "var(--color-me-ink)",
};

function Glyph({
  rows,
  label,
  className = "h-3 w-3",
}: {
  rows: string[];
  label: string;
  className?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${rows[0].length} ${rows.length}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
      className={className}
    >
      {rows.flatMap((row, y) =>
        [...row].map((key, x) => {
          const fill = INK[key];
          /* `style`, not the `fill` attribute — a presentation attribute does
             not resolve var() and silently paints black. Same trap as sprite.tsx. */
          return fill ? (
            <rect key={`${x},${y}`} x={x} y={y} width={1} height={1} style={{ fill }} />
          ) : null;
        }),
      )}
    </svg>
  );
}

/** A closed padlock: the card is Claude-proof. */
const LOCK = [
  "..ggg..",
  ".g...g.",
  ".g...g.",
  "ooooooo",
  "odddddo",
  "odd.ddo",
  "odd.ddo",
  "ooooooo",
];

/** A pennant on a staff: Claude has proposed something here. */
const FLAG = [
  "po.....",
  "ppppppo",
  "ppppppo",
  "ppppppo",
  "po.....",
  "po.....",
  "po.....",
  "ooo....",
];

/** A quiet dot, for a card with nothing claimed about it. */
const DOT = [
  ".......",
  ".......",
  "..ddd..",
  ".ddddd.",
  "..ddd..",
  ".......",
  ".......",
];

/** The agent cannot enter this column. Drawn on the column, not the card. */
const BARRED = [
  "ooooooo",
  "o.....o",
  "o.ggg.o",
  "o.g.g.o",
  "o.ggg.o",
  "o.....o",
  "ooooooo",
];

export const LockGlyph = (p: { className?: string }) => (
  <Glyph rows={LOCK} label="Locked" {...p} />
);
export const FlagGlyph = (p: { className?: string }) => (
  <Glyph rows={FLAG} label="Waiting on you" {...p} />
);
export const DotGlyph = (p: { className?: string }) => (
  <Glyph rows={DOT} label="" {...p} />
);
export const BarredGlyph = (p: { className?: string }) => (
  <Glyph rows={BARRED} label="Claude cannot move cards here" {...p} />
);
