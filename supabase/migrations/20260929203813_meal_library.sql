-- The meal planning library: what we cook, what it costs, and what goes in it.
--
-- This replaces two markdown files that a skill re-read every month
-- (references/price_book.md and references/recipe_library.md) and, more
-- importantly, adds the thing neither of them had: a link from a dish to the
-- items it needs.
--
-- WHY THAT LINK IS THE WHOLE POINT. Today the skill hand-writes every shopping
-- line and hand-prices it, which is why its own notes record a first pass
-- landing 75% over an $800 budget -- "unit prices guessed 10-20% high, and
-- roughly 20 lb of surplus protein". With dishes joined to items, the shopping
-- list stops being written and starts being COMPUTED: pick the menu, multiply
-- by servings, price from here. The only judgement left is which dishes, which
-- is the part a person should be doing.
--
-- The price book is the other half. A markdown table ages -- its own header
-- says "re-check a few spot prices each month; grocery prices drift, and these
-- will age". A row with a date on it can be re-priced without rewriting a
-- document, and meal_item_prices keeps what it used to be, so "is beef up
-- again?" becomes answerable instead of a feeling.

-- What you can buy. One row per purchasable pack, because that is the unit
-- Costco and Sam's actually ship and the unit the budget is counted in.
create table meal_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- 'Costco' | 'Sam's Club' | anywhere else. Free text: a store is not an
  -- enum worth migrating for.
  store text,
  -- As written on the shelf: '~6.5 lb pack', '10 lb bag', '24 ct'. Human text
  -- on purpose -- normalising this into a quantity and a unit would lose
  -- exactly the information that makes a shopping line checkable against what
  -- turns up in the box.
  pack text,
  -- protein | dairy | produce-hardy | produce-fresh | frozen | grain | pantry |
  -- snack. Free text for the same reason as store.
  category text,
  -- core    counts toward the budget, this month's meals and staple snacks
  -- pantry  counts toward the budget but right-sized, "skip if stocked"
  -- optional shown separately, NOT counted
  tier text not null default 'core',

  -- Cents, like every other price in this database (see trip_items.cost_amount).
  -- Never a float: a budget that has to land under $800 should not accumulate
  -- binary rounding on the way there.
  price_cents integer,
  -- Prices here carry the ~18% Instacart markup already. Kept as a flag rather
  -- than assumed, because curbside pickup runs noticeably lower and the
  -- workbook shows that as its own line.
  price_includes_markup boolean not null default true,
  priced_on date,

  -- Roughly how long it survives after delivery. This is what makes a dish
  -- safe at day 13 of an order window, and it is the single most useful
  -- number in the price book -- bell peppers keeping 2 weeks is why a
  -- stuffed-pepper dinner can sit at the tail.
  keeps_days integer,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint meal_items_tier check (tier in ('core', 'pantry', 'optional')),
  constraint meal_items_name_not_blank check (length(btrim(name)) > 0),
  constraint meal_items_price_sane check (price_cents is null or price_cents >= 0),
  -- One row per thing per store. Re-pricing updates the row; it does not add
  -- a second one.
  constraint meal_items_unique unique (name, store)
);

alter table meal_items enable row level security;

create index meal_items_browse on meal_items (tier, category, name);

-- What a price used to be. Appended when a price changes, never updated, so
-- the answer to "has chicken gone up?" is a query rather than a memory.
create table meal_item_prices (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references meal_items (id) on delete cascade,
  price_cents integer not null,
  priced_on date not null default current_date,
  source text,
  created_at timestamptz not null default now(),

  constraint meal_item_prices_sane check (price_cents >= 0)
);

alter table meal_item_prices enable row level security;

create index meal_item_prices_history on meal_item_prices (item_id, priced_on desc);

-- What we cook.
create table meal_recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  -- dinner | lunch | snack | special
  kind text not null default 'dinner',
  serves integer,
  -- Aaron's serving; Savea's runs roughly 65-75% of it. One number rather than
  -- two because that ratio has held across the whole library and a second
  -- column would be two things to keep in step for no new information.
  kcal integer,
  protein_g integer,
  method text,

  -- When in an order window this dish can be cooked. THE most load-bearing
  -- field for planning:
  --   day0-2   needs produce that will not wait (eggplant, zucchini)
  --   early    needs fresh produce, first week after a delivery
  --   mid      a week or so out
  --   any      hardy or frozen, safe at the tail of a window
  -- A plan that ignores this is how a day-14 dinner ends up depending on
  -- fresh herbs delivered thirteen days earlier.
  window_when text not null default 'any',

  notes text,
  -- Freezes and reheats, so it can be doubled early for a zero-cook night.
  batch_friendly boolean not null default false,
  -- Null until it has been cooked from a plan. Drives rotation: the rule is no
  -- dinner more than twice a month, which is far easier to honour against a
  -- date than against a memory.
  last_planned_on date,
  retired boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint meal_recipes_kind check (kind in ('dinner', 'lunch', 'snack', 'special')),
  constraint meal_recipes_window check (
    window_when in ('day0-2', 'early', 'mid', 'any')
  ),
  constraint meal_recipes_name_not_blank check (length(btrim(name)) > 0)
);

alter table meal_recipes enable row level security;

create index meal_recipes_browse on meal_recipes (retired, kind, window_when);

-- The join that makes a shopping list computable.
--
-- Quantities are nullable and most will start that way: this graph is being
-- recovered from a worked month's "Used for" column, which records THAT a dish
-- needed an item without always saying how much. An unquantified link is still
-- worth having -- it gets the item onto the list, and the amount can be
-- sharpened the next time that dish is actually cooked.
create table meal_recipe_items (
  recipe_id uuid not null references meal_recipes (id) on delete cascade,
  item_id uuid not null references meal_items (id) on delete cascade,
  -- Per the recipe's own `serves`, not per person -- scaling a dish for a
  -- guest night is then one multiplication.
  quantity numeric(10, 3),
  unit text,
  -- The dish works without it: a garnish, a herb, an optional topping. Kept
  -- off the critical path when trimming to budget.
  optional boolean not null default false,
  notes text,

  primary key (recipe_id, item_id),
  constraint meal_recipe_items_quantity_sane check (quantity is null or quantity > 0)
);

alter table meal_recipe_items enable row level security;

-- "What else uses this item?" is asked as often as "what does this dish need?"
create index meal_recipe_items_by_item on meal_recipe_items (item_id);

-- The standing setup: budget, calorie targets, the kid rhythm, order cadence.
--
-- One row, enforced. These were prose in a skill file, which meant they were
-- re-read and re-asked every month; as data they can be set once in a form and
-- changed when they actually change.
create table meal_settings (
  id boolean primary key default true,
  budget_cents integer not null default 80000,
  orders_per_month integer not null default 2,
  aaron_kcal integer not null default 1900,
  savea_kcal integer not null default 1200,
  -- Every-other-week, Wednesday dinner through Saturday morning. Stored as the
  -- date of a known kid Wednesday so the cycle can be computed forward instead
  -- of asked about each month.
  kid_cycle_anchor date,
  kid_cycle_days integer not null default 14,
  notes text,
  updated_at timestamptz not null default now(),

  constraint meal_settings_singleton check (id),
  constraint meal_settings_budget_sane check (budget_cents > 0)
);

alter table meal_settings enable row level security;

-- The hard rules, as rows.
--
-- NO ORZO, olives on Aaron's plate only, dried beans never canned, and so on.
-- They live here rather than in a prompt so the workbook's rule banner, the
-- audit that checks the finished file, and the page that lets you add a new
-- dislike are all reading the same list. A rule someone adds in the UI is
-- enforced on the next plan without anybody editing a skill.
create table meal_rules (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  detail text not null,
  -- Checked mechanically against the finished plan: a word that must not
  -- appear anywhere ('orzo'), or must not appear on one person's side
  -- ('olive'). Null for rules only a human can judge.
  forbidden_term text,
  -- Whose side the term is banned from, when it is not banned outright.
  applies_to text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),

  constraint meal_rules_label_not_blank check (length(btrim(label)) > 0)
);

alter table meal_rules enable row level security;

create index meal_rules_active on meal_rules (active, sort_order);
