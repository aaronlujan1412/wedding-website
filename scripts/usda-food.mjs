/**
 * Reading one FoodData Central record into the shape meal_foods stores.
 *
 * Its own module for the same reason usda-match.mjs is: it is the part most
 * likely to be wrong about the wire format, and the only part testable without
 * an API key. See test-usda-food.mjs, whose cases are the shapes FDC actually
 * returns rather than the ones the docs imply.
 */

/**
 * Nutrient NUMBERS, not names.
 *
 * The names move around between datasets and endpoints -- 'Sugars, total
 * including NLEA' in one place and 'Sugars, Total' in another -- while the
 * numbers are USDA's stable identifiers. Keying on the name is how the last
 * script ended up reading nothing from the detail endpoint.
 */
const NUTRIENTS = {
  "203": "protein_g",
  "204": "fat_g",
  "205": "carbs_g",
  "269": "sugar_g",
  "291": "fiber_g",
  "307": "sodium_mg",
  "606": "saturated_fat_g",
};

/**
 * The three ways FDC reports calories, in order of preference.
 *
 *   208  Energy, as measured or as the dataset carries it
 *   957  Energy from the Atwater GENERAL factors  -- USDA's own 4/9/4
 *   958  Energy from the Atwater SPECIFIC factors -- per-food coefficients
 *
 * 957 and 958 are calculated by USDA, so taking one and calling the result
 * measured would be a small lie to someone counting calories. They are marked
 * derived, exactly as our own fallback arithmetic is. 268 (kilojoules) is
 * deliberately absent: reading it as kcal gives a number four times too big,
 * which is the bug the old script's unit check existed to dodge.
 */
const ENERGY = { "208": false, "957": true, "958": true };

/**
 * Both response shapes, from one function.
 *
 * `POST /v1/foods` and `GET /v1/food/{id}` nest the nutrient as
 * `nutrient.{number,unitName}` with the value in `amount`; search results
 * flatten it to `nutrientNumber` and `value`. Supporting both is not
 * defensiveness -- the previous script read one shape, was handed the other,
 * and silently found no nutrients at all.
 */
function field(n) {
  return {
    number: String(n.nutrient?.number ?? n.nutrientNumber ?? "").trim(),
    unit: String(n.nutrient?.unitName ?? n.unitName ?? "").toUpperCase(),
    value: n.amount ?? n.value,
  };
}

/**
 * How far below zero a macro may go and still be believed as zero.
 *
 * Carbohydrate is reported "by difference": 100 minus water, protein, fat and
 * ash. On a food with essentially no carbohydrate, the measurement errors on
 * those four accumulate straight past zero. Foundation reports exactly that for
 * seven foods -- bison, lamb, halibut and four cuts of chicken -- between
 * -0.48 and -0.06 g.
 *
 * So a small negative is not bad data, it is the method showing its working,
 * and zero is the true value within measurement error. A LARGE negative is not
 * an artifact of subtraction; it is a parse problem, and it becomes null rather
 * than a number somebody might count.
 *
 * This matters beyond tidiness: the database rejects negatives outright
 * (meal_foods_macros_sane), and rows are written in batches, so one unclamped
 * -0.14 took nineteen good foods down with it.
 */
const BY_DIFFERENCE_SLACK = 2;

function sane(value) {
  if (value >= 0) return value;
  return value > -BY_DIFFERENCE_SLACK ? 0 : null;
}

/** The eight numbers, per 100 g, plus whether the calories were calculated. */
function readNutrients(food) {
  const out = {};
  const energy = {};

  for (const raw of food.foodNutrients ?? []) {
    const { number, unit, value } = field(raw);
    if (value === undefined || value === null || Number.isNaN(Number(value))) continue;

    if (number in ENERGY) {
      // Guard the unit even though the number should imply it. A kJ figure
      // arriving under 208 would otherwise quadruple every calorie on the page.
      if (unit && unit !== "KCAL") continue;
      if (energy[number] === undefined) energy[number] = sane(Number(value));
      continue;
    }

    const column = NUTRIENTS[number];
    if (column && out[column] === undefined) out[column] = sane(Number(value));
  }

  for (const [number, derived] of Object.entries(ENERGY)) {
    if (energy[number] !== undefined) {
      return { ...out, kcal: energy[number], kcal_is_derived: derived };
    }
  }

  /*
   * No Energy row at all, which is ordinary for Foundation Foods. Atwater
   * (4/9/4) reconstructs it to within a couple of percent -- but ONLY from a
   * complete set. All three, or no answer.
   *
   * WHY ALL THREE. A missing macro is not a zero, and treating it as one does
   * not produce an approximation, it produces a floor wearing an
   * approximation's clothes. Foundation records "Beans, Dry, Black (0%
   * moisture)" with protein and fat and no carbohydrate, and carbohydrate is
   * most of a bean: summing what was there gave 110 kcal against a real ~340.
   * Watermelon flesh, recorded with protein alone, came out at 3.5 kcal.
   * Thirty-three foods were wrong this way, and every one of them looked
   * measured.
   *
   * Null is the honest answer, and the pages already draw it as "no calorie
   * figure" rather than as zero -- which is the older half of this same bug,
   * when olive oil summed three absent macros and reported nothing at all.
   */
  const macros = ["protein_g", "fat_g", "carbs_g"];
  if (!macros.every((m) => out[m] !== undefined && out[m] !== null)) {
    return { ...out, kcal: null, kcal_is_derived: false };
  }

  const kcal = out.protein_g * 4 + out.fat_g * 9 + out.carbs_g * 4;
  return { ...out, kcal: Math.round(kcal * 100) / 100, kcal_is_derived: true };
}

/** '1.0' reads as a machine talking; '1' reads as a recipe. */
function amountText(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "";
  return String(Number(n.toFixed(3)));
}

/**
 * How a portion is worded.
 *
 * SR Legacy writes the whole thing in `portionDescription` ('1 cup, chopped')
 * and leaves `measureUnit.name` as the literal string 'undetermined'.
 * Foundation does the opposite: amount 1, unit 'cup', modifier 'chopped'. Both
 * are in the datasets being imported, so both are read here.
 */
function portionLabel(portion) {
  const described = String(portion.portionDescription ?? "").trim();
  if (described && described.toLowerCase() !== "undetermined") return described;

  const unitName = String(portion.measureUnit?.name ?? "").trim();
  const unit = unitName.toLowerCase() === "undetermined" ? "" : unitName;
  const modifier = String(portion.modifier ?? "").trim();
  const amount = amountText(portion.amount);

  const tidy = (s) => s.replace(/\s+/g, " ").trim();

  // With a unit, the modifier hangs off it with a comma, the way a recipe
  // writes it: '1 cup, chopped'.
  if (unit) {
    const measure = [amount, unit].filter(Boolean).join(" ");
    return tidy(modifier ? `${measure}, ${modifier}` : measure);
  }

  // Without one, the modifier IS the measure noun, so it takes a space:
  // '1 medium', not '1, medium'.
  return tidy([amount, modifier].filter(Boolean).join(" "));
}

/**
 * Every portion worth storing, in FDC's own order.
 *
 * Deduplicated on the label, because the unique constraint is (food_id, label)
 * and FDC does ship the same wording twice on some foods -- two measurements of
 * '1 cup' from different studies. First wins, which by sequence number is the
 * one FDC leads with.
 */
function readPortions(food) {
  const seen = new Set();
  const out = [];

  const sorted = [...(food.foodPortions ?? [])].sort(
    (a, b) => (a.sequenceNumber ?? 9999) - (b.sequenceNumber ?? 9999),
  );

  for (const portion of sorted) {
    const grams = Number(portion.gramWeight);
    // The check constraint requires grams > 0, and a zero-weight portion is a
    // gap in the source rather than a food that weighs nothing.
    if (!Number.isFinite(grams) || grams <= 0) continue;

    const label = portionLabel(portion);
    if (!label) continue;

    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({ label, grams: Math.round(grams * 100) / 100, sort_order: out.length });
  }

  return out;
}

/** One FDC record as a meal_foods row, portions alongside. */
function readFood(food) {
  const description = String(food.description ?? "").trim();
  if (!food.fdcId || !description) return null;

  return {
    row: {
      source: "usda",
      fdc_id: Number(food.fdcId),
      dataset: food.dataType ?? null,
      description,
      category:
        // Foundation nests it; SR Legacy sometimes sends the name flat.
        food.foodCategory?.description ??
        (typeof food.foodCategory === "string" ? food.foodCategory : null),
      ...readNutrients(food),
    },
    portions: readPortions(food),
  };
}

export { NUTRIENTS, ENERGY, readNutrients, readPortions, portionLabel, readFood };
