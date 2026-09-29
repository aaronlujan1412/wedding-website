/**
 * The menu. Order here is order on screen, and a new page is one entry plus
 * the route — there is no second list to keep in step.
 */
export type MeNavItem = {
  label: string;
  href: string;
};

export const ME_NAV: MeNavItem[] = [
  { label: "Index", href: "/me" },
  { label: "About", href: "/me/about" },
  { label: "Second Brain", href: "/me/second-brain" },
];
