"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SECTIONS, isActive } from "./sections";

/**
 * The honeymoon's tabs. Under the title on anything wider than a phone; on a
 * phone, a bar along the bottom edge instead — five tabs don't fit across the
 * top without scrolling, and the bottom is where a thumb already is.
 */
export function SectionTabs() {
  const pathname = usePathname();

  return (
    <>
      <nav
        aria-label="Honeymoon sections"
        className="mt-6 border-b border-border max-sm:hidden"
      >
        <ul className="-mb-px flex justify-center gap-1">
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
    </>
  );
}
