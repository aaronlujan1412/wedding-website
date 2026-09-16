"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SECTIONS, isActive } from "./sections";

/**
 * The honeymoon's tabs, inside the planner bar on anything wider than a phone.
 * Icons come in only once there's room for them; between a phone and a
 * laptop the strip scrolls sideways rather than wrapping the bar.
 */
export function SectionTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Honeymoon sections"
      className="h-full min-w-0 overflow-x-auto [scrollbar-width:none] max-sm:hidden [&::-webkit-scrollbar]:hidden"
    >
      <ul className="flex h-full">
        {SECTIONS.map((section) => {
          const active = isActive(section, pathname);
          const Icon = section.icon;
          return (
            <li key={section.href} className="flex-none">
              <Link
                href={section.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full items-center gap-1.5 px-3 font-raleway text-[0.7rem] tracking-[0.2em] uppercase transition-colors",
                  "focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-primary-foreground",
                  active
                    ? "text-primary-foreground shadow-[inset_0_-2px_0_currentColor]"
                    : "text-primary-foreground/65 hover:text-primary-foreground",
                )}
              >
                <Icon
                  className="h-3.5 w-3.5 max-xl:hidden"
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

/**
 * On a phone the tabs are a bar along the bottom edge instead — they don't fit
 * across the top, and the bottom is where a thumb already is.
 */
export function SectionTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Honeymoon sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm sm:hidden print:hidden"
    >
      <ul className="grid grid-cols-5">
        {SECTIONS.map((section) => {
          const active = isActive(section, pathname);
          const Icon = section.icon;
          return (
            <li key={section.href}>
              <Link
                href={section.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-14 flex-col items-center justify-center gap-1 font-raleway text-[0.6rem] uppercase tracking-[0.12em] transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-ring",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-4 top-0 h-0.5 rounded-b-full bg-primary"
                  />
                )}
                <Icon
                  className="h-5 w-5"
                  strokeWidth={active ? 1.75 : 1.5}
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
