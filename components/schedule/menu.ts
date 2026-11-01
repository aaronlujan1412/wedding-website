/**
 * The buffet, by station. Six of the dishes are made the same way, so that
 * routine is said once (`CROCK_POT_ROUTINE`) and each crock pot dish carries
 * only what's different about it: the serving tool and any exception.
 */
export type Prep =
  | { kind: "crock-pot"; tool: string; note?: string }
  | { kind: "oven"; note: string }
  | { kind: "prepped-ahead"; when: string }
  | { kind: "set-out" };

export type Dish = { name: string; prep?: Prep; toppings?: string[] };

export type Station = { name: string; dishes: Dish[]; toppings?: string[] };

export const CROCK_POT_ROUTINE =
  "Every crock pot dish is frozen ahead of time. Thaw it in water for 30 minutes, put it in its slow cooker, and set it on low so it’s hot by dinner at 5:00.";

export const menu: Station[] = [
  {
    name: "Chili bar",
    dishes: [
      { name: "Chili verde", prep: { kind: "crock-pot", tool: "ladle" } },
      { name: "Beef chili", prep: { kind: "crock-pot", tool: "ladle" } },
    ],
    toppings: ["cheese", "sour cream"],
  },
  {
    name: "Nacho bar",
    dishes: [
      { name: "Pulled pork", prep: { kind: "crock-pot", tool: "tongs" } },
      { name: "Bread, for sandwiches" },
    ],
    toppings: [
      "chips",
      "tomatoes",
      "cheese",
      "salsa and pico",
      "sour cream",
      "black olives",
    ],
  },
  {
    name: "Pasta bar",
    dishes: [
      {
        name: "Spaghetti with meat sauce",
        prep: {
          kind: "crock-pot",
          tool: "spaghetti spoon",
          note: "The noodles and the sauce are frozen separately.",
        },
        toppings: ["parmesan"],
      },
      { name: "Mac and cheese", prep: { kind: "crock-pot", tool: "spoon" } },
      {
        name: "Lasagna",
        prep: {
          kind: "oven",
          note: "Prepped ahead in foil pans. Bake at 375°F for 1½ to 2 hours, and keep the second pan in the oven on low.",
        },
      },
    ],
  },
  {
    name: "Soup",
    dishes: [
      {
        name: "Zuppa Toscana",
        prep: {
          kind: "crock-pot",
          tool: "ladle",
          note: "Frozen without the dairy. Add it once the soup is liquid.",
        },
      },
    ],
  },
  {
    name: "Sides",
    dishes: [
      {
        name: "Fruit",
        prep: { kind: "prepped-ahead", when: "1 to 2 days before" },
      },
      {
        name: "Veggies",
        prep: { kind: "prepped-ahead", when: "1 to 2 days before" },
      },
    ],
  },
  {
    name: "Dessert bar",
    dishes: [
      { name: "Sam’s Club mini cheesecakes", prep: { kind: "set-out" } },
      { name: "Mosaic cake balls", prep: { kind: "set-out" } },
      {
        name: "Vanilla ice cream",
        toppings: [
          "nuts",
          "fudge",
          "caramel, chocolate and strawberry sauces",
          "sprinkles",
          "whipped cream",
          "graham crackers",
        ],
      },
    ],
  },
];

/** How many slow cookers the buffet needs plugged in at once. */
export function crockPotCount(stations: Station[]) {
  return stations
    .flatMap((s) => s.dishes)
    .filter((d) => d.prep?.kind === "crock-pot").length;
}
