-- Clear the scheduler's scratch table with TRUNCATE.
--
-- `delete from _used;` has no WHERE clause, and Supabase turns on a safeguard
-- in production that refuses those outright -- SQLSTATE 21000, "DELETE requires
-- a WHERE clause". Local Postgres does not, so the scheduler passed every local
-- test and then returned null the first time it ran against the live database.
-- The same class of trap this repo already documents for PostgREST deletes,
-- one layer down.
--
-- The rest of the function is unchanged; it is restated whole because
-- `create or replace` takes a whole definition.

create or replace function schedule_meal_plan(
  p_plan uuid,
  p_max_repeats integer default 2,
  p_min_gap_days integer default 7
)
returns jsonb
language plpgsql
set search_path = public
as $$
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
               where o.plan_id = p_plan and o.delivers_on <= d.on_date
               order by o.delivers_on desc limit 1),
             (select o.delivers_on from meal_plan_orders o
               where o.plan_id = p_plan order by o.delivers_on asc limit 1)
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
$$;

revoke execute on function schedule_meal_plan(uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function schedule_meal_plan(uuid, integer, integer) to service_role;
