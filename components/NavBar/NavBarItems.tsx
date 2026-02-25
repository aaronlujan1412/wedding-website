type NavPosition = "left" | "right" | "center";

interface NavItem {
  href: string;
  label: string;
  position: NavPosition;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/information", label: "Information", position: "left" },
  { href: "/schedule", label: "Schedule", position: "left" },
  { href: "/", label: "Aaron & Savea", position: "center" },
  { href: "/rsvp", label: "RSVP", position: "right" },
  { href: "/faq", label: "FAQ", position: "right" },
];
