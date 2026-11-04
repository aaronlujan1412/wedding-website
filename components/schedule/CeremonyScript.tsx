import { cn } from "@/lib/utils";
import { segmentStarts, totalMinutes, type Segment } from "./ceremony";
import { addMinutes, formatClock, formatTime } from "./clock";
import { Lines } from "./Lines";
import type { Role } from "./roles";
import { visibleLines } from "./timeline";

/**
 * The ceremony as a run of show. Every role sees every part and its time —
 * a photographer still needs to know the vows start at 4:35 — but only the
 * lines meant for them, so Adrian's talking points stay in Adrian's copy.
 *
 * `compact` is the schedule's copy: each part's time and name and nothing
 * else, since the schedule is for when. The full script is the ceremony card.
 */
export function CeremonyScript({
  start,
  segments,
  role,
  compact = false,
}: {
  start: string;
  segments: Segment[];
  role: Role;
  compact?: boolean;
}) {
  const starts = segmentStarts(start, segments);
  const minutes = totalMinutes(segments);

  return (
    <div className="mt-3">
      <p className="font-garamond text-lg italic text-muted-foreground">
        About {minutes} minutes, ending around{" "}
        {formatTime(addMinutes(start, minutes))}.
      </p>

      <ol className={cn("border-t border-border", compact ? "mt-3" : "mt-5")}>
        {segments.map((segment, i) => (
          <li
            key={segment.title}
            className={cn(
              "border-b border-border break-inside-avoid",
              compact
                ? "grid grid-cols-[3.5rem_1fr] items-baseline gap-x-4 py-2"
                : "py-4 md:grid md:grid-cols-[3.5rem_1fr] md:gap-x-4",
            )}
          >
            {/* Above the title on a phone, where a column of times would
                cost the nested lines most of their width. A compact row has
                no nested lines, so it keeps its column. */}
            <span
              className={cn(
                "block font-raleway text-sm lining-nums tabular-nums text-pop2",
                !compact && "md:pt-1.5",
              )}
            >
              {formatClock(starts[i])}
            </span>
            <div>
              <h4
                className={cn(
                  "flex items-baseline justify-between gap-3 font-garamond text-foreground",
                  compact ? "text-lg" : "text-xl",
                )}
              >
                {segment.title}
                {segment.minutes ? (
                  <span className="shrink-0 font-raleway text-xs lining-nums tabular-nums text-muted-foreground">
                    {segment.minutes} min
                  </span>
                ) : null}
              </h4>
              {!compact && segment.goal && (
                <p className="mt-0.5 font-garamond text-base italic text-muted-foreground">
                  {segment.goal}
                </p>
              )}
              {!compact && <Lines lines={visibleLines(segment.lines, role)} />}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
