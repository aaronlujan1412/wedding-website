-- A food database you can search, instead of nutrition bolted onto a price.
--
-- WHAT WAS WRONG WITH THE LAST ATTEMPT. 20260930034830_item_nutrition.sql put
-- six nutrition columns straight onto meal_items, and a matching script guessed
-- which USDA food each row was. That conflates two different things:
--
--   a meal_items row is A PACK YOU BUY   -- '~6.5 lb pack', Costco, $23.99
--   a food is WHAT IS INSIDE IT          -- 121 kcal, 20.9 g protein per 100g
--
-- Many packs, one food: Costco's chicken thighs and Sam's are the same food at
-- two prices. Storing the food on the pack means re-deriving its identity per
-- row, forever, by fuzzy match -- which is why that script confidently put
-- meatless bacon against bacon and rotisserie chicken SKIN against chicken.
-- Those columns were never read by any page; nothing is lost by dropping them.
--
-- Here the food is a row you pick ONCE, from a search box. The fuzzy matcher
-- stops being an authority that silently writes numbers and becomes a
-- suggestion you can see and reject, which is the only honest job for a guess.
--
-- WHY THE WHOLE THING IS MIRRORED LOCALLY rather than queried live. Foundation
-- and SR Legacy together are a few thousand generic foods -- nothing for
-- Postgres -- and once they are here, search is instant, offline, free of rate
-- limits, and rankable IN ONE QUERY against foods typed in by hand. That last
-- part is the requirement: one box, both sources, because the branded things a
-- generic dataset has never heard of are exactly the ones a person has to add.
--
-- Branded stays out. It is ~2 million rows, one per package, whose differences
-- are packaging rather than food -- every supermarket's own chicken thigh
-- separately. A search for 'chicken thighs' in there returns a hundred
-- near-identical answers, which is worse than none.
--
-- WHO THIS IS FOR: someone counting calories who wants a number that is true.
-- That is why portions are a table of their own below, and why fibre, sugar and
-- sodium are here and not just the three macros.

-- ---------------------------------------------------------------------------
-- The foods
-- ---------------------------------------------------------------------------

create table meal_foods (
  id uuid primary key default gen_random_uuid(),

  -- 'usda'   mirrored from FoodData Central, nobody here edits it
  -- 'custom' typed in by hand, usually a branded thing FDC does not carry
  source text not null,

  -- FoodData Central's own id. Null for custom foods. The natural key for the
  -- import: re-running it updates rows rather than doubling them.
  fdc_id integer unique,
  -- Which FDC dataset: 'Foundation' | 'SR Legacy'. Kept because it says how
  -- the numbers were arrived at -- Foundation is measured, SR Legacy is
  -- largely carried over from older printed tables -- and a tie between two
  -- plausible matches should go to the measured one.
  dataset text,

  description text not null,
  -- FDC's own grouping: 'Poultry Products', 'Vegetables and Vegetable
  -- Products'. Free text, and null on custom foods unless somebody bothers.
  category text,

  -- ---- per 100 g, which is how FDC reports and how nutrition composes ----
  --
  -- Never per serving at this level. A serving is a portion below; storing the
  -- numbers against one would make 'half a cup' a second row of arithmetic
  -- rather than a multiplication.
  kcal numeric(8, 2),
  protein_g numeric(8, 2),
  fat_g numeric(8, 2),
  saturated_fat_g numeric(8, 2),
  carbs_g numeric(8, 2),
  fiber_g numeric(8, 2),
  sugar_g numeric(8, 2),
  sodium_mg numeric(9, 2),

  -- WHY kcal MAY BE COMPUTED. Foundation Foods -- the best entries in the
  -- database -- are measured rather than calculated, and many carry no Energy
  -- value at all: 'Chicken, thigh, boneless, skinless, raw' reports protein,
  -- fat and carbs and no calories. Where that happens kcal is reconstructed
  -- with the Atwater factors (4/9/4), landing within a couple of percent, and
  -- this flag says so rather than letting a computed number pass as measured.
  --
  -- The flag exists because the person reading these numbers is counting
  -- calories. 'About 240' and '240' are different claims.
  kcal_is_derived boolean not null default false,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint meal_foods_source check (source in ('usda', 'custom')),
  constraint meal_foods_description_not_blank check (length(btrim(description)) > 0),
  -- A USDA row without its id could never be updated by the import, and a
  -- custom row with one would be overwritten by it.
  constraint meal_foods_fdc_id_matches_source check (
    (source = 'usda' and fdc_id is not null) or
    (source = 'custom' and fdc_id is null)
  ),
  -- Negative macros are a parse error, not a food.
  constraint meal_foods_macros_sane check (
    coalesce(kcal, 0) >= 0 and coalesce(protein_g, 0) >= 0
    and coalesce(fat_g, 0) >= 0 and coalesce(carbs_g, 0) >= 0
    and coalesce(fiber_g, 0) >= 0 and coalesce(sugar_g, 0) >= 0
    and coalesce(sodium_mg, 0) >= 0 and coalesce(saturated_fat_g, 0) >= 0
  )
);

alter table meal_foods enable row level security;

-- Typing the same custom food twice is a mistake every time, and it is the
-- kind that only shows up later as two answers to one question. USDA rows are
-- exempt: FDC genuinely carries near-duplicate descriptions across datasets.
create unique index meal_foods_custom_unique
  on meal_foods (lower(btrim(description)))
  where source = 'custom';

-- ---------------------------------------------------------------------------
-- Portions: the part that makes it usable
-- ---------------------------------------------------------------------------

-- Per 100 g is correct and nobody eats it. The question is always "how much is
-- in a cup", and FDC answers it -- foodPortions carries '1 cup, chopped' =
-- 135 g. Without this table every lookup ends in the reader doing arithmetic
-- against a kitchen scale they are not holding, which is how a diet stops
-- being measured and goes back to being a guess.
--
-- Its own table rather than columns because the count varies from none to a
-- dozen, and because 'the one you mean' is a choice made at read time.
create table meal_food_portions (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references meal_foods (id) on delete cascade,

  -- As FDC words it: '1 cup, chopped', '1 medium (2-1/2" dia)', '1 oz'.
  -- Human text on purpose; the modifier is half the meaning.
  label text not null,
  grams numeric(9, 2) not null,

  -- FDC's ordering, which puts the most ordinary portion first. Worth keeping:
  -- alphabetical would lead with '1 cubic inch'.
  sort_order integer not null default 0,

  constraint meal_food_portions_grams_positive check (grams > 0),
  constraint meal_food_portions_label_not_blank check (length(btrim(label)) > 0),
  -- One row per portion per food. The import upserts on this.
  constraint meal_food_portions_unique unique (food_id, label)
);

alter table meal_food_portions enable row level security;

create index meal_food_portions_food on meal_food_portions (food_id, sort_order);

-- ---------------------------------------------------------------------------
-- Search
-- ---------------------------------------------------------------------------

-- Same shape as brain_note_search in 20260929165747_brain_notes.sql: a
-- function, because a generated column needs an immutable expression, and
-- weighted so the food's own name beats the category it sits in. A search for
-- 'cheese' should not be led by every dish in 'Cheese Products'.
--
-- The catch, the same one as over there: rows do NOT recompute when this
-- function changes. Changing the weights means backfilling every row, so treat
-- this body as part of the table's shape.
create or replace function meal_food_search(p_description text, p_category text)
returns tsvector
language sql
immutable
set search_path = public
as $$
  select setweight(to_tsvector('english', coalesce(p_description, '')), 'A')
      || setweight(to_tsvector('english', coalesce(p_category, '')), 'B')
$$;

revoke execute on function meal_food_search(text, text) from public, anon, authenticated;
grant execute on function meal_food_search(text, text) to service_role;

alter table meal_foods add column search tsvector
  generated always as (meal_food_search(description, category)) stored;

create index meal_foods_search on meal_foods using gin (search);

-- Trigram on the description, for the half of searching full-text is bad at: a
-- misspelling, a remembered fragment, a rare token inside a longer word.
-- Someone typing 'yoghurt' at an American database should still find yogurt.
create index meal_foods_description_trgm
  on meal_foods using gin (description extensions.gin_trgm_ops);

-- Browsing without a query at all: custom foods first, then alphabetical.
create index meal_foods_browse on meal_foods (source, description);

-- ---------------------------------------------------------------------------
-- The price book points at a food
-- ---------------------------------------------------------------------------

alter table meal_items
  -- Nullable forever. A pack nobody has identified is the normal state of a
  -- new row, and the price book was useful for a month before any of this
  -- existed. `on delete set null` rather than cascade: deleting a food must
  -- never delete the thing you buy, or correcting the database loses a price.
  add column food_id uuid references meal_foods (id) on delete set null;

create index meal_items_food on meal_items (food_id);

comment on column meal_items.food_id is
  'Which food is in this pack. Null means nobody has said yet -- see meal_foods for why this replaced copied nutrition columns.';

-- The columns 20260930034830 added, now superseded. Read by no page, no query
-- and no component -- checked before writing this -- so this drops rather than
-- migrating anything across. The one script that wrote them is replaced in the
-- same change.
alter table meal_items
  drop column fdc_id,
  drop column fdc_description,
  drop column kcal_per_100g,
  drop column protein_per_100g,
  drop column fat_per_100g,
  drop column carbs_per_100g,
  drop column kcal_is_derived,
  drop column nutrition_updated_at;

-- That index was on meal_items.fdc_id and went with the column; the equivalent
-- question is now "which packs have no food", which meal_items_food answers.
