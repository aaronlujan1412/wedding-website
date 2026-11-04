import { crockPotCount, menu } from "@/components/schedule/menu";
import type { Line } from "@/components/schedule/schedule";

/** What goes in each car and box on Monday morning. */
export const packingList: Line[] = [
  {
    text: "Savea and Aaron’s car",
    checklist: true,
    lines: ["Table decor", "Mugs", "The misc. decor box"],
  },
  {
    text: "Mom and Dad’s truck",
    checklist: true,
    lines: ["Christmas trees", "The kitchen box", "Food coolers"],
  },
  {
    text: "In the misc. decor box",
    checklist: true,
    lines: [
      "The Jingle Jangle sign and seat-assignment gift tags",
      "The guestbook sign, deck of cards and markers",
      "Tablecloths, centerpieces and candle batteries",
      "Table numbers",
      "Lanterns and garland for the lovers’ table",
      "Wall garland, fireplace garland, command hooks and the wreath",
      "The LED Lujan sign",
      "The Polaroid camera and the ornament for the unity ceremony",
    ],
  },
  {
    text: "In the kitchen box and coolers",
    checklist: true,
    lines: [
      // Counted from the menu, so the box can't disagree with the buffet.
      `${crockPotCount(menu)} crock pots, ladles, tongs, the spaghetti spoon and a serving spoon`,
      "Chili verde, beef chili, pulled pork, spaghetti sauce, mac and cheese and Zuppa Toscana, all frozen ahead",
      "Frozen spaghetti noodles",
      "The lasagna, prepped in foil pans",
      "Prepped fruit and veggies",
      "Sam’s Club mini cheesecakes and the mosaic cake balls",
      "Vanilla ice cream, nuts, fudge, caramel, chocolate and strawberry sauces, sprinkles, whipped cream and graham crackers",
      "Bread, cheese, sour cream, chips, tomatoes, salsa and pico, black olives and parmesan",
    ],
  },
  {
    text: "Supplies: decor and tech",
    checklist: true,
    lines: [
      "Extra fairy lights",
      "Extension cords and power strips",
      "Extra batteries",
      "A tripod or phone mount for the livestream",
      "A portable power bank",
      "Extra Polaroid film",
    ],
  },
  {
    text: "Supplies: dining",
    checklist: true,
    lines: [
      "Heavy-duty dinnerware, cutlery and thick napkins",
      "Insulated cocoa cups and cold drink cups",
      "Extra drinks: soda and sparkling water",
      "Bags of ice",
    ],
  },
  {
    text: "Supplies: clean-up",
    checklist: true,
    lines: [
      "30-gallon heavy-duty trash bags",
      "Foil pans, Ziploc bags and Tupperware for leftovers",
      "Dish soap, a fresh sponge and paper towels",
    ],
  },
  {
    text: "Emergency kit",
    checklist: true,
    lines: [
      "Mini sewing kit",
      "Ibuprofen and Tylenol",
      "Band-Aids and antacids",
      "A stain remover pen",
      "A lighter or matches",
    ],
  },
];

/** Monday afternoon at the lodge, tables first. */
export const lodgeSetup: Line[] = [
  "Lay out the tables and chairs",
  {
    text: "Inside",
    lines: [
      "Guest tables: tablecloths, centerpieces, batteries in the candles, table numbers",
      "Lovers’ table: tablecloth, lanterns, garland",
      "Welcome table: tablecloth, the Jingle Jangle sign and gift tags (names and table numbers), and the guestbook sign, deck of cards and markers",
      "Wall garland: space out the command hooks, then hang the garland",
      "Fireplace: hang the garland, the wreath and the LED Lujan sign",
      "Trees: set them up and string the lights",
    ],
  },
  {
    text: "Outside",
    lines: [
      "Hang the garland",
      "Get the outside tree ready, but leave it inside until Tuesday",
    ],
  },
];

/** Tuesday night, once the car's gone. */
export const cleanUpList: Line[] = [
  "Pack the leftover food into containers",
  "Empty the hot cocoa carafes and station",
  "Rinse the dishes and the crock pots",
  "Pack away the table decor",
  "Take down the garlands, signs, trees and the rest of the decorations, inside and out",
];
