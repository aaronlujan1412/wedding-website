"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TOOL_TABS, toolFor } from "@/components/me/nav";

/**
 * Where you can go inside the tool you are already in.
 *
 * Deliberately quieter than the tabs above it: plain text, not bevelled
 * buttons. The top row switches between tools and this switches between pages
 * of one, so a second row of identical buttons would read as eight equal
 * destinations rather than four inside one.
 *
 * Renders nothing when signed out or outside a tool, which is why it takes the
 * session rather than reading it — a row of tabs that all redirect to the page
 * you are on is a menu of locked doors.
 */
export function ToolTabs({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const root = toolFor(pathname);

  if (!signedIn || !root) return null;
  const tabs = TOOL_TABS[root];

  return (
    <nav
      aria-label="Section"
      className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1"
    >
      {tabs.map((tab) => {
        // The tool's own root is only current when you are exactly on it;
        // everything else matches its subtree, so a recipe page keeps "Dishes"
        // lit rather than nothing.
        const active =
          tab.href === root
            ? pathname === root
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-xs font-dot text-[12px] leading-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-me-gold ${
              active
                ? "text-me-gold underline underline-offset-4"
                : "text-me-dim hover:text-me-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
