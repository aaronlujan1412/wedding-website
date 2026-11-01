import type { Role } from "./roles";
import type { Segment } from "./ceremony";
import type { Station } from "./menu";

/** A calendar date, `YYYY-MM-DD`. */
export type Day = "2026-11-30" | "2026-12-01";

/**
 * A line in a role's entry. A bare string is an ordinary line; the object
 * form is for lines that need more than words.
 */
export type Line =
  | string
  | {
      text: string;
      /** Who says it, when the text is the words themselves. */
      says?: string;
      /** Narrows the line to some of its entry's roles. Absent: all of them. */
      roles?: Role[];
      lines?: Line[];
      /** The children are an order to follow, so they're numbered. */
      ordered?: boolean;
      note?: string;
    };

type Timed = {
  day: Day;
  /** 24-hour `HH:MM`, so the timeline sorts as plain strings. */
  time: string;
  until?: string;
  /** "Not a set time": drawn as "About 7:00 PM". */
  approx?: boolean;
};

/** The schedule every guest sees. It's the spine every role view hangs off. */
export type GuestStop = Timed & {
  icon: string;
  title: string;
  body: string;
  notes?: { title: string; body: string }[];
};

/** Something one or more roles need to know, laid over the guest schedule. */
export type RoleEntry = Timed & {
  title: string;
  roles: Role[];
  /** The people this involves, when the doc names them. */
  who?: string[];
  body?: string;
  lines?: Line[];
  /** A run of show whose clock times are worked out from its durations. */
  segments?: Segment[];
  menu?: Station[];
};

export const guestStops: GuestStop[] = [
  {
    day: "2026-12-01",
    time: "15:00",
    icon: "☕",
    title: "Warm Welcomes & Cocoa",
    body: "As you arrive at the lodge, shake off the cold and step into the warmth. We’ll kick things off with a cozy hot cocoa hour inside to get everyone settled. Find your jingle bell on the welcome table to see where you’re sitting, and leave us a note on a playing card for the guestbook.",
  },
  {
    day: "2026-12-01",
    time: "16:15",
    icon: "💍",
    title: "The Ceremony",
    body: "Beneath the crisp winter sky, at the main entrance of the lodge, we’ll exchange our vows. This moment means everything to us — we’re not only joining together as husband and wife, but officially uniting our hearts as a family with our wonderful son, Daniel.",
    notes: [
      {
        title: "Stay in the Moment",
        body: "We’ll have two photographers and a videographer catching every second, so you’re welcome to snap a picture or two — just don’t forget to look up from the screen and be here with us.",
      },
      {
        title: "A Cozy Alternative",
        body: "Prefer to stay toasty? You’re welcome to watch from inside — the ceremony will be live-streamed on a projector right next to the fireplace.",
      },
    ],
  },
  {
    day: "2026-12-01",
    time: "17:00",
    icon: "🍲",
    title: "Dinner",
    body: "After the “I dos,” join us inside for an intimate, home-cooked reception. We’re pouring our hearts into a menu of our favorite winter comfort foods — including warm chili in sourdough bread bowls — cooked with love by us (but let’s be honest, mostly Aaron!). To drink, we’re keeping it cozy and completely alcohol-free — a help-yourself hot cocoa and spiced cider bar! Once everyone has been through the buffet, the mic is open if you’d like to give us a shout-out.",
  },
  {
    day: "2026-12-01",
    time: "18:00",
    icon: "🎶",
    title: "The First Dance",
    body: "Our first dance as husband and wife. By 6:30 the dance floor is open to everyone.",
  },
  {
    day: "2026-12-01",
    time: "19:00",
    approx: true,
    icon: "🎂",
    title: "Cutting the Cake",
    body: "Sometime around seven, once dinner has settled, we’ll cut the cake.",
  },
  {
    day: "2026-12-01",
    time: "21:00",
    icon: "🚗",
    title: "The Send-Off",
    body: "Bundle up and come outside to wave us off in our just-married car.",
  },
];
