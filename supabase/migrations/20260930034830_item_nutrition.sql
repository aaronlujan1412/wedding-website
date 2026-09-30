-- Nutrition per 100g, from USDA FoodData Central.
--
-- The recipe library carries calories and protein per serving, typed in by
-- hand and unverifiable. This is the other end of that: what the ingredients
-- actually contain, from the reference database, so a dish's numbers can be
-- checked rather than trusted.
--
-- Per 100g because that is how FDC reports and how nutrition composes. Turning
-- it into per-serving needs the quantity a recipe uses, which mostly is not
-- recorded yet -- so this is the half that can be had now, and the arithmetic
-- waits on the other half.
--
-- WHY kcal MAY BE COMPUTED. Foundation Foods -- the best generic entries -- are
-- measured rather than calculated, and many carry no Energy value at all:
-- "Chicken, thigh, boneless, skinless, raw" reports protein, fat and carbs and
-- no calories. Where that happens the kcal is derived with the Atwater factors
-- (4/9/4), which lands within a couple of percent, and `kcal_is_derived` says
-- so rather than letting a computed number pass as a measured one.

alter table meal_items
  add column fdc_id integer,
  -- What FDC calls it. Kept because "Chicken thighs, boneless skinless" on a
  -- shopping list matched "Chicken, thigh, boneless, skinless, raw" by fuzzy
  -- search, and the only way to audit that later is to see both.
  add column fdc_description text,
  add column kcal_per_100g numeric(8, 2),
  add column protein_per_100g numeric(8, 2),
  add column fat_per_100g numeric(8, 2),
  add column carbs_per_100g numeric(8, 2),
  add column kcal_is_derived boolean not null default false,
  add column nutrition_updated_at timestamptz;

comment on column meal_items.fdc_id is
  'FoodData Central id. Null means nothing was matched — usually a branded snack, which the generic datasets do not carry.';

-- "What still has no nutrition" is the question this table gets asked.
create index meal_items_unmatched on meal_items (fdc_id) where fdc_id is null;
