import { CEREMONY_END, CEREMONY_START, ceremony } from "./ceremony";
import { crockPotCount, menu } from "./menu";
import type { RoleEntry } from "./schedule";

/**
 * Everything the guest schedule doesn't say, tagged with who needs it. One
 * moment is one entry however many roles share it, so the 4:15 ceremony is
 * written once and each view filters it — never copied out per role.
 */
export const roleEntries: RoleEntry[] = [
  // Monday, November 30 ------------------------------------------------

  {
    day: "2026-11-30",
    time: "10:00",
    title: "Pack up the cars",
    roles: ["setup-crew"],
    lines: [
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
    ],
  },
  {
    day: "2026-11-30",
    time: "13:30",
    title: "Drive to Indian Ridge Lodge",
    roles: ["setup-crew"],
    body: "About 90 minutes.",
  },
  {
    day: "2026-11-30",
    time: "15:00",
    title: "Set up the lodge",
    roles: ["setup-crew"],
    lines: [
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
    ],
  },
  {
    day: "2026-11-30",
    time: "15:00",
    title: "Set up the cocoa bar and buffet",
    roles: ["setup-crew"],
    lines: [
      "Cocoa bar: wash the mugs, set them out, and prep the toppings",
      "Lay out the buffet stations",
    ],
  },
  {
    day: "2026-11-30",
    time: "16:15",
    title: "Pick Daniel up from school",
    roles: ["family", "wedding-party"],
    body: "Alaysha picks him up and drives him to the lodge.",
  },
  {
    day: "2026-11-30",
    time: "18:00",
    title: "Dinner",
    roles: ["wedding-party", "officiant", "family", "setup-crew"],
    body: "Frozen pizzas.",
  },
  {
    day: "2026-11-30",
    time: "19:00",
    title: "Rehearsal",
    roles: ["wedding-party", "officiant", "family"],
    body: "A run through the ceremony, start to finish.",
    who: [
      "Aaron",
      "Savea",
      "Daniel",
      "Adrian",
      "Brenna",
      "Easton",
      "Alaysha",
      "Aaron’s parents",
      "Savea’s parents",
    ],
  },
  {
    day: "2026-11-30",
    time: "20:00",
    title: "Welcome hangout",
    roles: ["wedding-party", "officiant", "family", "setup-crew"],
  },
  {
    day: "2026-11-30",
    time: "23:00",
    title: "Bedtime",
    roles: ["wedding-party", "officiant", "family", "setup-crew"],
    body: "Rest up for the big day.",
  },

  // Tuesday, December 1: the morning -----------------------------------

  {
    day: "2026-12-01",
    time: "08:30",
    title: "Breakfast, served by the lodge",
    roles: ["wedding-party", "officiant", "family", "aaron-and-savea"],
    body: "For everyone who stayed the night:",
    lines: [
      "Aaron, Savea and Daniel",
      "Adrian, Sarah, Alice and William",
      "Easton",
      "Alaysha and Harrison",
      "Brenna",
      "Mom and Dad",
      "Ammon and Emily",
      "Mom, Mike, Connor and Finn",
      "Dad and Logan",
    ],
  },
  {
    day: "2026-12-01",
    time: "09:00",
    title: "Set up for the ceremony",
    roles: ["setup-crew"],
    lines: ["Bring the chairs outside", "Set up the outside tree"],
  },
  {
    day: "2026-12-01",
    time: "09:30",
    until: "12:30",
    title: "Get ready",
    roles: ["wedding-party", "officiant", "family", "aaron-and-savea"],
    body: "Hair, makeup and getting dressed.",
  },
  {
    day: "2026-12-01",
    time: "11:30",
    title: "Arrive and set up",
    roles: ["photographers"],
  },
  {
    day: "2026-12-01",
    time: "12:00",
    title: "Getting-ready photos",
    roles: ["photographers"],
    lines: [
      "Photographer 1: Aaron and Daniel getting ready. Aaron in his wedding suit, Daniel in his suit",
      "Photographer 2: Savea getting ready, in her wedding dress",
      "The videographer floats between the two",
      "Key shots: casual moments and the final getting-ready details",
    ],
  },
  {
    day: "2026-12-01",
    time: "12:30",
    title: "Sibling photos",
    roles: ["photographers", "wedding-party", "family"],
    lines: [
      "Photographer 1: Aaron and his siblings, Ammon, Evan, Easton and Alaysha",
      "Photographer 2: Savea and her siblings, Brenna, Annika, Connor, Finnley and Logan",
      "The videographer floats between the two",
      {
        text: "Shot list",
        checklist: true,
        lines: [
          "Savea’s dress, veil and gold jewelry",
          "Aaron’s suit, tan vest and tie",
          "The rings",
          "The venue",
          "Savea and her siblings",
          "Aaron and his siblings",
        ],
      },
    ],
  },

  // The first look -----------------------------------------------------

  {
    day: "2026-12-01",
    time: "13:00",
    title: "Drive to Power Plant Park",
    roles: ["photographers", "family"],
    body: "About 30 minutes. Aaron and Savea: bring the rings.",
    lines: [
      "Car 1: the photo and video team",
      "Car 2: Savea, Mom and Dad",
      "Car 3: Aaron, Mom, Dad and Daniel",
    ],
  },
  {
    day: "2026-12-01",
    time: "13:30",
    title: "The first look",
    roles: ["photographers", "family"],
    lines: [
      "Aaron stands about 15 feet away, with his back to the aisle",
      "Savea gets ready",
      "Savea walks down the aisle toward Aaron, and he turns around to see her",
      "The family waits in the cars until after they meet",
      {
        text: "Shot list",
        roles: ["photographers"],
        checklist: true,
        lines: [
          "Wide establishing shots of the park",
          "Aaron’s reaction as he turns around",
          "Savea’s approach down the aisle",
          "The two of them embracing",
        ],
      },
    ],
  },
  {
    day: "2026-12-01",
    time: "13:45",
    title: "Family portraits and couple photos",
    roles: ["photographers", "family", "aaron-and-savea"],
    lines: [
      "Start with the parents and Daniel, then the bigger family and parent photos",
      "Once their photos are done, the parents and Daniel head back early in Car 3",
      "The rest of the time is Aaron and Savea’s couple portraits",
      {
        text: "Shot list",
        checklist: true,
        lines: [
          "Aaron, Savea and Daniel: the Lujan family",
          "The three of them with Aaron’s mom and dad",
          "The three of them with Savea’s mom and dad",
          "The three of them with Savea’s mom",
          "The three of them with all the parents",
          "Aaron and Savea’s couple portraits",
        ],
      },
    ],
  },
  {
    day: "2026-12-01",
    time: "14:00",
    title: "The coordinator arrives and starts the food",
    roles: ["coordinator", "setup-crew"],
    body: "Aaron and Savea are off taking photos, and the wedding party is at the lodge to help with any last setup.",
    lines: [
      `Get all ${crockPotCount(menu)} crock pots going. The buffet card below has how`,
      "Start on the hot cocoa bar: mix the ingredients, set out the mix-ins, fill the water carafes and arrange the cups on the tables",
      "Check the welcome table has the Jingle Jangle gift tags, the deck-of-cards guestbook and the markers",
    ],
    menu,
  },
  {
    day: "2026-12-01",
    time: "14:30",
    title: "Set up the cocoa bar",
    roles: ["wedding-party"],
    who: ["Easton", "Alaysha", "Brenna"],
    lines: [
      "Mix the ingredients",
      "Set out the mix-ins",
      "Fill the water carafes and set cups on the tables",
    ],
  },
  {
    day: "2026-12-01",
    time: "14:45",
    title: "Drive back to the lodge",
    roles: ["photographers", "aaron-and-savea"],
    body: "About 30 minutes.",
    lines: [
      "Car 1: the photo and video team",
      "Car 2: Aaron and Savea, following",
    ],
  },

  // Cocoa hour ---------------------------------------------------------

  {
    day: "2026-12-01",
    time: "15:00",
    title: "Welcome the guests",
    roles: ["wedding-party"],
    who: ["Easton", "Alaysha", "Brenna"],
    lines: [
      "Invite everyone in for cocoa hour. The cocoa bar is open",
      "Guests can drop their things at their assigned table",
      "Point them to the guestbook",
    ],
  },
  {
    day: "2026-12-01",
    time: "15:00",
    title: "Lasagna in, guests arriving",
    roles: ["coordinator"],
    lines: [
      "Put the lasagna pans in the oven at 375°F for 1½ to 2 hours",
      "Make sure Easton, Alaysha and Brenna are inviting guests in for cocoa hour. Remind guests they can leave their things at their assigned tables, and point them to the guestbook",
      "Put the serving utensils at the buffet: ladles, tongs, the spaghetti spoon and the serving spoons",
      "Set out the bread, chips, tomatoes, cheese, salsa and pico, sour cream, black olives and parmesan",
    ],
  },
  {
    day: "2026-12-01",
    time: "15:15",
    title: "Wedding party and family photos",
    roles: [
      "photographers",
      "wedding-party",
      "family",
      "coordinator",
      "aaron-and-savea",
    ],
    lines: [
      "Wedding party photos",
      "Extended family photos around the lodge",
      "As time allows, the coordinator pulls friend groups out of cocoa hour for photos with the bride and groom",
      {
        text: "The coordinator helps the photographers round everyone up.",
        roles: ["coordinator"],
      },
      {
        text: "Shot list",
        checklist: true,
        lines: [
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
    ],
  },
  {
    day: "2026-12-01",
    time: "15:15",
    title: "Set up the livestream",
    roles: ["coordinator"],
    body: "Put the broadcast camera on its tripod, frame it on the aisle and the tree, and start the stream.",
  },

  // The ceremony -------------------------------------------------------

  {
    day: "2026-12-01",
    time: "16:00",
    title: "Seat the ceremony",
    roles: ["coordinator"],
    lines: [
      "Start ushering everyone out of the lodge to find their seats outside",
      "Tell them to use the restroom now. They can’t get back into the lodge for about 30 to 45 minutes once the ceremony starts",
      "Make sure the wedding party (everyone but Adrian) is lined up at the back door, ready to walk",
    ],
  },
  {
    day: "2026-12-01",
    time: "16:00",
    title: "Head out the back door",
    roles: ["wedding-party"],
    body: "Everyone but Adrian heads out the back door to line up for the processional.",
  },
  {
    day: "2026-12-01",
    time: "16:00",
    title: "Ceremony details",
    roles: ["photographers"],
    lines: [
      "Guests finding their seats outside",
      "Detail shots of the ceremony space: the tree, the garland",
      "The coordinator has a camera on a tripod for the livestream. Work out angles with her so you don’t block the stream, and keep the tripod out of your main shots",
    ],
  },
  {
    day: "2026-12-01",
    time: CEREMONY_START,
    title: "The ceremony, minute by minute",
    roles: [
      "officiant",
      "coordinator",
      "wedding-party",
      "family",
      "photographers",
    ],
    lines: [
      {
        text: "Shot list",
        roles: ["photographers"],
        checklist: true,
        lines: [
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
    ],
    segments: ceremony,
  },

  // The reception ------------------------------------------------------

  {
    day: "2026-12-01",
    time: "17:00",
    title: "The grand entrance and dinner",
    roles: ["coordinator", "photographers", "aaron-and-savea"],
    lines: [
      {
        says: "Coordinator",
        text: "Now, for the second time ever… Mr. and Mrs. Lujan!",
        note: "Once everyone is seated and Aaron and Savea are ready at the stairs.",
      },
      "Aaron and Savea come down the stairs into the great room and walk to the middle of the dance floor to welcome everyone and say thanks for coming",
      { text: "Press play on the dinner music", roles: ["coordinator"] },
      "After their speech, the coordinator announces that once everyone has been through the buffet, the mic is open for anyone who’d like to give the bride and groom a shout-out",
      "The coordinator releases tables to the buffet one at a time",
      "Aaron and Savea eat, then everyone else",
      {
        text: "Shot list",
        roles: ["photographers"],
        checklist: true,
        lines: [
          "The grand entrance from the stairs",
          "The welcome speech on the dance floor",
          "Candids at the buffet",
          "Guests giving their open mic shout-outs",
        ],
      },
    ],
  },
  {
    day: "2026-12-01",
    time: "18:00",
    title: "The dances",
    roles: ["coordinator", "photographers", "aaron-and-savea"],
    lines: [
      {
        text: "First dance",
        lines: [
          "Ting, ting, ting on a glass (or the mic) to quiet the room and turn everyone to the dance floor",
          "The coordinator plays “Touching Heaven”",
          "Aaron and Savea dance",
        ],
      },
      {
        text: "The moms’ dance",
        lines: [
          "“Now we’d like to invite two women who mean so much to us. Mom and Mom, will you please join us for a special dance?”",
          "The coordinator plays the “Never Grow Up” / “You Are My Sunshine” mashup",
        ],
      },
    ],
  },
  {
    day: "2026-12-01",
    time: "18:30",
    title: "Vendors eat",
    roles: ["coordinator", "photographers"],
    body: "The dance floor opens to everyone, so take a break and grab some dinner.",
    lines: [{ text: "Candids of the dancing", roles: ["photographers"] }],
  },
  {
    day: "2026-12-01",
    time: "19:00",
    approx: true,
    title: "Cut the cake",
    roles: ["coordinator", "photographers", "aaron-and-savea"],
    body: "Not a set time: whenever the coordinator has finished eating.",
    lines: [
      "The coordinator brings Aaron and Savea to the cake table and announces that the newlyweds are cutting the cake",
      {
        text: "While they cut it, set out the mini cheesecakes, cake balls, ice cream, the sundae toppings and the plates at the dessert bar",
        roles: ["coordinator"],
      },
    ],
  },
  {
    day: "2026-12-01",
    time: "19:30",
    title: "Wrap up for the day",
    roles: ["photographers"],
  },
  {
    day: "2026-12-01",
    time: "20:30",
    title: "Start clearing the buffet",
    roles: ["coordinator"],
  },
  {
    day: "2026-12-01",
    time: "21:00",
    title: "The send-off",
    roles: ["coordinator", "family", "aaron-and-savea"],
    lines: [
      "The coordinator gathers everyone outside",
      "Inside, Aaron, Savea and Daniel share one last dance, just the three of them",
      "Daniel joins everyone outside for the send-off",
      "Keep the path clear for Aaron and Savea to run out to their just-married car",
    ],
  },

  // Clean-up -----------------------------------------------------------

  {
    day: "2026-12-01",
    time: "21:15",
    title: "Clean up",
    roles: ["coordinator", "setup-crew", "wedding-party", "family"],
    body: "The coordinator shows everyone staying the night how to help:",
    lines: [
      {
        text: "Clean-up list",
        checklist: true,
        lines: [
          "Pack the leftover food into containers",
          "Empty the hot cocoa carafes and station",
          "Rinse the dishes and the crock pots",
          "Pack away the table decor",
          "Take down the garlands, signs, trees and the rest of the decorations, inside and out",
        ],
      },
    ],
  },
  {
    day: "2026-12-01",
    time: "22:00",
    approx: true,
    title: "Call it a night",
    roles: ["coordinator", "setup-crew"],
    body: "Once the main clean-up is done, or at 10:00, whichever comes first, the coordinator is free to go. Whatever’s left waits for Wednesday morning, when Aaron and Savea come back.",
  },

  // Aaron and Savea's own day ------------------------------------------
  // Two-sided: an entry with a `side` sits on that person's side of the
  // spine, paired with the other side's entry at the same minute. The
  // moments they share are the entries above, tagged "aaron-and-savea".

  {
    day: "2026-12-01",
    time: "12:00",
    side: "aaron",
    title: "Getting-ready photos",
    roles: ["aaron-and-savea"],
    body: "Photographer 1 is with you and Daniel, in your suits. The videographer floats between you both.",
  },
  {
    day: "2026-12-01",
    time: "12:00",
    side: "savea",
    title: "Getting-ready photos",
    roles: ["aaron-and-savea"],
    body: "Photographer 2 is with you, in your dress. The videographer floats between you both.",
  },
  {
    day: "2026-12-01",
    time: "12:30",
    side: "aaron",
    title: "Sibling photos",
    roles: ["aaron-and-savea"],
    body: "With Ammon, Evan, Easton and Alaysha.",
  },
  {
    day: "2026-12-01",
    time: "12:30",
    side: "savea",
    title: "Sibling photos",
    roles: ["aaron-and-savea"],
    body: "With Brenna, Annika, Connor, Finnley and Logan.",
  },
  {
    day: "2026-12-01",
    time: "13:00",
    side: "aaron",
    title: "Drive to Power Plant Park",
    roles: ["aaron-and-savea"],
    lines: ["Ride in Car 3 with Mom, Dad and Daniel", "Bring the rings"],
  },
  {
    day: "2026-12-01",
    time: "13:00",
    side: "savea",
    title: "Drive to Power Plant Park",
    roles: ["aaron-and-savea"],
    lines: ["Ride in Car 2 with Mom and Dad", "Bring the rings"],
  },
  {
    day: "2026-12-01",
    time: "13:30",
    side: "aaron",
    title: "The first look",
    roles: ["aaron-and-savea"],
    body: "Stand about 15 feet away, facing away from the aisle. Turn around when Savea walks up.",
  },
  {
    day: "2026-12-01",
    time: "13:30",
    side: "savea",
    title: "The first look",
    roles: ["aaron-and-savea"],
    body: "Get ready, then walk down the aisle to Aaron.",
  },
  {
    day: "2026-12-01",
    time: CEREMONY_START,
    side: "aaron",
    title: "The processional",
    roles: ["aaron-and-savea"],
    body: "Stop halfway down the aisle and wait for Savea.",
  },
  {
    day: "2026-12-01",
    time: CEREMONY_START,
    side: "savea",
    title: "The processional",
    roles: ["aaron-and-savea"],
    body: "Meet Aaron halfway down the aisle.",
  },
  {
    day: "2026-12-01",
    time: CEREMONY_START,
    title: "The ceremony",
    roles: ["aaron-and-savea"],
    lines: [
      "Walk together to Daniel, then up to the entrance as a trio, and hug everyone waiting",
      "Put the Polaroid in the ornament and hang it on the tree",
      "A private, unscripted moment with Daniel",
      "Exchange your vows and rings",
    ],
  },
  {
    day: "2026-12-01",
    time: CEREMONY_END,
    approx: true,
    title: "Just married",
    roles: ["aaron-and-savea"],
    body: "A spin and dip kiss at the end of the aisle, then downstairs with Adrian, Annie and Isaac to sign the marriage certificate.",
  },
];
