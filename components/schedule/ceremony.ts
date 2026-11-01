import { addMinutes } from "./clock";
import type { Line } from "./schedule";

/** When the ceremony starts. The guest stop, the run of show and the
    couple's view all read it, so moving the ceremony is one edit. */
export const CEREMONY_START = "16:15";

/**
 * One part of the ceremony. Only `minutes` is stored: each part's clock time
 * is worked out from the start time and the parts before it, so lengthening
 * the vows moves everything after them instead of leaving stale times behind.
 * A part with no minutes takes no time of its own on the clock.
 */
export type Segment = {
  title: string;
  minutes?: number;
  /** What the part is for, in a line. Everyone sees it; it's how a
      photographer knows the blessing is Adrian's moment, not a lull. */
  goal?: string;
  lines: Line[];
};

const EXAMPLE_NOTE = "An example. Take whatever creative freedom you like.";

export const ceremony: Segment[] = [
  {
    title: "Welcome and housekeeping",
    minutes: 1,
    goal: "Ground the room and handle the housekeeping.",
    lines: [
      "Adrian welcomes everyone and asks them to silence their phones.",
      {
        text: "Talking points:",
        roles: ["officiant"],
        lines: [
          "Welcome the guests",
          "Ask everyone to silence their phones and stay in the moment. A picture or two is fine; the photographers and videographer have the rest covered",
          "Mention that the reception and dinner follow in the great room of the lodge",
        ],
      },
      {
        says: "Adrian",
        roles: ["officiant"],
        text: "Welcome, family and friends. Before we begin, please silence your phones. Aaron and Savea have two photographers and a videographer here today, so you’re welcome to take a picture or two, but they’d love for you to be fully present with them in this moment. Dinner follows right after the ceremony, inside the great room of the lodge.",
        note: EXAMPLE_NOTE,
      },
    ],
  },
  {
    title: "Processional",
    minutes: 4,
    lines: [
      "As soon as Adrian finishes, the coordinator presses play on the processional music.",
      "Each person starts walking when the one before them is halfway to the lodge entrance, and stops under the entrance unless their line says otherwise.",
      {
        text: "In this order:",
        ordered: true,
        lines: [
          "Aaron’s mom and dad",
          "Savea’s mom and dad",
          "Easton and Alaysha",
          "Brenna",
          "Daniel, who stops just before the entrance",
          "Aaron, who stops halfway down the aisle",
          "Savea, who meets Aaron halfway. They walk together to Daniel, and the three of them walk up to the entrance together",
        ],
      },
      "Aaron, Savea and Daniel hug everyone waiting at the entrance.",
      "After the hugs, everyone sits down except Adrian, Aaron and Savea.",
      "The coordinator fades the music out so Adrian can begin.",
    ],
  },
  {
    title: "Opening address",
    minutes: 3,
    goal: "Open the ceremony with Aaron and Savea’s love story, and what family and marriage mean.",
    lines: [
      {
        text: "Talking points:",
        roles: ["officiant"],
        lines: [
          "The purpose of today",
          "A brief look at Aaron and Savea’s love story",
          "What marriage and family mean to Adrian",
        ],
      },
    ],
  },
  {
    title: "Uniting a family",
    minutes: 2,
    goal: "Shift the focus to a family coming together, not just a couple.",
    lines: [
      {
        text: "Talking points:",
        roles: ["officiant"],
        lines: [
          "Daniel coming into Aaron’s life, and Savea joining the two of them",
          "Why Christmas: Aaron grew up with it as the most important family holiday, which is why it felt perfect to unite their family during the season, and why they chose such a Christmassy unity ceremony",
        ],
      },
      {
        text: "Adrian explains the unity ceremony:",
        lines: [
          "He’ll take a Polaroid to remember the day",
          "The three of them put the picture into an ornament and hang it on the Christmas tree, for the first time today and every Christmas after",
          "This tree is the one they’ll use at home for every family Christmas to come",
        ],
      },
    ],
  },
  {
    title: "The ornament",
    minutes: 3,
    lines: [
      "Adrian takes a Polaroid of Aaron, Savea and Daniel.",
      "The three of them put the photo into the ornament and hang it on the tree.",
      "Aaron and Savea take a private moment to speak to Daniel.",
      {
        text: "Catch the emotion here without intruding on the audio.",
        roles: ["photographers"],
      },
      "Hugs, and then Daniel goes back to his seat.",
    ],
  },
  {
    title: "Adrian’s blessing",
    minutes: 5,
    goal: "Adrian’s time to shine, and to share his own connection to Aaron and to the couple.",
    lines: [
      {
        text: "Talking points:",
        roles: ["officiant"],
        lines: [
          "Adrian’s history with Aaron, and how they know each other",
          "A funny or meaningful story from their past",
          "What Aaron was like before he met Savea, and what changed when he did",
          "Adrian’s impression of Savea",
          "Adrian’s impression of Aaron and Savea together",
        ],
      },
    ],
  },
  {
    title: "The rings",
    minutes: 2,
    goal: "Bring Daniel back up with the rings, share what they’re made of, and move into the vows.",
    lines: [
      "Adrian asks Daniel whether he gives his blessing by bringing up the rings.",
      "Daniel hands Aaron’s ring to Savea and Savea’s ring to Aaron, then sits back down.",
      {
        text: "Talking points:",
        roles: ["officiant"],
        lines: [
          "Aaron and Savea are exchanging their own vows",
          "They handmade the rings from the apple tree where they got engaged",
        ],
      },
      {
        says: "Adrian",
        roles: ["officiant"],
        text: "As a symbol of their commitment to each other, Aaron and Savea have chosen to exchange their own vows, along with rings they made from the very same apple tree where they got engaged. A symbol of long-lasting love from Granny’s house, with Papa’s shoes tucked in the branches.",
        note: EXAMPLE_NOTE,
      },
    ],
  },
  {
    title: "Personal vows",
    minutes: 10,
    lines: [
      "Savea reads her vows to Aaron, about 5 minutes, then puts his ring on his finger.",
      "Aaron reads his vows to Savea, about 5 minutes, then puts her ring on her finger.",
    ],
  },
  {
    title: "Closing and pronouncement",
    minutes: 2,
    goal: "The final wrap-up, the “I do”s, and the big reveal.",
    lines: [
      "Adrian gives his last well-wishes, and reminds everyone that dinner and dancing follow in the lodge, but to stay in their seats until the coordinator lets them know.",
      { says: "Adrian", text: "Aaron, do you take Savea to be your wife?" },
      { says: "Aaron", text: "I do." },
      { says: "Adrian", text: "Savea, do you take Aaron to be your husband?" },
      { says: "Savea", text: "I do." },
      {
        says: "Adrian",
        text: "By the power vested in me, I now pronounce you the Lujans. Aaron, you may kiss your bride.",
      },
      "Aaron and Savea kiss.",
      { says: "Adrian", text: "Now, for the first time ever, Mr. and Mrs. Lujan!" },
      "The moment Adrian says “Mr. and Mrs. Lujan,” the coordinator presses play on the recessional, “I Freakin Love You.”",
    ],
  },
  {
    title: "Recessional",
    lines: [
      "Aaron and Savea walk down the aisle between the chairs, do a spin and dip kiss at the end, and head back up through the lodge doors.",
      { text: "Be ready for the spin and dip kiss.", roles: ["photographers"] },
      "Adrian grabs Annie and Isaac and follows them downstairs to sign the marriage certificate.",
      {
        text: "Follow them all downstairs straight away to capture the signing.",
        roles: ["photographers"],
      },
      "Once the wedding party is inside, the coordinator stops the music.",
    ],
  },
  {
    title: "Back inside",
    lines: [
      "The coordinator asks everyone to pick up their chair and carry it back inside, then find their assigned seats. Every chair has to come back in.",
      {
        text: "The coordinator stops the livestream and tucks the camera somewhere safe behind the bar.",
        roles: ["coordinator"],
      },
      "Annie, Isaac and Adrian head upstairs to their seats. Aaron and Savea take a few minutes alone.",
      "Brenna grabs a plate of food for Savea and Easton grabs one for Aaron, and they set them at the couple’s table.",
    ],
  },
];

/** Each segment's start, running the clock forward from `start`. */
export function segmentStarts(start: string, segments: Segment[]) {
  let clock = start;
  return segments.map((segment) => {
    const at = clock;
    clock = addMinutes(clock, segment.minutes ?? 0);
    return at;
  });
}

export function totalMinutes(segments: Segment[]) {
  return segments.reduce((sum, s) => sum + (s.minutes ?? 0), 0);
}

/** When the timed parts run out and the recessional starts. */
export const CEREMONY_END = addMinutes(CEREMONY_START, totalMinutes(ceremony));
