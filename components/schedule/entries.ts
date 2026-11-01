import { ceremony } from "./ceremony";
import { menu } from "./menu";
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
      "Savea and Aaron’s car: table decor, mugs, the misc. decor box",
      "Mom and Dad’s truck: Christmas trees, the kitchen box, food coolers",
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
          "Trees: set them up and add the lights",
        ],
      },
      {
        text: "Outside",
        lines: [
          "Hang the garland",
          "Get the outside tree ready, but leave it inside for now",
        ],
      },
    ],
  },
  {
    day: "2026-11-30",
    time: "15:00",
    title: "Set up the food",
    roles: ["setup-crew"],
    lines: ["Cocoa bar: wash the mugs, set them out, and prep the toppings"],
    menu,
  },
  {
    day: "2026-11-30",
    time: "16:15",
    title: "Pick Daniel up from school",
    roles: ["family"],
    body: "Then drive him up to the lodge.",
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
  },

  // Tuesday, December 1: the morning -----------------------------------

  {
    day: "2026-12-01",
    time: "08:30",
    title: "Breakfast, served by the lodge",
    roles: ["wedding-party", "officiant", "family"],
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
    roles: ["wedding-party", "officiant", "family"],
  },
  {
    day: "2026-12-01",
    time: "12:30",
    title: "Getting-ready photos",
    roles: ["photographers", "wedding-party"],
    lines: [
      "Aaron and his siblings, with one photographer",
      "Savea and her siblings, with the other",
    ],
  },

  // The first look -----------------------------------------------------

  {
    day: "2026-12-01",
    time: "13:00",
    title: "Drive to Power Plant Park",
    roles: ["photographers", "family"],
    body: "About 30 minutes.",
    lines: [
      "Car 1: the photography team",
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
      "Aaron stands about 15 feet away, with his back to Savea",
      "Savea gets ready",
      "Aaron turns around, and Savea walks down the aisle to him",
      "The family waits in the cars until after they meet",
    ],
  },
  {
    day: "2026-12-01",
    time: "13:45",
    title: "Photos at the park",
    roles: ["photographers", "family"],
    lines: [
      "Photos with the parents",
      "Family photos",
      "The parents and Daniel drive back in Car 3",
      "Aaron and Savea’s couple photos",
    ],
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
    roles: ["photographers"],
    body: "About 30 minutes.",
    lines: ["Car 1: the photography team", "Car 2: Aaron and Savea"],
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
    time: "15:15",
    title: "Wedding party and family photos",
    roles: ["photographers", "wedding-party", "family"],
    lines: [
      "Wedding party photos",
      "Family photos",
      "If there’s time, invite groups from cocoa hour out for photos with the bride and groom",
    ],
  },

  // The ceremony -------------------------------------------------------

  {
    day: "2026-12-01",
    time: "16:00",
    title: "Seat the ceremony",
    roles: ["coordinator"],
    lines: [
      "Start ushering everyone out of the lodge to find their seats outside",
      "Remind them to use the restroom first. The lodge is closed for about 30 to 45 minutes once the ceremony starts",
    ],
  },
  {
    day: "2026-12-01",
    time: "16:00",
    title: "Head out the back door",
    roles: ["wedding-party"],
    body: "Everyone but Adrian heads out the back door to get ready for the processional.",
  },
  {
    day: "2026-12-01",
    time: "16:15",
    title: "The ceremony, minute by minute",
    roles: [
      "officiant",
      "coordinator",
      "wedding-party",
      "family",
      "photographers",
    ],
    segments: ceremony,
  },

  // The reception ------------------------------------------------------

  {
    day: "2026-12-01",
    time: "17:00",
    title: "The grand entrance and dinner",
    roles: ["coordinator", "photographers"],
    lines: [
      { says: "Coordinator", text: "Now, for the second time ever, Mr. and Mrs. Lujan!" },
      "Aaron and Savea come down the stairs into the great room and walk to the middle of the dance floor to welcome everyone and say thanks for coming",
      "Press play on the dinner music",
      "The coordinator announces that once everyone has been through the buffet, the mic is open for anyone who’d like to give the bride and groom a shout-out",
      "The coordinator releases tables to the buffet one at a time",
      "Aaron and Savea eat, then everyone else",
    ],
  },
  {
    day: "2026-12-01",
    time: "18:00",
    title: "The dances",
    roles: ["coordinator", "photographers"],
    lines: [
      {
        text: "First dance",
        lines: [
          "Ting, ting, ting on a glass to quiet the room",
          "The coordinator starts the first dance music",
          "Aaron and Savea dance",
        ],
      },
      {
        text: "The moms’ dance",
        lines: [
          "“Now we’d like to invite two women who mean so much to us. Mom and Mom, will you please join us for a special dance?”",
          "The coordinator starts the music",
        ],
      },
    ],
  },
  {
    day: "2026-12-01",
    time: "18:30",
    title: "Vendors eat",
    roles: ["coordinator", "photographers"],
    body: "The dance floor opens to everyone, so it’s your turn at the buffet.",
  },
  {
    day: "2026-12-01",
    time: "19:00",
    approx: true,
    title: "Cut the cake",
    roles: ["coordinator", "photographers"],
    body: "Not a set time: whenever the coordinator has finished eating, she grabs Aaron and Savea and announces that the newlyweds are cutting the cake.",
  },
  {
    day: "2026-12-01",
    time: "21:00",
    title: "The send-off",
    roles: ["coordinator", "photographers", "family"],
    lines: [
      "The coordinator gathers everyone outside",
      "Inside, Aaron, Savea and Daniel share one last dance, just the three of them",
      "Daniel joins everyone outside for the send-off",
      "Aaron and Savea drive away in their just-married car",
    ],
  },

  // Clean-up -----------------------------------------------------------

  {
    day: "2026-12-01",
    time: "21:15",
    title: "Clean up",
    roles: ["coordinator", "setup-crew", "wedding-party", "family"],
    body: "The coordinator shows anyone staying on how to help:",
    lines: [
      "Put the food away",
      "Empty the hot cocoa",
      "Rinse the dishes",
      "Clear the table decor",
      "Take down the decorations",
    ],
  },
  {
    day: "2026-12-01",
    time: "22:00",
    approx: true,
    title: "Call it a night",
    roles: ["coordinator", "setup-crew"],
    body: "The coordinator heads home, earlier if clean-up wraps up sooner. Whatever’s left waits until tomorrow.",
  },
];
