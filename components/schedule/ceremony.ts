import type { Line } from "./schedule";

/**
 * One part of the ceremony. Only `minutes` is stored: each part's clock time
 * is worked out from the start time and the parts before it, so lengthening
 * the vows moves everything after them instead of leaving stale times behind.
 * A part with no minutes takes no time of its own on the clock.
 */
export type Segment = {
  title: string;
  minutes?: number;
  lines: Line[];
};

export const ceremony: Segment[] = [
  {
    title: "Opening",
    lines: [
      {
        text: "Adrian announces that the ceremony is beginning:",
        lines: [
          "Says hello",
          "Asks everyone to silence their phones and stay in the moment. A picture or two is fine; the photographers and videographer have the rest covered",
          "Mentions that the reception and dinner follow in the great room of the lodge",
        ],
      },
      "The coordinator presses play on the ceremony music.",
    ],
  },
  {
    title: "Processional",
    minutes: 5,
    lines: [
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
      "Aaron and Savea hug everyone at the entrance.",
      "The parents, Easton, Alaysha and Brenna take their seats.",
      "The coordinator stops the music.",
    ],
  },
  {
    title: "Welcome",
    minutes: 5,
    lines: [
      "Adrian welcomes everyone.",
      {
        text: "Ideas to talk about:",
        roles: ["officiant"],
        lines: [
          "The purpose of the day",
          "Aaron and Savea’s love story",
          "What marriage means to you",
          "What family means to you",
        ],
      },
    ],
  },
  {
    title: "Uniting a family",
    minutes: 2,
    lines: [
      "Adrian explains that today isn’t just two people coming together, but a family.",
      {
        text: "Ideas to talk about:",
        roles: ["officiant"],
        lines: [
          "A few words about Daniel coming into Aaron’s life, and then Savea joining the two of them",
          "How Christmas is such an important family time for Aaron and Savea, and why they wanted to tie it into uniting their family",
        ],
      },
      {
        text: "Adrian explains what happens next:",
        lines: [
          "A Polaroid picture to remember the day",
          "The picture goes into an ornament they’ll hang on their Christmas tree for the first time today, and every Christmas after",
          "The tree it hangs on is the one they’ll use at home",
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
      "Aaron and Savea share a few private words with Daniel.",
      "Hugs, and then Daniel goes back to his seat.",
    ],
  },
  {
    title: "Adrian’s blessing",
    minutes: 5,
    lines: [
      {
        text: "Ideas to talk about:",
        roles: ["officiant"],
        lines: [
          "Your history with Aaron, and how you two know each other",
          "A story from your past",
          "Stuff about Aaron",
          "Aaron meeting Savea",
          "Your impression of Aaron and Savea together",
        ],
      },
    ],
  },
  {
    title: "The rings",
    minutes: 3,
    lines: [
      {
        says: "Adrian",
        roles: ["officiant"],
        text: "As a symbol of their commitment to each other, Aaron and Savea have chosen to exchange their own vows, along with rings they made from the very same apple tree where they got engaged. A symbol of long-lasting love from Granny’s house, with Papa’s shoes tucked in the branches.",
        note: "It doesn’t need to be word for word, just something along these lines.",
      },
      "Adrian asks Daniel to bring up the rings.",
      "Daniel hands Aaron’s ring to Savea and Savea’s ring to Aaron, then sits back down.",
    ],
  },
  {
    title: "Savea’s vows",
    minutes: 5,
    lines: ["Savea reads her vows to Aaron, then puts his ring on his finger."],
  },
  {
    title: "Aaron’s vows",
    minutes: 5,
    lines: ["Aaron reads his vows to Savea, then puts her ring on her finger."],
  },
  {
    title: "The “I dos”",
    minutes: 2,
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
      { says: "Adrian", text: "Now, for the first time, Mr. and Mrs. Lujan!" },
      "The coordinator plays the recessional, “I Freakin Love You.”",
    ],
  },
  {
    title: "Recessional",
    lines: [
      "Aaron and Savea walk to the end of the aisle, do a spin and dip kiss, then walk back up through the lodge doors.",
      "Annie, Isaac and Adrian follow them downstairs to sign the marriage certificate.",
    ],
  },
  {
    title: "Back inside",
    lines: [
      "The coordinator stops the music and ushers everyone back into the lodge to find their seats.",
      "Annie, Isaac and Adrian head upstairs to their seats. Aaron and Savea take a few minutes alone.",
      "Brenna grabs a plate of food for Savea and Easton grabs one for Aaron, and they set them at the couple’s table.",
    ],
  },
];
