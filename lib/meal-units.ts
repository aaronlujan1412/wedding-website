/**
 * Turning "1 lb" into grams, and refusing to guess when it cannot.
 *
 * Every question about leftovers is the same subtraction — what you bought
 * minus what the month's dishes use — and it can only be done in one unit. The
 * price book holds pack weights in grams, so grams is it.
 *
 * WHAT THIS DELIBERATELY WILL NOT DO. A cup of flour and a cup of honey are not
 * the same weight, and no table of conversions fixes that without a density per
 * food. So volume returns null and the page says the amount cannot be counted,
 * rather than inventing a number that would quietly under- or over-state a
 * surplus somebody is going to shop against.
 */

/** Grams in one of each unit we can convert. */
const MASS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilo: 1000,
  kilos: 1000,
  kilogram: 1000,
  kilograms: 1000,
  oz: 28.349523,
  ounce: 28.349523,
  ounces: 28.349523,
  lb: 453.59237,
  lbs: 453.59237,
  pound: 453.59237,
  pounds: 453.59237,
};

/**
 * Units meaning "the whole thing you buy", which convert only once the pack has
 * been weighed. Worth having: "half a bag" is how a person actually describes
 * an amount they never measured.
 */
const PACKS = new Set(["pack", "packs", "bag", "bags", "box", "boxes", "jar", "jars"]);

/**
 * Units that count rather than weigh. Not convertible — two eggs is a real
 * amount and not a number of grams until somebody says what an egg weighs —
 * but recognised, so the page can tell "we cannot convert this" apart from
 * "somebody typed nonsense".
 */
const COUNTS = new Set([
  "each", "ct", "count", "piece", "pieces", "clove", "cloves",
  "can", "cans", "head", "heads", "bunch", "bunches",
]);

export type UnitKind = "mass" | "pack" | "count" | "unknown";

export function unitKind(unit: string | null): UnitKind {
  const key = (unit ?? "").trim().toLowerCase();
  if (!key) return "unknown";
  if (key in MASS) return "mass";
  if (PACKS.has(key)) return "pack";
  if (COUNTS.has(key)) return "count";
  return "unknown";
}

/**
 * An amount in grams, or null when it genuinely cannot be known.
 *
 * Null is an answer here, not a failure: "2 cloves of garlic" has no honest
 * gram weight, and a surplus built on a guessed one is worse than a surplus
 * that says which lines it could not count.
 */
export function gramsOf(
  quantity: number | null,
  unit: string | null,
  packGrams: number | null,
): number | null {
  if (quantity === null || !Number.isFinite(quantity) || quantity <= 0) return null;

  const key = (unit ?? "").trim().toLowerCase();

  if (key in MASS) return quantity * MASS[key];

  // A pack is however much this particular pack weighs, so the same "1 bag"
  // is 1.4 kg of chicken and 1.4 kg of nothing until the pack is weighed.
  if (PACKS.has(key)) return packGrams ? quantity * packGrams : null;

  return null;
}

/** The units the amount form offers, in the order a kitchen reaches for them. */
export const UNIT_OPTIONS: readonly (readonly [string, string])[] = [
  ["lb", "lb"],
  ["oz", "oz"],
  ["g", "g"],
  ["kg", "kg"],
  ["pack", "whole packs"],
  ["each", "each (not weighed)"],
] as const;

/** '1.4 kg' / '340 g' — the same shape gramsText uses on the food pages. */
export function weightText(grams: number): string {
  if (grams >= 1000) return `${Math.round(grams / 10) / 100} kg`;
  return `${Math.round(grams)} g`;
}
