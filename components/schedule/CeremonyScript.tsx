import type { Segment } from "./ceremony";
import { Lines } from "./Lines";
import type { Role } from "./roles";
import {
  addMinutes,
  formatClock,
  formatTime,
  segmentStarts,
  totalMinutes,
  visibleLines,
} from "./timeline";

/**
 * The ceremony as a run of show. Every role sees every part and its time —
 * a photographer still needs to know the vows start at 4:35 — but only the
 * lines meant for them, so Adrian's talking points stay in Adrian's copy.
 */
export function CeremonyScript({
  start,
  segments,
  role,
}: {
  start: string;
  segments: Segment[];
  role: Role;
}) {
  const starts = segmentStarts(start, segments);
  const minutes = totalMinutes(segments);

  return (
    <div className="mt-3">
      <p className="font-garamond text-lg italic text-muted-foreground">
        About {minutes} minutes, ending around{" "}
        {formatTime(addMinutes(start, minutes))}.
      </p>

      <ol className="mt-5 border-t border-border">
        {segments.map((segment, i) => (
          <li
            key={segment.title}
            className="border-b border-border py-4 break-inside-avoid md:grid md:grid-cols-[3.5rem_1fr] md:gap-x-4"
          >
            {/* Above the title on a phone, where a column of times would
                cost the nested lines most of their width. */}
            <span className="block font-raleway text-sm lining-nums tabular-nums text-pop2 md:pt-1.5">
              {formatClock(starts[i])}
            </span>
            <div>
              <h4 className="flex items-baseline justify-between gap-3 font-garamond text-xl text-foreground">
                {segment.title}
                {segment.minutes ? (
                  <span className="shrink-0 font-raleway text-xs lining-nums tabular-nums text-muted-foreground">
                    {segment.minutes} min
                  </span>
                ) : null}
              </h4>
              {segment.goal && (
                <p className="mt-0.5 font-garamond text-base italic text-muted-foreground">
                  {segment.goal}
                </p>
              )}
              <Lines lines={visibleLines(segment.lines, role)} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
