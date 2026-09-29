/**
 * Pixel art as data.
 *
 * Each sprite is an array of equal-length strings and each character is a
 * palette key, so the art is legible in the source — you can see the monitor
 * below without rendering it. Drawn as one <rect> per lit pixel rather than a
 * few hundred box-shadows, which scales to any size and stays crisp.
 */

const SPRITE_INK: Record<string, string> = {
  o: "var(--me-outline)", // outline and shadow
  C: "var(--me-case)", // beige, because that is what a computer was
  S: "var(--me-screen)", // screen, unlit
  g: "var(--me-phosphor)", // phosphor
  k: "var(--me-cursor)", // the cursor, waiting on an empty line
  L: "var(--me-led)", // power LED, the same pink as the status dot
};

/**
 * A CRT with three lines on it and the cursor waiting on the fourth.
 *
 * The blank rows between the text rows are load-bearing: without them the lit
 * pixels touch and the screen reads as one green blob rather than as writing.
 */
export const CRT = [
  "..................",
  ".oooooooooooooooo.",
  ".oCCCCCCCCCCCCCCo.",
  ".oCooooooooooooCo.",
  ".oCogggggggSSSoCo.",
  ".oCoSSSSSSSSSSoCo.",
  ".oCoggggSSSSSSoCo.",
  ".oCoSSSSSSSSSSoCo.",
  ".oCoggggggggSSoCo.",
  ".oCoSSSSSSSSSSoCo.",
  ".oCokkSSSSSSSSoCo.",
  ".oCooooooooooooCo.",
  ".oCCCCCCCCCCCCCCo.",
  ".oCCLCCCCCCCCCCCo.",
  ".oooooooooooooooo.",
  "......oCCCCo......",
  "....oooooooooo....",
];

export function PixelSprite({
  rows,
  label,
  className,
}: {
  rows: string[];
  label: string;
  className?: string;
}) {
  const width = rows[0].length;
  const height = rows.length;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
      className={className}
    >
      {rows.flatMap((row, y) =>
        [...row].map((key, x) => {
          const fill = SPRITE_INK[key];
          /* `style`, not the `fill` attribute: a presentation attribute does
             not resolve var(), and an unparseable one silently paints black —
             which is a whole sprite rendered as one dark blob. */
          return fill ? (
            <rect
              key={`${x},${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              style={{ fill }}
            />
          ) : null;
        }),
      )}
    </svg>
  );
}
