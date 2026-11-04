import "server-only";

/**
 * Who's who: the people the photographers and the coordinator need to put a
 * face to. First names only, the way the shot list says them — this file is
 * in a public repo, and the photos never are. Each photo is `<id>.webp` in
 * the private `helper-faces` bucket (`scripts/upload-faces.mjs`), drawn only
 * once someone has the helpers' code.
 *
 * Server-only so the list can't end up in a browser bundle by way of a
 * client component; the album and the shot list's faces are drawn on the
 * server, after the code has been checked.
 *
 * `tags` say how someone fits: the relationship the shot list calls them by,
 * or their part in the day. "With Adrian" rather than a guessed "wife" or
 * "girlfriend".
 */
export const CIRCLES = [
  { id: "us", title: "The three of us" },
  { id: "aaron-family", title: "Aaron’s family" },
  { id: "savea-family", title: "Savea’s family" },
  { id: "aaron-friends", title: "Aaron’s friends" },
  { id: "savea-friends", title: "Savea’s friends" },
] as const;

type CircleId = (typeof CIRCLES)[number]["id"];

type Person = {
  id: string;
  name: string;
  circle: CircleId;
  tags?: readonly string[];
};

export const PEOPLE = [
  { id: "aaron", name: "Aaron", circle: "us" },
  { id: "savea", name: "Savea", circle: "us" },
  { id: "daniel", name: "Daniel", circle: "us", tags: ["Our son"] },

  { id: "aarons-mom", name: "Aaron’s mom", circle: "aaron-family" },
  { id: "aarons-dad", name: "Aaron’s dad", circle: "aaron-family" },
  { id: "granny", name: "Granny", circle: "aaron-family" },
  { id: "ammon", name: "Ammon", circle: "aaron-family", tags: ["Aaron’s sibling"] },
  { id: "emily", name: "Emily", circle: "aaron-family", tags: ["With Ammon"] },
  { id: "evan", name: "Evan", circle: "aaron-family", tags: ["Aaron’s sibling"] },
  { id: "kristy", name: "Kristy", circle: "aaron-family", tags: ["Evan’s family"] },
  { id: "iris", name: "Iris", circle: "aaron-family", tags: ["Evan’s family"] },
  { id: "james", name: "James", circle: "aaron-family", tags: ["Evan’s family"] },
  // Evan's friend, and family in all but name: a sibling, but not in the
  // siblings-only shots.
  { id: "tj", name: "TJ", circle: "aaron-family", tags: ["Aaron’s sibling"] },
  {
    id: "easton",
    name: "Easton",
    circle: "aaron-family",
    tags: ["Aaron’s sibling", "Wedding party"],
  },
  {
    id: "alaysha",
    name: "Alaysha",
    circle: "aaron-family",
    tags: ["Aaron’s sibling", "Wedding party"],
  },
  { id: "harrison", name: "Harrison", circle: "aaron-family", tags: ["With Alaysha"] },

  { id: "renee", name: "Renee", circle: "savea-family", tags: ["Savea’s mom"] },
  { id: "mike", name: "Mike", circle: "savea-family", tags: ["Savea’s stepdad"] },
  { id: "brian", name: "Brian", circle: "savea-family", tags: ["Savea’s dad"] },
  {
    id: "brenna",
    name: "Brenna",
    circle: "savea-family",
    tags: ["Savea’s sibling", "Wedding party"],
  },
  { id: "logan", name: "Logan", circle: "savea-family", tags: ["Savea’s sibling"] },
  { id: "connor", name: "Connor", circle: "savea-family", tags: ["Savea’s sibling"] },
  { id: "annika", name: "Annika", circle: "savea-family", tags: ["Savea’s sibling"] },
  { id: "finnley", name: "Finnley", circle: "savea-family", tags: ["Savea’s sibling"] },

  { id: "adrian", name: "Adrian", circle: "aaron-friends", tags: ["Officiant"] },
  { id: "sarah", name: "Sarah", circle: "aaron-friends", tags: ["With Adrian"] },
  { id: "isaac", name: "Isaac", circle: "aaron-friends", tags: ["Witness"] },
  { id: "annie", name: "Annie", circle: "aaron-friends", tags: ["Witness", "With Isaac"] },
  { id: "caleb", name: "Caleb", circle: "aaron-friends" },
  { id: "acoya", name: "Acoya", circle: "aaron-friends", tags: ["With Caleb"] },
  { id: "michael", name: "Michael", circle: "aaron-friends" },
  { id: "rob", name: "Rob", circle: "aaron-friends" },
  { id: "hayden", name: "Hayden", circle: "aaron-friends" },

  { id: "makenzie", name: "MaKenzie", circle: "savea-friends" },
  { id: "savannah", name: "Savannah", circle: "savea-friends" },
  { id: "john", name: "John", circle: "savea-friends", tags: ["With Savannah"] },
] as const satisfies readonly Person[];

export type PersonId = (typeof PEOPLE)[number]["id"];
