"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { cn } from "@/lib/utils";
import { STAFF_ROLES, helpersHref, isStaff, type HelperView } from "./cards";

const VIEWS: { view: HelperView; label: string; ask: string }[] = [
  { view: null, label: "Everyone", ask: "Everyone" },
  ...STAFF_ROLES.map((r) => ({ view: r.id, label: r.label, ask: `${r.label}?` })),
];

/**
 * Which helper page you're on: the open one, or a staff role's. The staff
 * buttons ask ("Photographer?") until you're on that page, which answers
 * them. The first thing after `/helpers` is a staff role or an open card,
 * so whichever page is open is read straight off the URL.
 */
export function HelperViews() {
  const segment = useSelectedLayoutSegment();
  const open: HelperView = segment && isStaff(segment) ? segment : null;

  return (
    <nav aria-label="Helper pages by role" className="mb-10 md:mb-8 print:hidden">
      <ul className="flex flex-wrap justify-center gap-2">
        {VIEWS.map(({ view, label, ask }) => {
          const selected = view === open;
          return (
            <li key={label}>
              <Link
                href={helpersHref(view)}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "inline-flex items-center rounded-full border px-4 py-1.5 font-raleway text-sm transition-colors pointer-coarse:py-2.5",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-primary hover:border-primary/40 hover:bg-secondary",
                )}
              >
                {selected ? label : ask}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
