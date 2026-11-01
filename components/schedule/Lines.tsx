import { cn } from "@/lib/utils";
import type { VisibleLine } from "./timeline";

/**
 * An entry's lines, nested as deep as the data goes. A line with `says` is
 * the words themselves, so it's set as a script — the speaker, then the line
 * in quotes — rather than as an instruction to follow.
 */
export function Lines({
  lines,
  ordered = false,
  depth = 0,
}: {
  lines: VisibleLine[];
  ordered?: boolean;
  depth?: number;
}) {
  if (lines.length === 0) return null;
  const List = ordered ? "ol" : "ul";

  return (
    <List
      className={cn(
        "font-garamond leading-relaxed text-foreground/90",
        depth === 0 ? "mt-3 space-y-1.5 text-lg" : "mt-1.5 space-y-1 text-base",
      )}
    >
      {lines.map((line, i) => (
        <li
          key={i}
          className={cn(
            "relative",
            line.says
              ? "py-0.5"
              : ordered
                ? "pl-7"
                : // 2px, not a hairline or a typeset dash: anything thinner
                  // lands between pixels and blurs from cranberry into brown.
                  cn(
                    "pl-5 before:absolute before:left-0 before:top-[calc(0.8em-1px)] before:h-0.5 before:w-2.5 before:rounded-full",
                    depth === 0 ? "before:bg-pop2" : "before:bg-border",
                  ),
          )}
        >
          {ordered && !line.says && (
            <span
              aria-hidden="true"
              className="absolute left-0 top-[0.2em] font-raleway text-sm lining-nums tabular-nums text-pop2"
            >
              {i + 1}
            </span>
          )}

          {line.says ? (
            <p>
              <span className="mr-2 font-raleway text-sm font-semibold text-pop2">
                {line.says}
              </span>
              <q className="italic text-foreground">{line.text}</q>
            </p>
          ) : (
            line.text
          )}

          {line.note && (
            <p className="mt-0.5 font-raleway text-sm text-muted-foreground">
              {line.note}
            </p>
          )}

          {line.lines && (
            <Lines lines={line.lines} ordered={line.ordered} depth={depth + 1} />
          )}
        </li>
      ))}
    </List>
  );
}
