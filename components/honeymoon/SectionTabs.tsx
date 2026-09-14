"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SECTIONS, isActive } from "./sections";

export function SectionTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Honeymoon sections"
      className="mt-6 border-b border-border"
    >
      {/* Scrolls sideways on a phone rather than wrapping into two rows. */}
      <ul className="rail-scroll -mb-px flex justify-start gap-1 overflow-x-auto sm:justify-center">
        {SECTIONS.map((section) => {
          const active = isActive(section, pathname);
          const Icon = section.icon;
          return (
            <li key={section.href} className="flex-none">
              <Link
                href={section.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 border-b-2 px-3 py-2.5 font-raleway text-[0.7rem] uppercase tracking-[0.2em] transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon
                  className="h-3.5 w-3.5"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
