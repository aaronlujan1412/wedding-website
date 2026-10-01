/**
 * Shapes shared by the server and the browser.
 *
 * Without `import "server-only"`, unlike `meal-queries.ts` — the client
 * components that draw the calendar and the shopping list need these types and
 * the freshness thresholds, and importing them from the query layer would pull
 * a server-only module into the client bundle.
 */

export type Tier = "core" | "pantry" | "optional";
export type Window = "day0-2" | "early" | "mid" | "any";

export const WINDOW_LABEL: Record<Window, string> = {
  "day0-2": "first 2 days",
  early: "first week",
  mid: "up to ~12 days",
  any: "any time",
};

export type Recipe = {
  id: string;
  name: string;
  kind: "dinner" | "lunch" | "snack" | "special";
  serves: number | null;
  kcal: number | null;
  protein_g: number | null;
  method: string | null;
  window_when: Window;
  notes: string | null;
  batch_friendly: boolean;
  ingredient_count: number;
  /** Categories the household made up. A chip exists because a dish has it. */
  tags: string[];
};

export type Item = {
  id: string;
  name: string;
  pack: string | null;
  category: string | null;
  tier: Tier;
  price_cents: number | null;
  keeps_days: number | null;
  notes: string | null;
  used_by: number;
  /** Which food is in it, once somebody has said. Null is the normal start. */
  food_id: string | null;
  food_description: string | null;
  /** Per 100 g, from the linked food. Null when nothing is linked. */
  kcal_per_100g: number | null;
  protein_per_100g: number | null;
  /** What the whole pack weighs. Null until somebody weighs it. */
  pack_grams: number | null;
  /** How many packs share this row's food — the same thing in another size. */
  sizes: number;
};

/**
 * What a pack costs per 100 g, and per gram of protein.
 *
 * Both need three facts at once — a price, a weight, and a linked food — and
 * any of the three may be missing, which is the normal state of a price book.
 * Null rather than zero every time, because "we have not weighed it" and "it
 * is free" are not the same claim, and only one of them is ever true.
 */
export function packValue(item: Item): {
  centsPer100g: number | null;
  centsPerProteinGram: number | null;
} {
  const { price_cents, pack_grams, protein_per_100g } = item;
  if (!price_cents || !pack_grams || pack_grams <= 0) {
    return { centsPer100g: null, centsPerProteinGram: null };
  }

  const centsPer100g = (price_cents / pack_grams) * 100;
  const proteinGrams =
    protein_per_100g === null ? null : (protein_per_100g * pack_grams) / 100;

  return {
    centsPer100g,
    centsPerProteinGram:
      proteinGrams && proteinGrams > 0 ? price_cents / proteinGrams : null,
  };
}

/** '8.7¢' / '$1.79' — cents get the cent sign until they stop being pennies. */
export function centsText(cents: number | null): string {
  if (cents === null) return "—";
  if (cents < 100) return `${Math.round(cents * 10) / 10}¢`;
  return money(Math.round(cents));
}

export type PlanDay = {
  id: string;
  on_date: string;
  dinner: string | null;
  dinner_recipe_id: string | null;
  dinner_window: Window | null;
  lunch: string | null;
  /** What kind of day it is: daniel, party, prep. Made up by the household. */
  tags: string[];
  notes: string | null;
  /** Nights since the delivery that supplies this day. Null before the first. */
  days_out: number | null;
  /** Set when a delivery lands on this date. */
  delivery_ordinal: number | null;
};

export type PlanLine = {
  id: string;
  /** Which tab it sits on. */
  order_id: string;
  order_ordinal: number;
  /**
   * False when a person put it there by hand. Those survive regeneration and
   * are the only ones that can be removed from the list directly.
   */
  generated: boolean;
  item_name: string;
  pack: string | null;
  /** Where it's bought. Null means nobody has said. */
  store: string | null;
  /** When it went in the basket, or null if it hasn't. */
  bought_at: string | null;
  tier: Tier;
  quantity: number;
  unit_price_cents: number;
  used_for: string | null;
  /** What to do with it on arrival: portion, freeze, label. */
  notes: string | null;
  coverage_warning: string | null;
  quantity_is_a_guess: boolean;
};

/**
 * A tab on the shopping list.
 *
 * A delivery is a box that arrives on a date and supplies the days after it.
 * An `extras` tab is one somebody made by hand to collect snacks and
 * nice-to-haves — no date, because nothing delivers it.
 */
export type PlanOrder = {
  id: string;
  ordinal: number;
  kind: "delivery" | "extras";
  /** Null on an extras tab. */
  delivers_on: string | null;
  /** Set on an extras tab; a delivery names itself by ordinal and date. */
  name: string | null;
  store: string | null;
};

export type Plan = {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  budget_cents: number;
  status: "draft" | "final";
  orders: PlanOrder[];
  days: PlanDay[];
  lines: PlanLine[];
};

/**
 * How a day reads, given how long since its box arrived.
 *
 * The thresholds are the recipe windows, so the calendar and the scheduler are
 * describing the same thing: a day in the "fresh" band is one where a
 * day0-2 dish is safe, "good" is where an early dish is, and so on. Three
 * colours, all already in the skin — no new palette for a new page.
 */
export function freshness(daysOut: number | null): {
  key: "arrival" | "fresh" | "good" | "thin" | "tail";
  ink: string;
  label: string;
} {
  if (daysOut === null || daysOut <= 0) {
    return { key: "arrival", ink: "text-[var(--me-phosphor)]", label: "box lands" };
  }
  if (daysOut <= 2) {
    return { key: "fresh", ink: "text-[var(--me-phosphor)]", label: `day ${daysOut} — anything goes` };
  }
  if (daysOut <= 7) {
    return { key: "good", ink: "text-me-ink", label: `day ${daysOut} — fresh produce still fine` };
  }
  if (daysOut <= 12) {
    return { key: "thin", ink: "text-me-gold", label: `day ${daysOut} — hardy produce only` };
  }
  return { key: "tail", ink: "text-me-live", label: `day ${daysOut} — frozen and stored` };
}

export const money = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ------------------------------------------------------------------ *
 * Foods
 * ------------------------------------------------------------------ */

export type FoodSource = "usda" | "custom";

/** A food as the search returns it, with its most ordinary portion attached. */
export type FoodHit = {
  id: string;
  source: FoodSource;
  dataset: string | null;
  description: string;
  category: string | null;
  /** Per 100 g, every one of them. Null means the source does not say. */
  kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  saturated_fat_g: number | null;
  carbs_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
  /** True when the calories were computed from the macros, not measured. */
  kcal_is_derived: boolean;
  portion_label: string | null;
  portion_grams: number | null;
  portion_count: number;
};

export type Portion = { id: string; label: string; grams: number };

export type FoodDetail = FoodHit & {
  notes: string | null;
  portions: Portion[];
  /** Price book rows identified as this food — the sizes it comes in. */
  packs: {
    id: string;
    name: string;
    store: string | null;
    pack: string | null;
    price_cents: number | null;
    pack_grams: number | null;
  }[];
};

/**
 * The eight numbers, in the order a label prints them.
 *
 * One list so the detail card, the compare row and any future export agree —
 * and so adding a ninth nutrient is one line rather than four.
 */
export const NUTRIENTS = [
  { key: "kcal", label: "Calories", unit: "" },
  { key: "protein_g", label: "Protein", unit: "g" },
  { key: "carbs_g", label: "Carbs", unit: "g" },
  { key: "fiber_g", label: "Fibre", unit: "g" },
  { key: "sugar_g", label: "Sugars", unit: "g" },
  { key: "fat_g", label: "Fat", unit: "g" },
  { key: "saturated_fat_g", label: "Saturated fat", unit: "g" },
  { key: "sodium_mg", label: "Sodium", unit: "mg" },
] as const satisfies readonly { key: keyof FoodHit; label: string; unit: string }[];

/**
 * A per-100g figure at some real weight.
 *
 * Null in, null out — deliberately, and never zero. A food the source has no
 * fibre figure for is not a food with no fibre, and to someone counting it the
 * difference is the whole point.
 */
export function atGrams(per100g: number | null, grams: number): number | null {
  if (per100g === null || per100g === undefined) return null;
  if (!Number.isFinite(grams) || grams < 0) return null;
  return (Number(per100g) * grams) / 100;
}

/**
 * How many decimals a nutrition figure deserves.
 *
 * Calories and sodium to the whole unit: a tenth of a calorie is noise dressed
 * as precision, and nobody is counting single milligrams of sodium.
 *
 * Grams keep one decimal all the way to 100, because that is the range every
 * macro actually lives in and the decimal is real information there — 20.9 g of
 * protein reported as '21g' is the rounding a person came here to avoid. Past
 * 100 g the tenth is noise again.
 */
export function nutrientText(value: number | null, unit: string): string {
  if (value === null) return "—";
  const rounded =
    unit === "mg" || unit === ""
      ? Math.round(value)
      : value < 100
        ? Math.round(value * 10) / 10
        : Math.round(value);
  return `${rounded.toLocaleString("en-US")}${unit}`;
}

/** '113 g' / '1.5 kg' — weights get the same treatment as money. */
export function gramsText(grams: number): string {
  if (grams >= 1000) return `${Math.round(grams / 10) / 100} kg`;
  return `${Math.round(grams * 10) / 10} g`;
}
