import { cn } from "@/lib/utils";
import { EntryContent, type Placement } from "./EntryContent";
import { SIDES, type Role } from "./roles";
import type { RoleEntry } from "./schedule";
import {
  formatDay,
  formatWhen,
  sidedRows,
  type SidedRow,
  type TimelineDay,
} from "./timeline";
import { TimelineConnector } from "./TimelineConnector";

/** Left column, the spine, right column. */
const COLUMNS = "grid grid-cols-[1fr_3rem_1fr] md:grid-cols-[1fr_4rem_1fr]";

/** The run of spine between one row and the next. */
const GAP = "h-12 flex-none";

const ARRIVE =
  "animate-in fade-in duration-500 fill-mode-both motion-reduce:animate-none print:animate-none";

/**
 * Two people's day down one spine: Aaron's on the left, Savea's on the
 * right, each in their own ink. Where they're apart, their entries for the
 * same minute sit level with each other across the spine; where they're
 * together, the entry sits on the spine itself in cranberry. The morning
 * reads as two paths and the afternoon as one.
 *
 * Each row draws its own stretch of spine, as the single-column view does,
 * rather than one line running behind everything: a shared entry sitting
 * on the path would otherwise need a background to hide the line, and that
 * background has to match a page colour this component doesn't own.
 */
export function SidedTimeline({
  days,
  role,
}: {
  days: TimelineDay[];
  role: Role;
}) {
  const [left, right] = SIDES;

  return (
    <>
      <div className={cn(COLUMNS, "mb-8")} aria-hidden="true">
        <p
          className={cn(
            "text-right font-corinthia text-5xl md:text-6xl",
            left.ink,
          )}
        >
          {left.name}
        </p>
        <span />
        <p className={cn("font-corinthia text-5xl md:text-6xl", right.ink)}>
          {right.name}
        </p>
      </div>

      {days.map(({ day, items }) => {
        const rows = sidedRows(items);
        return (
          <section key={day} aria-labelledby={`day-${day}`} className="mb-6">
            <h2
              id={`day-${day}`}
              className="mb-8 text-center font-garamond text-2xl italic text-muted-foreground md:text-3xl"
            >
              {formatDay(day)}
            </h2>
            <ol>
              {rows.map((row, i) => (
                <li key={row.key}>
                  <Row
                    row={row}
                    role={role}
                    order={i}
                    isLast={i === rows.length - 1}
                  />
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </>
  );
}

function Row({
  row,
  role,
  order,
  isLast,
}: {
  row: SidedRow;
  role: Role;
  order: number;
  isLast: boolean;
}) {
  const delay = { animationDelay: `${Math.min(order, 10) * 45}ms` };

  if (row.kind === "stop") {
    // The guests' landmark, sat on the spine.
    return (
      <div className="flex flex-col items-center text-center">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-sm ring-1 ring-border grayscale-[0.6]"
        >
          {row.stop.icon}
        </span>
        <p className="mt-2 font-raleway text-xs uppercase tracking-[0.3em] text-primary">
          {formatWhen(row.stop)}
        </p>
        <h3 className="mt-1 font-garamond text-lg text-muted-foreground">
          {row.stop.title}
        </h3>
        {!isLast && <TimelineConnector className={cn(GAP, "mt-2")} />}
      </div>
    );
  }

  if (row.kind === "together") {
    return (
      <article
        className={cn(
          ARRIVE,
          "flex flex-col items-center slide-in-from-bottom-2",
        )}
        style={delay}
      >
        <span aria-hidden="true" className="size-3 rotate-45 bg-pop2" />
        <div className="mt-3 w-full max-w-md text-center">
          <EntryContent entry={row.entry} role={role} placement="center" />
        </div>
        {!isLast && <TimelineConnector className={cn(GAP, "mt-3")} />}
      </article>
    );
  }

  // Apart: the spine runs between the two halves for the row's full height,
  // and on through the gap below, so the cells carry the gap as padding.
  const [left, right] = SIDES;
  const gap = isLast ? undefined : "pb-12";
  return (
    <article className={COLUMNS}>
      <SideCell
        entry={row.bySide[left.id]}
        side={left}
        placement="left"
        role={role}
        delay={delay}
        className={gap}
      />
      <div aria-hidden="true" className="flex flex-col items-center">
        <div className="flex gap-1.5 pt-[0.35rem]">
          {SIDES.map(
            (side) =>
              row.bySide[side.id] && (
                <span
                  key={side.id}
                  className={cn("size-2.5 rotate-45", side.fill)}
                />
              ),
          )}
        </div>
        {!isLast && <TimelineConnector className="mt-2" />}
      </div>
      <SideCell
        entry={row.bySide[right.id]}
        side={right}
        placement="right"
        role={role}
        delay={delay}
        className={gap}
      />
    </article>
  );
}

/** One person's half of a row. Each half slides in from its own edge, so
    switching to this view draws the two sides in toward each other. */
function SideCell({
  entry,
  side,
  placement,
  role,
  delay,
  className,
}: {
  entry: RoleEntry | undefined;
  side: (typeof SIDES)[number];
  placement: Extract<Placement, "left" | "right">;
  role: Role;
  delay: React.CSSProperties;
  className?: string;
}) {
  if (!entry) return <div className={className} />;
  return (
    <div
      className={cn(
        ARRIVE,
        placement === "left"
          ? "text-right slide-in-from-left-3"
          : "slide-in-from-right-3",
        className,
      )}
      style={delay}
    >
      <EntryContent
        entry={entry}
        role={role}
        placement={placement}
        ink={side.ink}
        owner={side.name}
      />
    </div>
  );
}
