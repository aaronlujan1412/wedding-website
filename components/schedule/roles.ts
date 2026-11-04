/**
 * The people working the day, each with their own view of the schedule. A
 * role's id is its URL (`/schedule/photographers`), so the link you text
 * someone is the same word the data is tagged with.
 *
 * Nothing here is private: every view is one tap away from every guest. Keep
 * anything that shouldn't be read by the whole guest list off this page.
 */
export const ROLES = [
  {
    id: "wedding-party",
    label: "Wedding party",
    intro:
      "For Brenna, Easton and Alaysha, from the rehearsal on Monday night through the send-off.",
  },
  {
    id: "officiant",
    label: "Officiant",
    intro:
      "For Adrian. The ceremony minute by minute, with the full script and ideas for each part on your helper page.",
  },
  {
    id: "family",
    label: "Family",
    intro:
      "For our parents, Daniel, and everyone staying the night at the lodge.",
  },
  {
    id: "photographers",
    label: "Photo & video",
    intro:
      "For our two photographers and our videographer, from getting ready to the cake.",
  },
  {
    id: "coordinator",
    label: "Coordinator",
    intro:
      "From starting the food to the end of clean-up, with every music cue in between.",
  },
  {
    id: "setup-crew",
    label: "Setup crew",
    intro:
      "Packing the cars on Monday, setting up the lodge, the food, and the clean-up.",
  },
  {
    id: "aaron-and-savea",
    label: "Aaron & Savea",
    intro:
      "Our day side by side: Aaron on the left, Savea on the right, until we meet in the middle.",
    layout: "sides",
  },
] as const;

export type RoleInfo = (typeof ROLES)[number];
export type Role = RoleInfo["id"];

export function roleById(id: string): RoleInfo | undefined {
  return ROLES.find((r) => r.id === id);
}

/**
 * The two sides of a two-sided view, left then right. The inks are their
 * lanes from the honeymoon planner — her side is blue and his is violet
 * everywhere the two of them are drawn apart.
 */
export const SIDES = [
  { id: "aaron", name: "Aaron", ink: "text-lane-aaron", fill: "bg-lane-aaron" },
  { id: "savea", name: "Savea", ink: "text-lane-savea", fill: "bg-lane-savea" },
] as const;

export type Side = (typeof SIDES)[number]["id"];

/** Whether a role's view splits down the spine instead of hanging off it. */
export function isSided(role: Role | null) {
  const info = role ? roleById(role) : undefined;
  return info !== undefined && "layout" in info && info.layout === "sides";
}

/** `/schedule` is everyone; `/schedule/<role>` is that role laid over it. */
export function scheduleHref(role: Role | null) {
  return role ? `/schedule/${role}` : "/schedule";
}

export function roleFromPath(pathname: string): Role | null {
  const slug = pathname.split("/")[2];
  return (slug && roleById(slug)?.id) || null;
}
