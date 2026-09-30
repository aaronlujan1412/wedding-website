/**
 * Matching a shopping-list name to a USDA FoodData Central description.
 *
 * Its own module because it is the part most likely to be wrong and the only
 * part testable without an API key — see test-usda-match.mjs, which is a set of
 * pairs this has actually got wrong at some point.
 */

/**
 * What to actually ask FDC.
 *
 * The search is parsed Lucene-style, so a shopping-list name can be a syntax
 * error rather than a query: "Stir-fry / broccoli veg blend" contains a `/`,
 * which opens a regex that never closes, and the API answers 400. That killed
 * a run nine items in.
 *
 * Parentheticals go too. "Whole milk (cooking)" says what it is FOR, not what
 * it is, and those words only pull the match away from the food.
 */
function queryFor(name) {
  return name
    .replace(/\([^)]*\)/g, " ")
    .replace(/[/\\+\-!(){}\[\]^"~*?:&|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


/**
 * Words that say how a thing is SOLD, not what it is.
 *
 * Carefully only that. An earlier version had "whole", "plain", "ground" and
 * "shredded" in here, which are the opposite — they are the food's identity.
 * Dropping them let "Whole milk (cooking)" reduce to "milk" and tie with
 * "Cheese, ricotta, whole milk", because ricotta contains the word milk.
 */
const PACKAGING = new Set([
  "pack", "bag", "box", "ct", "count", "lb", "lbs", "oz",
  "singles", "single", "cups", "cup", "bulk", "set", "jar", "bottle",
]);

/**
 * State words: they help when they agree and are not required when they don't.
 * Frozen broccoli really is nutritionally close to raw broccoli, and FDC has no
 * entry for most things in every state.
 */
const SOFT = new Set(["frozen", "fresh", "raw", "large", "small", "boneless", "skinless"]);

/**
 * Crude stemming, enough for food words.
 *
 * "crumbles" has to reach "crumbled" or a correct feta match scores half. Not a
 * real stemmer — this is a vocabulary of a few hundred nouns, and anything
 * cleverer would be more code than the problem.
 */
const stem = (w) =>
  w
    .replace(/(ies)$/, "y")
    .replace(/(es|s|d)$/, "")
    // And the trailing e, or the two halves of a pair disagree: "crumbles"
    // reduces to "crumbl" and "crumbled" to "crumble", which scored a correct
    // feta match at 0.35.
    .replace(/e$/, "");

const words = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .map(stem);

/**
 * How well a FDC description answers a shopping-list name.
 *
 * Scored on the SHOPPING name's words, not the description's: FDC descriptions
 * are long and qualified ("Chicken, thigh, boneless, skinless, raw") and
 * dividing by their length would punish the most precise matches.
 *
 * The leading-term penalty is what separates a food from a food that merely
 * CONTAINS it. FDC descriptions lead with identity — "Milk, whole" against
 * "Cheese, ricotta, whole milk" — so a first word the shopping name never
 * mentions is a sign the answer is a different food. Moderate rather than
 * disqualifying, because "Feta crumbles" legitimately matches a description
 * beginning "Cheese".
 */
function score(itemName, description) {
  const want = words(queryFor(itemName));
  const have = new Set(words(description));
  if (!want.length) return 0;

  const core = want.filter((w) => !PACKAGING.has(w) && !SOFT.has(w));
  const target = core.length ? core : want;
  const hits = target.filter((w) => have.has(w)).length;
  const bonus = want.filter((w) => SOFT.has(w) && have.has(w)).length * 0.05;

  /*
   * FDC descriptions read "category, specific, qualifiers" — "Cheese, feta,
   * whole milk, crumbled". Identity lives in the first TWO terms, so each one
   * the shopping name never mentions costs something.
   *
   * One term was not enough. "Feta crumbles" and "Cheese, ricotta, whole milk"
   * both lead with the unmatched word "cheese" and both landed on 0.85 — one a
   * correct match, the other ricotta being offered as milk. The second term
   * separates them: feta is in the item's name and ricotta is not.
   */
  const identity = words(description).slice(0, 2);
  const penalty = identity.filter((w) => !want.includes(w)).length * 0.15;

  return Math.max(0, Math.min(1, hits / target.length + bonus - penalty));
}


export { queryFor, score, stem, words, PACKAGING, SOFT };
