import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The shortcuts lane: the one thing on the page that never scrolls away.
 *
 * The strip at the top is a picture of the song — proportional widths, the
 * heat of the arc — and it stops being navigation the moment you scroll past
 * it. This is the same movements as a plain list, parked in the margin, where
 * it can also say which one is being danced right now.
 *
 * Two gestures per row, which are the two the page already has: the name takes
 * you there, the play button takes it FROM there. Pressing play also makes the
 * walk-through scroll the page itself, so that one needs nothing found first.
 *
 * It needs a margin to live in, so it appears at `xl` and the strip stays the
 * navigation on anything narrower. `left` is measured off the column rather
 * than off the viewport, so the lane sits beside the sheet instead of drifting
 * out to the edge of a wide monitor.
 */

export type Stop = {
  key: string;
  label: string;
  /** The eight-counts it covers — what you say out loud: "from E32". */
  detail?: string;
  active?: boolean;
  onSelect: () => void;
  /** Absent for a landmark: a panel has nothing to walk. */
  onWalk?: () => void;
};

export function Rail({
  stops,
  places,
  canWalk,
}: {
  stops: Stop[];
  /** Panels you scroll back to rather than dance: the song, the reference. */
  places: Stop[];
  canWalk: boolean;
}) {
  return (
    <nav
      aria-label="Jump to"
      className="fixed top-[calc(var(--spacing-planner-bar)+2.5rem)] left-[max(1rem,calc(50%-37rem))] z-40 hidden max-h-[calc(100dvh-var(--spacing-planner-bar)-4rem)] w-44 overflow-y-auto print:hidden xl:block"
    >
      <p className="pl-2.5 font-raleway text-[0.6rem] tracking-[0.2em] text-muted-foreground uppercase">
        Jump to
      </p>
      <ul className="mt-2">
        {stops.map((stop) => (
          <Row key={stop.key} stop={stop} canWalk={canWalk} />
        ))}
      </ul>
      {places.length > 0 && (
        <ul className="mt-3 border-t border-border pt-3">
          {places.map((place) => (
            <Row key={place.key} stop={place} canWalk={canWalk} />
          ))}
        </ul>
      )}
    </nav>
  );
}

function Row({ stop, canWalk }: { stop: Stop; canWalk: boolean }) {
  return (
    <li
      className={cn(
        "flex items-stretch border-l-2 transition-colors motion-reduce:transition-none",
        stop.active ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={stop.onSelect}
        className="min-w-0 flex-1 rounded-sm py-1.5 pl-2.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <span
          className={cn(
            "block truncate font-garamond text-lg leading-tight",
            stop.active ? "text-primary" : "text-foreground",
          )}
        >
          {stop.label}
        </span>
        {stop.detail && (
          <span className="block truncate font-mono text-[0.6rem] tracking-wide text-muted-foreground tabular-nums slashed-zero">
            {stop.detail}
          </span>
        )}
      </button>

      {stop.onWalk && (
        <button
          type="button"
          disabled={!canWalk}
          onClick={stop.onWalk}
          title={canWalk ? `Walk ${stop.label}` : "Choose the mp3 first"}
          className="flex w-7 flex-none items-center justify-center rounded-sm text-primary/60 transition-colors hover:text-primary disabled:opacity-30 disabled:hover:text-primary/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
        >
          <Play className="h-2.5 w-2.5 fill-current" strokeWidth={0} />
          <span className="sr-only">Walk {stop.label}</span>
        </button>
      )}
    </li>
  );
}
