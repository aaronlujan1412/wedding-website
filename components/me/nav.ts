/**
 * The menu. Order here is order on screen, and a new page is one entry plus
 * the route — there is no second list to keep in step.
 *
 * Tools live at the top level beside the portfolio pages, because most of them
 * are both: signed out they are a write-up of what the thing does, signed in
 * they are the thing.
 */
export type MeNavItem = {
  label: string;
  href: string;
};

export const ME_NAV: MeNavItem[] = [
  { label: "Index", href: "/me" },
  { label: "About", href: "/me/about" },
  { label: "Second Brain", href: "/me/brain" },
  { label: "Meals", href: "/me/meals" },
];

/**
 * The screens inside a tool.
 *
 * Kept here rather than in each tool so there is one answer to "what pages does
 * this thing have" — the top nav gets you to a tool and this gets you around
 * inside it, which is the bit that was missing: four screens reachable only by
 * typing their addresses.
 *
 * Only shown to someone signed in. Signed out a tool is a single page about
 * itself, and a row of tabs leading to redirects is a menu of doors that are
 * all locked.
 */
export const TOOL_TABS: Record<string, MeNavItem[]> = {
  "/me/brain": [
    { label: "Hub", href: "/me/brain" },
    { label: "Notes", href: "/me/brain/notes" },
    { label: "Inbox", href: "/me/brain/inbox" },
  ],
  "/me/meals": [
    { label: "This month", href: "/me/meals" },
    { label: "Dishes", href: "/me/meals/recipes" },
    { label: "Prices", href: "/me/meals/prices" },
    { label: "Setup", href: "/me/meals/settings" },
  ],
};

/** Which tool a path is inside, if any. */
export function toolFor(pathname: string): string | null {
  return (
    Object.keys(TOOL_TABS).find(
      (root) => pathname === root || pathname.startsWith(`${root}/`),
    ) ?? null
  );
}
