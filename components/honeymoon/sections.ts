import {
  BedDouble,
  Compass,
  LayoutGrid,
  NotebookPen,
  Plane,
  Printer,
  ScrollText,
  TramFront,
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
  { href: "/honeymoon/notes", label: "Notes", icon: NotebookPen },
  { href: "/honeymoon/flights", label: "Flights", icon: Plane },
  { href: "/honeymoon/transit", label: "Transit", icon: TramFront },
  { href: "/honeymoon/lodging", label: "Lodging", icon: BedDouble },
  { href: "/honeymoon/finder", label: "Finder", icon: Compass },
  { href: "/honeymoon/itinerary", label: "Itinerary", icon: ScrollText },
  { href: "/honeymoon/pocket", label: "Pocket", icon: Printer },
];

function section(href: string): Section {
  const found = SECTIONS.find((s) => s.href === href);
  if (!found) throw new Error(`No honeymoon section at ${href}`);
  return found;
}

/**
 * A phone's bottom bar has room for five, and there are seven tabs. These four
 * are what gets opened on a phone mid-trip — today's plan, and the times and
 * confirmation codes someone at a counter will ask for. The fifth slot holds
 * the rest, which is planning done at a laptop.
 *
 * The bar used to be a five-column grid of all seven, so Itinerary and Pocket
 * wrapped onto a second row that sat over the page.
 */
export const PHONE_BAR: Section[] = [
  section("/honeymoon/itinerary"),
  section("/honeymoon/flights"),
  section("/honeymoon/transit"),
  section("/honeymoon/lodging"),
];

export const PHONE_MORE: Section[] = SECTIONS.filter(
  (s) => !PHONE_BAR.includes(s),
);

export function isActive(section: Section, pathname: string) {
  return section.exact
    ? pathname === section.href
    : pathname === section.href || pathname.startsWith(`${section.href}/`);
}
