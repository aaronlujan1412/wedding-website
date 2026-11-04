import { FaceChips } from "@/components/helpers/FaceChips";
import type { FaceIndex } from "@/components/helpers/faces";
import { cn } from "@/lib/utils";
import type { VisibleLine } from "./timeline";

type ListKind = "dash" | "ordered" | "checklist";

/** `end` mirrors a list for the left of a two-sided view, so its text and
    markers hug the spine instead of the page edge. */
export type Align = "start" | "end";

/** The marker each kind of list item hangs off its edge. */
const MARKER_SHAPE: Record<ListKind, string> = {
  // 2px, not a hairline or a typeset dash: anything thinner lands between
  // pixels and blurs from cranberry into brown.
  dash: "before:absolute before:top-[calc(0.8em-1px)] before:h-0.5 before:w-2.5 before:rounded-full",
  ordered: "",
  // An empty box, so a printed shot list or packing list can be ticked.
  checklist:
    "before:absolute before:top-[0.45em] before:size-3 before:rounded-[3px] before:border before:border-muted-foreground/60",
};

const MARKER_EDGE: Record<ListKind, Record<Align, string>> = {
  dash: { start: "pl-5 before:left-0", end: "pr-5 before:right-0" },
  ordered: { start: "pl-7", end: "pr-7" },
  checklist: { start: "pl-6 before:left-0", end: "pr-6 before:right-0" },
};

/**
 * An entry's lines, nested as deep as the data goes. A line with `says` is
 * the words themselves, so it's set as a script — the speaker, then the line
 * in quotes — rather than as an instruction to follow.
 */
export function Lines({
  lines,
  kind = "dash",
  align = "start",
  small = false,
  faces,
  depth = 0,
}: {
  lines: VisibleLine[];
  kind?: ListKind;
  align?: Align;
  /** Top-level lines at body size, for a narrow column. */
  small?: boolean;
  /** Who's who, once the helpers' code is in: a line naming `people` shows
      their faces. Only the helper page has it, and only after the code. */
  faces?: FaceIndex;
  depth?: number;
}) {
  if (lines.length === 0) return null;
  const List = kind === "ordered" ? "ol" : "ul";

  return (
    <List
      className={cn(
        "font-garamond leading-relaxed text-foreground/90",
        depth === 0 && !small ? "mt-3 space-y-1.5 text-lg" : "mt-1.5 space-y-1 text-base",
        align === "end" && "text-right",
      )}
    >
      {lines.map((line, i) => (
        <li
          key={i}
          className={cn(
            "relative",
            // A checklist's parent is its heading, not a step: no marker, so
            // the boxes line up under the text above instead of indenting.
            line.says
              ? "py-0.5"
              : line.checklist
                ? "pt-2"
                : cn(MARKER_SHAPE[kind], MARKER_EDGE[kind][align]),
            !line.says &&
              !line.checklist &&
              kind === "dash" &&
              (depth === 0 ? "before:bg-pop2" : "before:bg-border"),
          )}
        >
          {kind === "ordered" && !line.says && (
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-[0.2em] font-raleway text-sm lining-nums tabular-nums text-pop2",
                align === "end" ? "right-0" : "left-0",
              )}
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

          {line.people && faces && (
            <FaceChips people={line.people} faces={faces} />
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
              align={align}
              faces={faces}
              depth={depth + 1}
            />
          )}
        </li>
      ))}
    </List>
  );
}
