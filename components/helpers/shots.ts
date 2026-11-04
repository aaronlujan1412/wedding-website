import { CEREMONY_START } from "@/components/schedule/ceremony";
import type { Line } from "@/components/schedule/schedule";

/**
 * One stretch of the shot list. `id` is its anchor on the page, which is how
 * an entry on the schedule links straight to the shots it's for.
 */
export type ShotSection = {
  id: string;
  /** Tuesday, `HH:MM`, the same moment as the entry that links here. */
  time: string;
  title: string;
  shots: Line[];
};

export const shotList: ShotSection[] = [
  {
    id: "siblings",
    time: "12:30",
    title: "Details and siblings",
    shots: [
      "Savea’s dress, veil and gold jewelry",
      "Aaron’s suit, tan vest and tie",
      "The rings",
      "The venue",
      {
        text: "Savea and her siblings",
        people: ["brenna", "logan", "annika", "connor", "finnley"],
      },
      {
        text: "Aaron and his siblings",
        people: ["ammon", "evan", "easton", "alaysha"],
      },
    ],
  },
  {
    id: "first-look",
    time: "13:30",
    title: "The first look",
    shots: [
      "Wide establishing shots of the park",
      "Aaron’s reaction as he turns around",
      "Savea’s approach down the aisle",
      "The two of them embracing",
    ],
  },
  {
    id: "family-portraits",
    time: "13:45",
    title: "Family portraits",
    shots: [
      "Aaron, Savea and Daniel: the Lujan family",
      {
        text: "The three of them with Aaron’s mom and dad",
        people: ["aarons-mom", "aarons-dad"],
      },
      {
        text: "The three of them with Savea’s mom and dad",
        people: ["renee", "brian"],
      },
      {
        text: "The three of them with Savea’s mom",
        people: ["renee"],
      },
      {
        text: "The three of them with all the parents",
        people: ["aarons-mom", "aarons-dad", "renee", "brian", "mike"],
      },
      "Aaron and Savea’s couple portraits",
    ],
  },
  {
    id: "group-photos",
    time: "15:15",
    title: "Wedding party and family",
    shots: [
      {
        text: "Aaron and Adrian",
        people: ["adrian"],
      },
      {
        text: "Aaron and Savea with Adrian",
        people: ["adrian"],
      },
      {
        text: "Aaron and Savea with Daniel, Adrian, Brenna, Easton and Alaysha",
        people: ["adrian", "brenna", "easton", "alaysha"],
      },
      {
        text: "Aaron and Savea with Daniel, Savea’s parents, Mike and the siblings",
        people: [
          "renee",
          "brian",
          "mike",
          "brenna",
          "logan",
          "annika",
          "connor",
          "finnley",
        ],
      },
      {
        text: "Aaron and Savea with Daniel, Savea’s dad, Brenna and Logan",
        people: ["brian", "brenna", "logan"],
      },
      {
        text: "Aaron and Savea with Daniel, Savea’s mom, Mike, Connor, Brenna, Annika and Finnley",
        people: ["renee", "mike", "connor", "brenna", "annika", "finnley"],
      },
      "Aaron and Savea with Daniel, all the parents, all the siblings, spouses, nieces and nephews, and Granny",
      {
        text: "Aaron and Savea with Daniel, Aaron’s parents, siblings, spouses, nieces and nephews",
        people: [
          "aarons-mom",
          "aarons-dad",
          "ammon",
          "emily",
          "evan",
          "tj",
          "kristy",
          "iris",
          "james",
          "easton",
          "alaysha",
          "harrison",
        ],
      },
      {
        text: "Aaron and Savea with Granny",
        people: ["granny"],
      },
      {
        text: "Aaron and Savea with Daniel and Granny",
        people: ["granny"],
      },
      {
        text: "Aaron and Savea with Isaac and Annie",
        people: ["isaac", "annie"],
      },
      "Aaron and Savea with friend groups pulled from cocoa hour",
    ],
  },
  {
    id: "ceremony",
    time: CEREMONY_START,
    title: "The ceremony",
    shots: [
      {
        text: "The parents walking down the aisle",
        people: ["aarons-mom", "aarons-dad", "renee", "brian"],
      },
      {
        text: "Easton, Alaysha and Brenna walking down the aisle",
        people: ["easton", "alaysha", "brenna"],
      },
      "Daniel stopping before the entrance",
      "Aaron and Savea meeting in the aisle and walking to Daniel",
      "The family hugging at the front",
      {
        text: "Adrian snapping the Polaroid of the family",
        people: ["adrian"],
      },
      "Aaron, Savea and Daniel hanging the ornament on the tree",
      "Daniel presenting the rings, made from apple tree wood",
      "The vows and the ring exchange",
      "The first kiss",
      "The spin and dip kiss at the end of the aisle",
      {
        text: "Signing the marriage certificate downstairs with Adrian, Annie and Isaac",
        people: ["adrian", "annie", "isaac"],
      },
    ],
  },
  {
    id: "reception",
    time: "17:00",
    title: "The grand entrance and dinner",
    shots: [
      "The grand entrance from the stairs",
      "The welcome speech on the dance floor",
      "Candids at the buffet",
      "Guests giving their open mic shout-outs",
    ],
  },
];
