import { CardLinks } from "@/components/helpers/CardLinks";
import { cn } from "@/lib/utils";
import { CeremonyScript } from "./CeremonyScript";
import { Lines } from "./Lines";
import type { Role } from "./roles";
import type { RoleEntry } from "./schedule";
import { formatWhen, joinNames, visibleLines } from "./timeline";

/**
 * Where an entry is drawn: hanging off the rail, on one side of a two-sided
 * view, or across its middle. Sides are narrow, so they set smaller; the
 * left mirrors so it reads toward the spine.
 */
export type Placement = "rail" | "left" | "right" | "center";

/** Everything an entry says, whichever layout it sits in. */
export function EntryContent({
  entry,
  role,
  placement = "rail",
  ink = "text-pop2",
  owner,
}: {
  entry: RoleEntry;
  role: Role;
  placement?: Placement;
  /** The time's colour: cranberry, or a side's own ink. */
  ink?: string;
  /** Whose side it's on, for screen readers that can't see which column. */
  owner?: string;
}) {
  const sided = placement === "left" || placement === "right";
  const lines = visibleLines(entry.lines, role);

  return (
    <>
      <p className={cn("font-raleway text-sm font-medium lining-nums tabular-nums", ink)}>
        {formatWhen(entry)}
      </p>
      <h3
        className={cn(
          "mt-1 font-garamond text-foreground",
          sided ? "text-xl md:text-2xl" : "text-2xl md:text-[1.75rem]",
        )}
      >
        {owner && <span className="sr-only">{owner}: </span>}
        {entry.title}
      </h3>
      {entry.who && (
        <p className="mt-1 font-raleway text-sm text-muted-foreground">
          With {joinNames(entry.who)}
        </p>
      )}
      {entry.body && (
        <p
          className={cn(
            "mt-2 font-garamond leading-relaxed text-foreground/90",
            sided ? "text-base md:text-lg" : "text-lg",
          )}
        >
          {entry.body}
        </p>
      )}
      {placement === "center" ? (
        // A centered list is unreadable; centre the block, not the lines.
        <div className="mx-auto w-fit max-w-full text-left">
          <Lines lines={lines} />
        </div>
      ) : (
        <Lines
          lines={lines}
          align={placement === "left" ? "end" : "start"}
          small={sided}
        />
      )}
      {entry.segments && (
        <CeremonyScript
          start={entry.time}
          segments={entry.segments}
          role={role}
          compact
        />
      )}
      {entry.see && (
        <CardLinks
          links={entry.see}
          role={role}
          align={placement === "left" ? "end" : placement === "center" ? "center" : "start"}
          className="mt-4"
        />
      )}
    </>
  );
}
