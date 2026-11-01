import { cn } from "@/lib/utils";
import type { VisibleLine } from "./timeline";

type ListKind = "dash" | "ordered" | "checklist";

/** The marker each kind of list item hangs off its left edge. */
const MARKER: Record<ListKind, string> = {
  // 2px, not a hairline or a typeset dash: anything thinner lands between
  // pixels and blurs from cranberry into brown.
  dash: "pl-5 before:absolute before:left-0 before:top-[calc(0.8em-1px)] before:h-0.5 before:w-2.5 before:rounded-full",
  ordered: "pl-7",
  // An empty box, so a printed shot list or packing list can be ticked.
  checklist:
    "pl-6 before:absolute before:left-0 before:top-[0.45em] before:size-3 before:rounded-[3px] before:border before:border-muted-foreground/60",
};

/**
 * An entry's lines, nested as deep as the data goes. A line with `says` is
 * the words themselves, so it's set as a script — the speaker, then the line
 * in quotes — rather than as an instruction to follow.
 */
export function Lines({
  lines,
  kind = "dash",
  depth = 0,
}: {
  lines: VisibleLine[];
  kind?: ListKind;
  depth?: number;
}) {
  if (lines.length === 0) return null;
  const List = kind === "ordered" ? "ol" : "ul";

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
            // A checklist's parent is its heading, not a step: no marker, so
            // the boxes line up under the text above instead of indenting.
            line.says ? "py-0.5" : line.checklist ? "pt-2" : MARKER[kind],
            !line.says &&
              !line.checklist &&
              kind === "dash" &&
              (depth === 0 ? "before:bg-pop2" : "before:bg-border"),
          )}
        >
          {kind === "ordered" && !line.says && (
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
          ) : line.checklist ? (
            <span className="font-raleway text-sm font-medium text-muted-foreground">
              {line.text}
            </span>
          ) : (
            line.text
          )}

          {line.note && (
            <p className="mt-0.5 font-raleway text-sm text-muted-foreground">
              {line.note}
            </p>
          )}

          {line.lines && (
            <Lines
              lines={line.lines}
              kind={line.ordered ? "ordered" : line.checklist ? "checklist" : "dash"}
              depth={depth + 1}
            />
          )}
        </li>
      ))}
    </List>
  );
}
