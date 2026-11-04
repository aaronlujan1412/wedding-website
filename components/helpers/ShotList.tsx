import Link from "next/link";
import { formatClock, formatTime } from "@/components/schedule/clock";
import { Lines } from "@/components/schedule/Lines";
import type { Role } from "@/components/schedule/roles";
import { visibleLines } from "@/components/schedule/timeline";
import { cardAnchor, helpersHref } from "./cards";
import type { FaceIndex } from "./faces";
import { shotList } from "./shots";

/**
 * The shot list, a stretch of the day at a time. Each stretch is anchored,
 * so the 1:30 entry on the schedule opens the page at the first look's
 * shots rather than at the top of the whole list.
 *
 * With the helpers' code in, each shot shows the faces of who's in it.
 * Without it, the list says where to get them.
 */
export function ShotList({ role, faces }: { role: Role; faces: FaceIndex | null }) {
  return (
    <div className="mt-6 space-y-12">
      {/* The stretches by their times, the way the day is read: at 3:15 the
          3:15 shots are a tap away instead of four sections down. */}
      <nav aria-label="Jump to a time" className="-mx-2.5 flex flex-wrap gap-1 print:hidden">
        {shotList.map((section) => (
          <a
            key={section.id}
            href={`#${cardAnchor({ card: "shots", section: section.id })}`}
            className="rounded-full px-2.5 py-1 font-raleway text-sm lining-nums tabular-nums text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:py-2"
          >
            {formatClock(section.time)}
            <span className="sr-only">, {section.title}</span>
          </a>
        ))}
      </nav>

      {!faces && (
        <p className="font-garamond text-lg leading-relaxed text-muted-foreground print:hidden">
          Enter the code under{" "}
          <Link
            href={helpersHref(role, { card: "faces" })}
            className="rounded-sm text-primary underline decoration-primary/40 underline-offset-[0.25em] hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            who’s who
          </Link>{" "}
          to see faces beside each shot.
        </p>
      )}
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
          <Lines
            lines={visibleLines(section.shots, role)}
            kind="checklist"
            faces={faces ?? undefined}
          />
        </section>
      ))}
    </div>
  );
}
