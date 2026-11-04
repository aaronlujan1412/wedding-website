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
      "Savea and her siblings",
      "Aaron and his siblings",
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
      "The three of them with Aaron’s mom and dad",
      "The three of them with Savea’s mom and dad",
      "The three of them with Savea’s mom",
      "The three of them with all the parents",
      "Aaron and Savea’s couple portraits",
    ],
  },
  {
    id: "group-photos",
    time: "15:15",
    title: "Wedding party and family",
    shots: [
      "Aaron and Adrian",
      "Aaron and Savea with Adrian",
      "Aaron and Savea with Daniel, Adrian, Brenna, Easton and Alaysha",
      "Aaron and Savea with Daniel, Savea’s parents, Mike and the siblings",
      "Aaron and Savea with Daniel, Savea’s dad, Brenna and Logan",
      "Aaron and Savea with Daniel, Savea’s mom, Mike, Connor, Brenna, Annika and Finnley",
      "Aaron and Savea with Daniel, all the parents, all the siblings, spouses, nieces and nephews, and Granny",
      "Aaron and Savea with Daniel, Aaron’s parents, siblings, spouses, nieces and nephews",
      "Aaron and Savea with Granny",
      "Aaron and Savea with Daniel and Granny",
      "Aaron and Savea with Isaac and Annie",
      "Aaron and Savea with friend groups pulled from cocoa hour",
    ],
  },
  {
    id: "ceremony",
    time: CEREMONY_START,
    title: "The ceremony",
    shots: [
      "The parents walking down the aisle",
      "Easton, Alaysha and Brenna walking down the aisle",
      "Daniel stopping before the entrance",
      "Aaron and Savea meeting in the aisle and walking to Daniel",
      "The family hugging at the front",
      "Adrian snapping the Polaroid of the family",
      "Aaron, Savea and Daniel hanging the ornament on the tree",
      "Daniel presenting the rings, made from apple tree wood",
      "The vows and the ring exchange",
      "The first kiss",
      "The spin and dip kiss at the end of the aisle",
      "Signing the marriage certificate downstairs with Adrian, Annie and Isaac",
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
