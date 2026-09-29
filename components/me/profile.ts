/**
 * Everything the profile column and the footer say about me, in one place.
 *
 * No addresses, ports, hostnames or tokens anywhere in here: the homelab is
 * on a private network and none of it is what makes any of this interesting.
 */

/** The handle, as it appears on the title bar of the user panel. */
export const HANDLE = "aaronlujan1412";

/** Rank, the way a board would render it: stars, then the title. */
export const RANK = { stars: 3, title: "sysop" };

/** What I'm doing, which is what a status line is for. */
export const STATUS = "shipping a wedding site";

/** Profile fields. Short values only — this column is 232px wide. */
export const FIELDS: [string, string][] = [
  ["location", "Salt Lake City"],
  ["trade", "Angular, C#"],
  ["lately", "TypeScript, Postgres"],
];

/** Notes in the second brain, for the counter. */
export const NOTE_COUNT = 3400;

/**
 * The ticker. It scrolls, so it has to be worth reading — these are the
 * things I'd tell you if you'd just wandered in.
 */
export const TICKER = [
  "welcome to the internet i actually liked",
  "now building — a wedding site, and the trip planner behind it",
  "second brain — 3,400 notes, searchable by anything that speaks mcp",
  "angular and c# by trade, typescript and postgres lately",
  "best viewed with the sound on",
];

/** The footer buttons. All of these are true, which is the joke. */
export const BADGES: { mark: string; text: string; chip: string }[] = [
  { mark: "N", text: "NEXT.JS 16", chip: "#ece7fb" },
  { mark: "P", text: "POSTGRES", chip: "#5ce1ff" },
  { mark: "T", text: "TAILSCALE", chip: "#5ef08f" },
  { mark: "M", text: "MCP INSIDE", chip: "#ffc93c" },
  { mark: "0", text: "NO COOKIES", chip: "#ff5fa8" },
  { mark: "OK", text: "ANY BROWSER", chip: "#d8cdb8" },
];
