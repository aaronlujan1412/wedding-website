import {
  BedDouble,
  LayoutGrid,
  Plane,
  Printer,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

/**
 * The honeymoon's tabs. Each one is its own route under /honeymoon, so it can
 * be bookmarked on a phone, the back button moves between them, and each page
 * only loads its own data. The host gate in proxy.ts already covers
 * /honeymoon/:path*, so a new tab is protected the moment it exists.
 *
 * Adding a section is a page at app/honeymoon/<slug>/page.tsx plus one entry
 * here — nothing else needs to know.
 */
export type Section = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Only the board sits at the root, so it must match exactly. */
  exact?: boolean;
};

export const SECTIONS: Section[] = [
  { href: "/honeymoon", label: "Board", icon: LayoutGrid, exact: true },
  { href: "/honeymoon/flights", label: "Flights", icon: Plane },
  { href: "/honeymoon/lodging", label: "Lodging", icon: BedDouble },
  { href: "/honeymoon/itinerary", label: "Itinerary", icon: ScrollText },
  { href: "/honeymoon/pocket", label: "Pocket", icon: Printer },
];

export function isActive(section: Section, pathname: string) {
  return section.exact
    ? pathname === section.href
    : pathname === section.href || pathname.startsWith(`${section.href}/`);
}
