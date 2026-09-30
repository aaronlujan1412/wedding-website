-- The shopping list becomes tabs, and a tab can be one you made up.
--
-- One order is 61 lines. Two orders plus the optional list is a page you scroll
-- past rather than shop from -- and a shopping list is used one-handed, in a
-- shop, which is the worst possible place to be scrolling for the thing you are
-- standing in front of. Each order becomes a tab.
--
-- WHY A TAB IS AN ORDER ROW rather than a new table. A tab is "a list you shop
-- in one go", and that is what meal_plan_orders already is. Lines already point
-- at an order, so tabs cost no change to meal_plan_items, no second grouping
-- path in the query layer, and no way for the two to disagree. A new table
-- would have meant every line carrying either an order or a tab, and every
-- reader remembering to check both.
--
-- So an EXTRAS tab is an order with no delivery date: somewhere to collect the
-- snacks and the nice-to-haves by hand, out of the way of the month's actual
-- deliveries. `generated` already exists on meal_plan_items for exactly this --
-- "a line added by hand survives regeneration" -- so the generator needs no
-- teaching about tabs at all.

alter table meal_plan_orders
  -- An extras tab has no delivery: nothing delivers it, you pick it up.
  alter column delivers_on drop not null,

  add column kind text not null default 'delivery',

  -- What the tab is called. Null on a delivery, which names itself by its
  -- ordinal and date ("Order 1 — Tue, Sep 29") and would only go stale if a
  -- name were stored alongside.
  add column name text;

alter table meal_plan_orders
  add constraint meal_plan_orders_kind check (kind in ('delivery', 'extras')),

  -- The two shapes, stated rather than assumed. A delivery without a date
  -- cannot supply a day, and an extras tab WITH one would be picked up by the
  -- coverage maths below as if a van were bringing it.
  add constraint meal_plan_orders_shape check (
    (kind = 'delivery' and delivers_on is not null)
    or (kind = 'extras' and delivers_on is null and length(btrim(coalesce(name, ''))) > 0)
  );

comment on column meal_plan_orders.kind is
  'delivery = a box that arrives on a date and supplies the days after it. extras = a tab someone made to collect snacks and nice-to-haves by hand.';

-- The index behind "which order supplies this day" only ever wanted deliveries,
-- and now that extras rows share the table it should not be paging past them.
drop index if exists meal_plan_orders_by_date;
create index meal_plan_orders_by_date
  on meal_plan_orders (plan_id, delivers_on)
  where kind = 'delivery';

-- ---------------------------------------------------------------------------
-- The two functions that ask "which order supplies this day"
-- ---------------------------------------------------------------------------
--
-- Both answer it by date, and a NULL date would in practice fall out of a
-- `delivers_on <= on_date` test on its own. Filtering on kind anyway, in as
-- many words, because "it happens to work because of how NULL compares" is a
-- thing that stops being true the first time somebody adds an ORDER BY or a
-- default, and it would fail by quietly costing a day's food to the wrong
-- list -- which reads as a scheduling bug, nowhere near this change.
--
-- Replaced wholesale from their live definitions rather than edited in place;
-- these are the bodies 20260929213117 and 20260929225442 installed, with the
-- kind filter added to every meal_plan_orders lookup and nothing else touched.

CREATE OR REPLACE FUNCTION public.generate_meal_plan_list(p_plan uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
          where o.plan_id = p_plan and o.kind = 'delivery' and o.delivers_on <= d.on_date
          order by o.delivers_on desc limit 1),
        (select o.id from meal_plan_orders o
          where o.plan_id = p_plan and o.kind = 'delivery'
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
          where o.plan_id = p_plan and o.kind = 'delivery' and o.delivers_on <= d.on_date
          order by o.delivers_on desc limit 1),
        (select o.id from meal_plan_orders o
          where o.plan_id = p_plan and o.kind = 'delivery'
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
$function$;

CREATE OR REPLACE FUNCTION public.schedule_meal_plan(p_plan uuid, p_max_repeats integer DEFAULT 2, p_min_gap_days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_slot record;
  v_pick uuid;
  v_days integer;
  v_assigned integer := 0;
  v_unfilled integer := 0;
begin
  if not exists (select 1 from meal_plan_orders where plan_id = p_plan) then
    raise exception 'this plan has no delivery orders yet — add at least one';
  end if;

  -- Counted as we go, so the repeat cap is enforced against this run rather
  -- than against whatever was here before.
  create temp table if not exists _used (
    recipe_id uuid primary key,
    n integer,
    last_on date
  ) on commit drop;
  -- TRUNCATE, not DELETE. Supabase enables a safeguard in production that
  -- refuses an unqualified DELETE (SQLSTATE 21000, "DELETE requires a WHERE
  -- clause"), and a bare `delete from _used` is exactly that. Local Postgres
  -- has no such guard, so this worked on every local run and failed the first
  -- time it was asked to schedule a month on the live database.
  truncate _used;

  -- Weeknights only. Weekends are leftovers, which is a standing rule and not
  -- something to schedule around.
  for v_slot in
    select d.id, d.on_date,
           d.on_date - coalesce(
             (select o.delivers_on from meal_plan_orders o
               where o.plan_id = p_plan and o.kind = 'delivery' and o.delivers_on <= d.on_date
               order by o.delivers_on desc limit 1),
             (select o.delivers_on from meal_plan_orders o
               where o.plan_id = p_plan and o.kind = 'delivery' order by o.delivers_on asc limit 1)
           ) as days_out
    from meal_plan_days d
    where d.plan_id = p_plan
      and extract(isodow from d.on_date) between 1 and 5
    order by d.on_date
  loop
    v_days := greatest(v_slot.days_out, 0);

    select r.id into v_pick
    from meal_recipes r
    left join _used u on u.recipe_id = r.id
    where r.kind = 'dinner'
      and not r.retired
      -- Rule 1: the window has to reach this far.
      and v_days <= case r.window_when
                      when 'day0-2' then 2
                      when 'early' then 7
                      when 'mid' then 12
                      else 3650
                    end
      and coalesce(u.n, 0) < p_max_repeats
      -- Not again this soon.
      and (u.last_on is null or v_slot.on_date - u.last_on >= p_min_gap_days)
    order by
      -- Rule 2: spend the most perishable dish that fits, first.
      case r.window_when
        when 'day0-2' then 1 when 'early' then 2 when 'mid' then 3 else 4
      end,
      coalesce(u.n, 0),
      -- Then whatever has been off the table longest.
      coalesce(u.last_on, '1900-01-01'::date),
      -- Deterministic, so re-running a plan gives the same answer and a diff
      -- between two runs means something changed.
      r.name
    limit 1;

    if v_pick is null then
      v_unfilled := v_unfilled + 1;
      continue;
    end if;

    update meal_plan_days set dinner_recipe_id = v_pick where id = v_slot.id;

    insert into _used (recipe_id, n, last_on) values (v_pick, 1, v_slot.on_date)
    on conflict (recipe_id)
      do update set n = _used.n + 1, last_on = v_slot.on_date;

    v_assigned := v_assigned + 1;
  end loop;

  return jsonb_build_object(
    'assigned', v_assigned,
    'unfilled', v_unfilled,
    'distinct_dishes', (select count(*) from _used)
  );
end;
$function$;

-- Supabase grants EXECUTE on public functions by default; these are re-created
-- above, so the grants are restated rather than assumed to have survived.
revoke execute on function generate_meal_plan_list(uuid) from public, anon, authenticated;
revoke execute on function schedule_meal_plan(uuid, integer, integer) from public, anon, authenticated;
grant execute on function generate_meal_plan_list(uuid) to service_role;
grant execute on function schedule_meal_plan(uuid, integer, integer) to service_role;
