-- Which days need a dinner, said by a person instead of assumed by the scheduler.
--
-- Until now every day of a plan was a dinner slot, and which ones got filled
-- was a rule buried in `schedule_meal_plan`: Monday to Friday, because
-- "weekends are leftovers". That left a null dinner meaning two different
-- things -- "we don't need one" and "nobody has picked one yet" -- and gave a
-- new month no way to start blank. Every cell said "add a dinner", including
-- the Saturday nobody is home.
--
-- A boolean, not a sparse set of day rows. The calendar draws every date in
-- the range and the freshness numbers count across all of them, so the rows
-- have to exist whether or not anybody eats; what changes is whether the
-- scheduler should fill one.

alter table meal_plan_days
  add column needs_dinner boolean not null default false;

-- What the scheduler was already doing, said the new way: every weeknight, plus
-- any weekend that somebody gave a dinner by hand. Days tagged on a weekend
-- with no dinner (October's Saturdays carry 'daniel') stay unneeded and keep
-- their tags, since nobody said they wanted a dinner there.
update meal_plan_days
set needs_dinner = true
where extract(isodow from on_date) between 1 and 5
   or dinner_recipe_id is not null;

-- A dish on a day that doesn't need one is the one combination that makes the
-- calendar and the shopping list disagree: the list buys for every dish it
-- finds, and the calendar would be drawing that day as empty.
--
-- Between this push and the deploy finishing, the old `setDinner` can trip this
-- on a weekend (it doesn't know to set the flag). The error is visible and
-- nothing is lost, which is a better failure than a list buying for a day the
-- calendar says is empty.
alter table meal_plan_days
  add constraint meal_plan_days_dish_needs_dinner
  check (dinner_recipe_id is null or needs_dinner);

comment on column meal_plan_days.needs_dinner is
  'Somebody said this day needs a dinner. The scheduler fills only these; a null dinner_recipe_id on one means "not picked yet", on any other day "not needed".';

-- Put a kind of day on, or take it off, in one statement.
--
-- The calendar is painted a tap at a time, and taps arrive faster than round
-- trips. The action this replaces read the array, changed it in JavaScript and
-- wrote it back, so two taps on the same day in flight together could each
-- write over the other's tag.
--
-- Takes the state wanted rather than toggling, for the same reason `setBought`
-- does: a retried request has to land on the same answer. And a kind of day is
-- something you say about a day you eat on, so putting one on marks the day as
-- needing a dinner.
create or replace function set_meal_day_tag(p_day uuid, p_tag text, p_on boolean)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  update meal_plan_days
  set tags = case
               when not p_on then array_remove(tags, p_tag)
               when p_tag = any (tags) then tags
               else tags || p_tag
             end,
      needs_dinner = needs_dinner or p_on
  where id = p_day;

  return found;
end;
$$;

revoke execute on function set_meal_day_tag(uuid, text, boolean) from public, anon, authenticated;
grant execute on function set_meal_day_tag(uuid, text, boolean) to service_role;

-- The scheduler, filling the days somebody marked instead of every weeknight.
--
-- Unchanged otherwise from 20260930153856_shopping_tabs.sql; restated whole
-- because `create or replace` takes a whole definition.
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

  -- The days somebody said need a dinner. This used to be "weeknights only",
  -- hardcoded here, which no calendar could overrule.
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
      and d.needs_dinner
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

-- Supabase grants EXECUTE on public functions by default; this is re-created
-- above, so the grants are restated rather than assumed to have survived.
revoke execute on function schedule_meal_plan(uuid, integer, integer) from public, anon, authenticated;
grant execute on function schedule_meal_plan(uuid, integer, integer) to service_role;
