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

const stem = (w) =>
  w
    .replace(/(ies)$/, "y")
    .replace(/(es|s|d)$/, "")
    // And the trailing e, or the two halves of a pair disagree: "crumbles"
    // reduces to "crumbl" and "crumbled" to "crumble", which scored a correct
    // feta match at 0.35.
    .replace(/e$/, "");

/**
 * Words that make it a DIFFERENT FOOD.
 *
 * A full run put "Sweet potato leaves" against sweet potatoes at 1.00, egg
 * white against eggs, meatless bacon against bacon, lemon juice against lemons,
 * rotisserie chicken SKIN against the chicken, and quinoa flour against quinoa
 * — all marked confident, all wrong, and all wrong in the same way: the
 * description names a part, a state or a derivative that the shopping name
 * never asked for.
 *
 * The first-two-terms rule cannot catch these. "Sweet potato leaves" leads with
 * the two words that do match. So any of these appearing in the description and
 * not in the item is a heavy penalty, wherever it sits.
 *
 * This demotes some correct matches to uncertain — "Sauce, salsa" for "Salsa"
 * loses on "sauce". That is the right way to be wrong: uncertain is reviewed,
 * confident is written.
 */
const FORM = new Set(
  [
    "leaves", "leaf", "skin", "rind", "white", "yolk", "juice", "flour", "powder",
    "meatless", "concentrate", "dehydrated", "baby", "overripe", "unripe",
    "sprouted", "canned", "paste", "syrup", "extract", "buttermilk", "sauce",
    // A dried apple is 243 kcal against a fresh one's 52 -- a different food
    // by any measure that matters here. Deliberately NOT "peel": this stemmer
    // maps "peeled" onto it too, and a peeled mandarin is just a mandarin.
    "dried",
  ]
    // Through the same stemmer the descriptions go through, or they never
    // match: "meatless" reduces to "meatles", and a hand-written "meatless" in
    // this list silently never fires. That left "Bacon, meatless" confident.
    .map(stem),
);

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


const words = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .map(stem);

/**
 * "Without skin" does not mean skin.
 *
 * FDC negates constantly -- "Sweet potatoes, orange flesh, WITHOUT SKIN, raw",
 * "Lemons, raw, WITHOUT PEEL" -- and taking the negated word at face value
 * turns the best entry in the database into the worst. It cost sweet potatoes
 * the correct match outright: "skin" is in FORM, the 0.3 penalty landed on the
 * one raw entry, and a bag of frozen french fries won instead at 209 kcal
 * against 86.
 *
 * Drops the negator and the single word it governs, which is how FDC writes
 * them -- always one noun, never a phrase.
 */
const NEGATORS = new Set(["without", "excluding"]);

function dropNegated(said) {
  const out = [];
  for (let i = 0; i < said.length; i += 1) {
    if (NEGATORS.has(said[i])) {
      i += 1; // and the word it negates
      continue;
    }
    out.push(said[i]);
  }
  return out;
}

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
  // One cleaned list, used for both the membership test and the ordering
  // below -- the description used to be tokenised twice, which was two places
  // for a rule like negation to be applied to only one of them.
  const said = dropNegated(words(description));
  const have = new Set(said);
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
  const identity = said.slice(0, 2);
  const penalty = identity.filter((w) => !want.includes(w)).length * 0.15;

  // A part, state or derivative the shopping name never asked for.
  const form = said.filter((w) => FORM.has(w) && !want.includes(w)).length * 0.3;

  return Math.max(0, Math.min(1, hits / target.length + bonus - penalty - form));
}





/**
 * Words in a description that the shopping name never asked for.
 *
 * The tiebreak. Scores tie constantly -- "Sweet potato, raw, unprepared" and
 * "Sweet Potatoes, french fried, crosscut, frozen, unprepared" both answer
 * "Sweet potatoes" perfectly on every word that was typed -- and without a
 * second key the winner is whichever row Postgres happened to return first.
 * Fewer unasked-for qualifiers is the better answer nearly every time.
 */
function extraWords(itemName, description) {
  const want = words(queryFor(itemName));
  return words(description).filter((w) => !want.includes(w)).length;
}

/**
 * A PACK YOU BUY IS RAW.
 *
 * Domain knowledge the general scorer has no business carrying, which is why
 * this is a separate function rather than more weight inside `score`. A price
 * book row is a thing in a shop: dry quinoa, not cooked quinoa; a rasher of
 * bacon, not a bacon-and-beef snack stick. FDC carries both, they score
 * identically against a one-word shopping name, and the difference is 368 kcal
 * against 120.
 *
 * That gap is the reason this exists. A wrong link here does not look wrong --
 * it looks like nutrition.
 */
const PREPARED = new Set(
  ["cooked", "fried", "baked", "roasted", "boiled", "stewed", "grilled",
   "prepared", "dip", "sticks", "snack", "breaded"].map(stem),
);

const RAW = new Set(["raw", "uncooked", "unprepared"].map(stem));

function packScore(itemName, description) {
  const base = score(itemName, description);
  if (!base) return 0;

  const want = words(queryFor(itemName));
  const said = words(description);

  // Only when the shopping name did not ask for it. Somebody who writes
  // "rotisserie chicken" means the cooked one.
  const prepared = said.filter((w) => PREPARED.has(w) && !want.includes(w)).length * 0.1;
  const raw = said.some((w) => RAW.has(w)) ? 0.05 : 0;

  return Math.max(0, Math.min(1, base - prepared + raw));
}

export { queryFor, score, packScore, extraWords, dropNegated, stem, words, PACKAGING, SOFT };
