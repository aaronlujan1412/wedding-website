import { cn } from "@/lib/utils";

/**
 * A span of time, measured.
 *
 * The page uses this three times — the song, the seventeen weeks, the
 * forty-five minutes of a session — because all three are the same shape of
 * fact and drawing them the same way is what makes the page one thing rather
 * than three stacked sections.
 *
 * Widths are `minmax(min-content, <span>fr)`: true proportion wherever the
 * label fits, and the label never clipped. Land is one eight-count of
 * thirty-eight and would otherwise be a 2% sliver nobody could tap.
 */

export type Segment = {
  key: string;
  label: string;
  /** The exact figure, under the label — this is what carries the truth when a
   *  narrow segment has been widened to fit its own name. */
  detail?: string;
  span: number;
  /** 0–1. Tints the segment; the strip's own picture of the arc. */
  intensity?: number;
  active?: boolean;
  onSelect?: () => void;
  title?: string;
};

export function Strip({
  segments,
  className,
  compact,
}: {
  segments: Segment[];
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid overflow-hidden rounded-md border border-border",
        className,
      )}
      style={{
        gridTemplateColumns: segments
          .map((s) => `minmax(min-content, ${s.span}fr)`)
          .join(" "),
      }}
    >
      {segments.map((segment) => {
        const tint =
          segment.intensity === undefined
            ? "var(--color-paper)"
            : `color-mix(in srgb, var(--color-primary) ${
                6 + segment.intensity * 28
              }%, var(--color-paper))`;

        const body = (
          <>
            <span
              className={cn(
                "block truncate font-garamond leading-tight",
                compact ? "text-base" : "text-lg sm:text-xl",
                segment.active ? "text-primary" : "text-foreground",
              )}
            >
              {segment.label}
            </span>
            {segment.detail && (
              <span className="mt-0.5 block truncate font-mono text-[0.65rem] tracking-wide text-muted-foreground tabular-nums slashed-zero">
                {segment.detail}
              </span>
            )}
          </>
        );

        const shell = cn(
          "block w-full border-l border-border px-2.5 text-left first:border-l-0 sm:px-3",
          compact ? "py-2" : "py-4",
          segment.active && "ring-2 ring-ring ring-inset",
        );

        return segment.onSelect ? (
          <button
            key={segment.key}
            type="button"
            title={segment.title}
            onClick={segment.onSelect}
            style={{ background: tint }}
            className={cn(
              shell,
              "cursor-pointer transition-[box-shadow] hover:ring-2 hover:ring-primary hover:ring-inset focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none",
            )}
          >
            {body}
          </button>
        ) : (
          <div
            key={segment.key}
            title={segment.title}
            style={{ background: tint }}
            className={shell}
          >
            {body}
          </div>
        );
      })}
    </div>
  );
}
