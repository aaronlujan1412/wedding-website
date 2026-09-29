-- A month's plan, and the shopping list computed from it.
--
-- The library (meal_items, meal_recipes, meal_recipe_items) says what exists.
-- This says what we are actually eating in October, and derives what to buy.
--
-- The derivation is the point. Assigning dinners to days is a judgement call a
-- person should make; working out that three of those dinners share a pack of
-- chicken thighs, that the bell peppers have to ride on the second order to
-- still be good on the 27th, and what the whole thing costs, is arithmetic --
-- and arithmetic done by hand is where the skill's documented 75%-over-budget
-- first pass came from.

create table meal_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_on date not null,
  ends_on date not null,
  -- Copied from meal_settings at creation rather than read live: a plan that
  -- came in under budget should still say so after the budget changes.
  budget_cents integer not null,
  -- draft  -> being edited, the list regenerates freely
  -- final  -> ordered; the list is what was actually bought
  status text not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint meal_plans_status check (status in ('draft', 'final')),
  constraint meal_plans_dates check (ends_on >= starts_on),
  constraint meal_plans_budget_sane check (budget_cents > 0),
  constraint meal_plans_name_not_blank check (length(btrim(name)) > 0)
);

alter table meal_plans enable row level security;

-- The deliveries. Everything a day needs has to arrive on one of these, and
-- which one is what the coverage check is about.
create table meal_plan_orders (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references meal_plans (id) on delete cascade,
  -- 1 or 2 in practice; not constrained, because a five-week month splitting
  -- three ways is a reasonable thing to want.
  ordinal integer not null,
  delivers_on date not null,
  store text,
  notes text,

  constraint meal_plan_orders_ordinal_positive check (ordinal > 0),
  unique (plan_id, ordinal)
);

alter table meal_plan_orders enable row level security;

create index meal_plan_orders_by_date on meal_plan_orders (plan_id, delivers_on);

-- One row per day in the range. The calendar.
create table meal_plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references meal_plans (id) on delete cascade,
  on_date date not null,

  -- Null is meaningful: a weekend on leftovers, or a day nobody has decided
  -- about yet. Both are ordinary, and neither should contribute to the list.
  dinner_recipe_id uuid references meal_recipes (id) on delete set null,
  lunch_recipe_id uuid references meal_recipes (id) on delete set null,

  -- Who is eating, which sets the servings: two adults normally, three on a
  -- kid night, headcount + 1 for guests.
  eaters integer not null default 2,
  kid_here boolean not null default false,
  prep_day boolean not null default false,
  notes text,

  unique (plan_id, on_date),
  constraint meal_plan_days_eaters_sane check (eaters > 0)
);

alter table meal_plan_days enable row level security;

create index meal_plan_days_calendar on meal_plan_days (plan_id, on_date);

-- The shopping list, generated. One row per item per order.
--
-- Generated but STORED, and the price is snapshotted rather than joined: a
-- plan is a record of what was ordered at what price, and re-reading today's
-- price book would rewrite last month's history every time beef moved.
create table meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references meal_plans (id) on delete cascade,
  order_id uuid not null references meal_plan_orders (id) on delete cascade,
  item_id uuid not null references meal_items (id) on delete cascade,

  quantity numeric(10, 2) not null default 1,
  unit_price_cents integer not null,
  tier text not null default 'core',

  -- Which dishes, on which dates, put this on the list. The "Used for" column
  -- the workbook has always carried -- now derived rather than typed.
  used_for text,

  -- Set when the item cannot survive from its delivery to the day it is needed.
  -- The whole "Order Coverage Check" discipline, computed: a dinner on the 27th
  -- built around produce delivered on the 12th is the recurring failure this
  -- catches.
  coverage_warning text,

  -- False once a person has checked the amount. Everything starts true, because
  -- most recipe links carry no quantity yet and one pack is a guess.
  quantity_is_a_guess boolean not null default true,
  -- Rows the generator owns. A line added by hand survives regeneration.
  generated boolean not null default true,

  constraint meal_plan_items_quantity_positive check (quantity > 0),
  constraint meal_plan_items_price_sane check (unit_price_cents >= 0),
  constraint meal_plan_items_tier check (tier in ('core', 'pantry', 'optional')),
  unique (order_id, item_id)
);

alter table meal_plan_items enable row level security;

create index meal_plan_items_by_plan on meal_plan_items (plan_id, tier);

-- ------------------------------------------------------------------------- --

-- Build the shopping list for a plan.
--
-- In SQL rather than TypeScript for the reasons this repo already uses
-- functions: it is set work over four joins, and clearing the old lines and
-- writing the new ones must land together or a failed run leaves a half-list
-- that looks complete.
--
-- What it does NOT do is decide quantities. Most recipe->item links carry no
-- amount yet -- they were recovered from a worked month that recorded THAT a
-- dish needed an item, not how much -- so every line lands at one pack with
-- `quantity_is_a_guess` set. Saying "one pack, check me" is honest; inventing
-- 2.4 lb from nothing would look like arithmetic and be a guess wearing a
-- decimal point.
create or replace function generate_meal_plan_list(p_plan uuid)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not exists (select 1 from meal_plans where id = p_plan) then
    raise exception 'no such plan';
  end if;

  if not exists (select 1 from meal_plan_orders where plan_id = p_plan) then
    raise exception 'this plan has no delivery orders yet — add at least one';
  end if;

  -- Only the generator's own rows. A line someone added by hand is theirs.
  delete from meal_plan_items where plan_id = p_plan and generated;

  with day_needs as (
    -- Every (day, item) the menu implies, with the order that supplies it.
    select
      d.on_date,
      r.name as dish,
      ri.item_id,
      -- The last delivery on or before the day. Days before the first
      -- delivery fall back to it: the range can start mid-week, ahead of any
      -- order, and those meals still have to come from somewhere.
      coalesce(
        (select o.id from meal_plan_orders o
          where o.plan_id = p_plan and o.delivers_on <= d.on_date
          order by o.delivers_on desc limit 1),
        (select o.id from meal_plan_orders o
          where o.plan_id = p_plan
          order by o.delivers_on asc limit 1)
      ) as order_id
    from meal_plan_days d
    join meal_recipes r on r.id = d.dinner_recipe_id
    join meal_recipe_items ri on ri.recipe_id = r.id
    where d.plan_id = p_plan
      and not ri.optional

    union all

    select
      d.on_date,
      r.name,
      ri.item_id,
      coalesce(
        (select o.id from meal_plan_orders o
          where o.plan_id = p_plan and o.delivers_on <= d.on_date
          order by o.delivers_on desc limit 1),
        (select o.id from meal_plan_orders o
          where o.plan_id = p_plan
          order by o.delivers_on asc limit 1)
      )
    from meal_plan_days d
    join meal_recipes r on r.id = d.lunch_recipe_id
    join meal_recipe_items ri on ri.recipe_id = r.id
    where d.plan_id = p_plan
      and not ri.optional
  ),
  lines as (
    select
      n.order_id,
      n.item_id,
      -- "Greek sheet-pan 10/01 | Souvlaki 10/07", the way the workbook writes it.
      string_agg(distinct n.dish || ' ' || to_char(n.on_date, 'MM/DD'), ' | '
                 order by n.dish || ' ' || to_char(n.on_date, 'MM/DD')) as used_for,
      -- The longest a pack of this has to last after its delivery.
      max(n.on_date - o.delivers_on) as days_held,
      max(n.on_date) as last_needed
    from day_needs n
    join meal_plan_orders o on o.id = n.order_id
    group by n.order_id, n.item_id
  )
  insert into meal_plan_items
    (plan_id, order_id, item_id, quantity, unit_price_cents, tier, used_for,
     coverage_warning, quantity_is_a_guess, generated)
  select
    p_plan,
    l.order_id,
    l.item_id,
    1,
    coalesce(i.price_cents, 0),
    i.tier,
    l.used_for,
    case
      when i.keeps_days is not null and l.days_held > i.keeps_days
      then i.name || ' keeps about ' || i.keeps_days || ' days but is needed '
           || l.days_held || ' days after delivery ('
           || to_char(l.last_needed, 'Mon FMDD') || ')'
    end,
    true,
    true
  from lines l
  join meal_items i on i.id = l.item_id
  on conflict (order_id, item_id) do nothing;

  select jsonb_build_object(
    'lines', count(*),
    'total_cents', coalesce(sum(case when tier <> 'optional'
                                then round(unit_price_cents * quantity) end), 0),
    'optional_cents', coalesce(sum(case when tier = 'optional'
                                   then round(unit_price_cents * quantity) end), 0),
    'warnings', count(*) filter (where coverage_warning is not null),
    'unpriced', count(*) filter (where unit_price_cents = 0)
  )
  into v_result
  from meal_plan_items
  where plan_id = p_plan;

  return v_result;
end;
$$;

revoke execute on function generate_meal_plan_list(uuid) from public, anon, authenticated;
grant execute on function generate_meal_plan_list(uuid) to service_role;

-- Fill a plan's date range with one row per day, so the calendar exists before
-- anything is assigned to it. Days already present keep whatever is on them.
create or replace function fill_meal_plan_days(p_plan uuid)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_added integer;
begin
  insert into meal_plan_days (plan_id, on_date)
  select p.id, d::date
  from meal_plans p
  cross join generate_series(p.starts_on, p.ends_on, interval '1 day') d
  where p.id = p_plan
  on conflict (plan_id, on_date) do nothing;

  get diagnostics v_added = row_count;
  return v_added;
end;
$$;

revoke execute on function fill_meal_plan_days(uuid) from public, anon, authenticated;
grant execute on function fill_meal_plan_days(uuid) to service_role;
