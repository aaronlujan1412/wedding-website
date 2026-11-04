import { formatTime } from "@/components/schedule/clock";
import { Lines } from "@/components/schedule/Lines";
import type { Role } from "@/components/schedule/roles";
import { visibleLines } from "@/components/schedule/timeline";
import { cardAnchor } from "./cards";
import { shotList } from "./shots";

/**
 * The shot list, a stretch of the day at a time. Each stretch is anchored,
 * so the 1:30 entry on the schedule opens the page at the first look's
 * shots rather than at the top of the whole list.
 */
export function ShotList({ role }: { role: Role }) {
  return (
    <div className="mt-8 space-y-12">
      {shotList.map((section) => (
        <section
          key={section.id}
          id={cardAnchor({ card: "shots", section: section.id })}
          aria-labelledby={`shots-${section.id}-title`}
          className="scroll-mt-24 break-inside-avoid"
        >
          <p className="font-raleway text-sm font-medium lining-nums tabular-nums text-pop2">
            {formatTime(section.time)}
          </p>
          <h3
            id={`shots-${section.id}-title`}
            className="mt-1 font-garamond text-2xl text-foreground"
          >
            {section.title}
          </h3>
          <Lines lines={visibleLines(section.shots, role)} kind="checklist" />
        </section>
      ))}
    </div>
  );
}
