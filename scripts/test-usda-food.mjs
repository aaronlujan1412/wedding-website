/**
 * Reading an FDC record, against the shapes FDC actually sends.
 *
 * No key and no network. The risky part of this import is the wire format --
 * two endpoints nest nutrients differently and two datasets word portions
 * differently -- and every case here is one of those, or a bug the previous
 * attempt shipped.
 *
 *   node scripts/test-usda-food.mjs
 */
import { readFood, readNutrients, readPortions, portionLabel } from "./usda-food.mjs";

let failed = 0;
const check = (label, actual) => {
  console.log(`  ${actual ? "ok  " : "FAIL"} ${label}`);
  if (!actual) failed += 1;
};
const near = (a, b) => a !== null && a !== undefined && Math.abs(a - b) < 0.02;

/* ---- nutrients: the two nestings ------------------------------------- */

// GET /food/{id} and POST /foods: nested under `nutrient`, value in `amount`.
const detail = readNutrients({
  foodNutrients: [
    { nutrient: { number: "203", name: "Protein", unitName: "G" }, amount: 20.9 },
    { nutrient: { number: "204", name: "Total lipid (fat)", unitName: "G" }, amount: 4.31 },
    { nutrient: { number: "208", name: "Energy", unitName: "KCAL" }, amount: 121 },
  ],
});
check("detail shape: protein read", near(detail.protein_g, 20.9));
check("detail shape: kcal read", near(detail.kcal, 121));
check("detail shape: measured kcal is not marked derived", detail.kcal_is_derived === false);

// /foods/search: flattened, value in `value`. The old script read only the
// other shape and silently found no nutrients at all.
const flat = readNutrients({
  foodNutrients: [
    { nutrientNumber: "203", nutrientName: "Protein", unitName: "G", value: 6.1 },
    { nutrientNumber: "208", nutrientName: "Energy", unitName: "KCAL", value: 78 },
  ],
});
check("search shape: protein read", near(flat.protein_g, 6.1));
check("search shape: kcal read", near(flat.kcal, 78));

/* ---- energy: the four-times-too-big trap ----------------------------- */

const kj = readNutrients({
  foodNutrients: [
    { nutrient: { number: "268", unitName: "KJ" }, amount: 1548 },
    { nutrient: { number: "208", unitName: "KCAL" }, amount: 370 },
  ],
});
check("kilojoules under 268 are ignored", near(kj.kcal, 370));

const wrongUnit = readNutrients({
  foodNutrients: [
    { nutrient: { number: "208", unitName: "kJ" }, amount: 1548 },
    { nutrient: { number: "203", unitName: "G" }, amount: 10 },
  ],
});
check(
  "a kJ value mislabelled as 208 is refused, not quadrupled",
  !near(wrongUnit.kcal, 1548),
);

// 957/958 are USDA's own Atwater arithmetic. Usable, but not measured.
const atwater = readNutrients({
  foodNutrients: [
    { nutrient: { number: "957", unitName: "KCAL" }, amount: 240 },
    { nutrient: { number: "203", unitName: "G" }, amount: 12 },
  ],
});
check("Atwater energy (957) is used", near(atwater.kcal, 240));
check("Atwater energy is marked derived", atwater.kcal_is_derived === true);

check(
  "measured 208 wins over Atwater 957 when both are present",
  (() => {
    const both = readNutrients({
      foodNutrients: [
        { nutrient: { number: "957", unitName: "KCAL" }, amount: 250 },
        { nutrient: { number: "208", unitName: "KCAL" }, amount: 243 },
      ],
    });
    return near(both.kcal, 243) && both.kcal_is_derived === false;
  })(),
);

/* ---- energy from macros, and the olive oil bug ----------------------- */

// Foundation Foods often carry no Energy row at all.
const derived = readNutrients({
  foodNutrients: [
    { nutrient: { number: "203", unitName: "G" }, amount: 20 },
    { nutrient: { number: "204", unitName: "G" }, amount: 10 },
    { nutrient: { number: "205", unitName: "G" }, amount: 5 },
  ],
});
check("no Energy row: kcal derived 4/9/4", near(derived.kcal, 20 * 4 + 10 * 9 + 5 * 4));
check("derived kcal says so", derived.kcal_is_derived === true);

// A PARTIAL macro set derives nothing. Foundation records dry beans with
// protein and fat and no carbohydrate -- and carbohydrate is most of a bean --
// so summing what was there gave 110 kcal against a real ~340. Thirty-three
// foods were wrong that way, and every one looked measured.
const partial = readNutrients({
  foodNutrients: [
    { nutrient: { number: "203", unitName: "G" }, amount: 24.4 },
    { nutrient: { number: "204", unitName: "G" }, amount: 1.45 },
  ],
});
check("protein and fat without carbs derives nothing", partial.kcal === null);
check("and is not marked derived", partial.kcal_is_derived === false);
check("the macros that were there are still kept", near(partial.protein_g, 24.4));

// An explicit zero is a measurement, not a gap: pure fat still derives.
const oil = readNutrients({
  foodNutrients: [
    { nutrient: { number: "204", unitName: "G" }, amount: 100 },
    { nutrient: { number: "203", unitName: "G" }, amount: 0 },
    { nutrient: { number: "205", unitName: "G" }, amount: 0 },
  ],
});
check("a complete set with zeroes still derives (olive oil, 900)", near(oil.kcal, 900));

// Nothing to read at all must be null, NOT a confident zero.
const empty = readNutrients({ foodNutrients: [] });
check("no macros at all: kcal is null, not 0", empty.kcal === null);
check("a null kcal is not marked derived", empty.kcal_is_derived === false);

const sodiumOnly = readNutrients({
  foodNutrients: [{ nutrient: { number: "307", unitName: "MG" }, amount: 480 }],
});
check("sodium without macros does not invent calories", sodiumOnly.kcal === null);
check("sodium is still read", near(sodiumOnly.sodium_mg, 480));

/* ---- negatives: the method showing its working ----------------------- */

// Foundation reports carbohydrate "by difference" slightly below zero on seven
// meats and fish. Real values, and the database rejects negatives outright --
// unclamped, one of these took its whole batch of twenty down with it.
const byDifference = readNutrients({
  foodNutrients: [
    { nutrient: { number: "205", unitName: "G" }, amount: -0.42825 },
    { nutrient: { number: "203", unitName: "G" }, amount: 20.85 },
    { nutrient: { number: "204", unitName: "G" }, amount: 0 },
  ],
});
check("a small negative carb reads as zero", byDifference.carbs_g === 0);
check("the other macros are untouched", near(byDifference.protein_g, 20.85));
check(
  "the clamp happens before Atwater, so kcal is not dragged below the protein",
  near(byDifference.kcal, 20.85 * 4),
);

// Not an artifact of subtraction -- that is a parse problem, and a number
// nobody should count.
const wild = readNutrients({
  foodNutrients: [
    { nutrient: { number: "205", unitName: "G" }, amount: -40 },
    { nutrient: { number: "203", unitName: "G" }, amount: 10 },
    { nutrient: { number: "204", unitName: "G" }, amount: 2 },
  ],
});
check("a large negative becomes null, not zero", wild.carbs_g === null);
check(
  "nulling a macro leaves the set incomplete, so nothing is derived",
  wild.kcal === null,
);

check(
  "a food whose only macro was nulled has no calories, not zero",
  (() => {
    const only = readNutrients({
      foodNutrients: [{ nutrient: { number: "205", unitName: "G" }, amount: -99 }],
    });
    return only.carbs_g === null && only.kcal === null;
  })(),
);

/* ---- portions: two datasets, two wordings ---------------------------- */

// SR Legacy writes the whole phrase and leaves the unit 'undetermined'.
check(
  "SR Legacy portionDescription is used verbatim",
  portionLabel({
    portionDescription: "1 cup, chopped",
    measureUnit: { name: "undetermined" },
    gramWeight: 135,
  }) === "1 cup, chopped",
);

// Foundation builds it from parts.
check(
  "Foundation parts become '1 cup, chopped'",
  portionLabel({ amount: 1, measureUnit: { name: "cup" }, modifier: "chopped" }) ===
    "1 cup, chopped",
);
check(
  "no unit: the modifier IS the measure ('1 medium')",
  portionLabel({ amount: 1, measureUnit: { name: "undetermined" }, modifier: "medium" }) ===
    "1 medium",
);
check(
  "the literal string 'undetermined' never reaches a label",
  !portionLabel({
    portionDescription: "undetermined",
    amount: 2,
    measureUnit: { name: "tbsp" },
  })
    .toLowerCase()
    .includes("undetermined"),
);
check("1.0 is written as 1", portionLabel({ amount: 1.0, measureUnit: { name: "oz" } }) === "1 oz");
check("a real fraction survives", portionLabel({ amount: 0.5, measureUnit: { name: "cup" } }) === "0.5 cup");

const portions = readPortions({
  foodPortions: [
    { sequenceNumber: 2, gramWeight: 28.35, measureUnit: { name: "oz" }, amount: 1 },
    { sequenceNumber: 1, gramWeight: 135, portionDescription: "1 cup, chopped" },
    // Same wording twice, which FDC does ship: two studies, one label.
    { sequenceNumber: 3, gramWeight: 136, portionDescription: "1 cup, chopped" },
    // Weightless portions are a gap in the source, not a weightless food.
    { sequenceNumber: 4, gramWeight: 0, portionDescription: "1 pinch" },
    { sequenceNumber: 5, portionDescription: "1 handful" },
  ],
});
check("portions come back in FDC's sequence", portions[0].label === "1 cup, chopped");
check("a duplicate label is dropped", portions.filter((p) => p.label === "1 cup, chopped").length === 1);
check("a zero-gram portion is dropped", !portions.some((p) => p.label === "1 pinch"));
check("a portion with no weight is dropped", !portions.some((p) => p.label === "1 handful"));
check("sort_order is contiguous from 0", portions.every((p, i) => p.sort_order === i));
check("two portions survive", portions.length === 2);

/* ---- the whole record ------------------------------------------------ */

const whole = readFood({
  fdcId: 331960,
  dataType: "Foundation",
  description: "Chicken, thigh, boneless, skinless, raw",
  foodCategory: { description: "Poultry Products" },
  foodNutrients: [{ nutrient: { number: "203", unitName: "G" }, amount: 20.9 }],
  foodPortions: [{ sequenceNumber: 1, gramWeight: 113, portionDescription: "1 thigh" }],
});
check("a whole record reads", whole !== null);
check("source is usda", whole.row.source === "usda");
check("fdc_id is a number", whole.row.fdc_id === 331960);
check("category is unnested", whole.row.category === "Poultry Products");
check("dataset is kept", whole.row.dataset === "Foundation");
check("portions ride along", whole.portions.length === 1);

// SR Legacy sometimes sends the category as a bare string.
check(
  "a flat string category is read too",
  readFood({
    fdcId: 1,
    description: "x",
    foodCategory: "Dairy and Egg Products",
    foodNutrients: [],
  }).row.category === "Dairy and Egg Products",
);

check("a record with no description is refused", readFood({ fdcId: 2, description: "  " }) === null);
check("a record with no id is refused", readFood({ description: "Beans" }) === null);

console.log(failed ? `\n${failed} failed.` : "\nAll good.");
process.exit(failed ? 1 : 0);
