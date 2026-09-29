"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ME_NAV } from "@/components/me/nav";

/**
 * The tabs. A client component only because it marks where you are.
 *
 * "You are here" is a pressed button rather than a coloured label, because on
 * a page built entirely out of bevels the raised/sunk pair already means
 * available/engaged, and a second way of saying it would be one too many.
 */
export function MeNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Site" className="flex flex-wrap gap-1.5">
      {ME_NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`px-3 py-1.5 font-dot text-[14px] leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold ${
              active
                ? "bevel-in bg-me-void text-me-gold"
                : "bevel-out bg-me-bar text-me-ink hover:bg-me-edge-hi"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
