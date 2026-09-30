/**
 * The matcher, against pairs it has actually got wrong.
 *
 * Every case here is a real failure from building this, kept so the next change
 * to the scoring has to answer for them. No API key and no network: the risky
 * part of this integration is the ranking, and the ranking is pure.
 *
 *   node scripts/test-usda-match.mjs
 */
import { queryFor, score } from "./usda-match.mjs";

const CONFIDENT = 0.8;
let failed = 0;

function check(label, actual) {
  console.log(`  ${actual ? "ok  " : "FAIL"} ${label}`);
  if (!actual) failed += 1;
}

// A `/` opens a Lucene regex and the API answers 400, which killed a run.
check(
  "a slash in a name does not reach the API",
  !queryFor("Stir-fry / broccoli veg blend").includes("/"),
);
check(
  "a parenthetical says what it is FOR, and is dropped",
  queryFor("Whole milk (cooking)") === "Whole milk",
);

// The food, versus a food that merely contains it.
const milk = score("Whole milk (cooking)", "Milk, whole, 3.25% milkfat, with added vitamin D");
const ricotta = score("Whole milk (cooking)", "Cheese, ricotta, whole milk");
check(`milk (${milk.toFixed(2)}) beats ricotta (${ricotta.toFixed(2)})`, milk > ricotta);
check("ricotta is not confident for milk", ricotta < CONFIDENT);

// Cheeses named without the word cheese still have to clear the bar.
for (const [item, desc] of [
  ["Feta crumbles", "Cheese, feta, whole milk, crumbled"],
  ["Shredded mozzarella", "Cheese, mozzarella, low moisture, part-skim, shredded"],
]) {
  const s = score(item, desc);
  check(`${item} is confident (${s.toFixed(2)})`, s >= CONFIDENT);
}

// Plain right answers.
for (const [item, desc] of [
  ["Chicken thighs, boneless skinless", "Chicken, thigh, boneless, skinless, raw"],
  ["Greek yogurt, plain", "Yogurt, Greek, plain, nonfat"],
  ["Frozen broccoli", "Broccoli, raw"],
]) {
  const s = score(item, desc);
  check(`${item} (${s.toFixed(2)})`, s >= CONFIDENT);
}

// And a plain wrong one.
const wrong = score("Kefir milk", "Cheese, ricotta, whole milk");
check(`kefir does not match ricotta (${wrong.toFixed(2)})`, wrong < 0.5);

/*
 * A part, a state or a derivative is a different food. Every pair below was
 * marked CONFIDENT on a full run of the price book, which is the dangerous
 * bucket: uncertain gets read, confident gets written.
 */
for (const [item, desc] of [
  ["Sweet potatoes", "Sweet potato leaves, raw"],
  ["Eggs, large", "Eggs, Grade A, Large, egg white"],
  ["Bacon", "Bacon, meatless"],
  ["Lemons", "Lemon juice from concentrate, bottled, REAL LEMON"],
  ["Rotisserie chicken", "Chicken, broiler, rotisserie, BBQ, skin"],
  ["Quinoa", "Flour, quinoa"],
  ["Whole milk (cooking)", "Milk, buttermilk, fluid, whole"],
]) {
  const s = score(item, desc);
  check(`${item} is NOT confident for "${desc.slice(0, 34)}" (${s.toFixed(2)})`, s < CONFIDENT);
}

// And the right answers for those same items still clear the bar.
for (const [item, desc] of [
  ["Sweet potatoes", "Sweet potato, raw, unprepared"],
  ["Bacon", "Bacon, pork, cured, raw"],
]) {
  const s = score(item, desc);
  check(`${item} -> "${desc}" is confident (${s.toFixed(2)})`, s >= CONFIDENT);
}

console.log(failed ? `\n${failed} failed.` : "\nAll good.");
process.exit(failed ? 1 : 0);
