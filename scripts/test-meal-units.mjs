/**
 * Unit conversion, which every leftover figure is built on.
 *
 * No database and no network: this is arithmetic plus a judgement about what
 * cannot be converted, and the judgement is the part worth pinning down.
 *
 *   node scripts/test-meal-units.mjs
 */
import { readFileSync } from "node:fs";

// The module is TypeScript; strip the types rather than add a build step for
// one file of pure arithmetic.
const source = readFileSync(new URL("../lib/meal-units.ts", import.meta.url), "utf8");
const js = source
  .replace(/^export type .*$/gm, "")
  .replace(/: Record<string, number>/g, "")
  .replace(/: readonly \(readonly \[string, string\]\)\[\]/g, "")
  .replace(/ as const/g, "")
  .replace(/\(unit: string \| null\): UnitKind/g, "(unit)")
  .replace(/\(grams: number\): string/g, "(grams)")
  .replace(
    /\(\s*quantity: number \| null,\s*unit: string \| null,\s*packGrams: number \| null,\s*\): number \| null/g,
    "(quantity, unit, packGrams)",
  );
const { gramsOf, unitKind, weightText } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
);

let failed = 0;
const check = (label, ok) => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}`);
  if (!ok) failed += 1;
};
const near = (a, b) => a !== null && Math.abs(a - b) < 0.01;

check("1 lb is 453.59 g", near(gramsOf(1, "lb", null), 453.59237));
check("16 oz is a pound", near(gramsOf(16, "oz", null), gramsOf(1, "lb", null)));
check("units are case-insensitive", near(gramsOf(1, "LB", null), 453.59237));
check("whitespace is tolerated", near(gramsOf(1, " lb ", null), 453.59237));
check("2.5 kg is 2500 g", near(gramsOf(2.5, "kg", null), 2500));

// "Half a bag" is how somebody describes an amount they never measured.
check("1 pack is whatever the pack weighs", near(gramsOf(1, "pack", 1361), 1361));
check("half a bag is half of it", near(gramsOf(0.5, "bag", 1361), 680.5));
check("a pack nobody weighed cannot convert", gramsOf(1, "pack", null) === null);

// The refusals, which are the point.
check("cups cannot convert", gramsOf(2, "cups", 1361) === null);
check("cloves cannot convert", gramsOf(3, "cloves", null) === null);
check("a missing unit cannot convert", gramsOf(1, null, 500) === null);
check("a missing quantity cannot convert", gramsOf(null, "lb", null) === null);
check("zero is not an amount", gramsOf(0, "lb", null) === null);
check("a negative is not an amount", gramsOf(-2, "lb", null) === null);

// Knowing WHY something did not convert is what lets the page say so.
check("lb is mass", unitKind("lb") === "mass");
check("bag is a pack", unitKind("bag") === "pack");
check("cloves counts", unitKind("cloves") === "count");
check("cups is unknown", unitKind("cups") === "unknown");
check("blank is unknown", unitKind("") === "unknown");

check("340 g reads as grams", weightText(340) === "340 g");
check("1400 g reads as kg", weightText(1400) === "1.4 kg");

console.log(failed ? `\n${failed} failed.` : "\nAll good.");
process.exit(failed ? 1 : 0);
