type NavPosition = "left" | "right" | "center";

interface NavItem {
  href: string;
  label: string;
  position: NavPosition;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/travel", label: "Travel", position: "left" },
  { href: "/schedule", label: "Schedule", position: "left" },
  { href: "/info", label: "Details", position: "left" },
  { href: "/", label: "Aaron & Savea", position: "center" },
  { href: "/story", label: "Our Story", position: "right" },
  { href: "/faq", label: "FAQ", position: "right" },
];
