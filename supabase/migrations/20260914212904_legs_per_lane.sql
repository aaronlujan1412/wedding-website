-- Each lane drafts its own route.
--
-- Legs were trip-wide, so there was nowhere for Savea to propose an extra day in
-- Tokyo while Aaron proposed three nights in Akihabara. Legs now belong to a
-- lane the same way cards do, and `decided` holds the agreed route. Existing
-- legs become decided, which is what they already meant.

create extension if not exists btree_gist with schema extensions;

alter table trip_legs
  add column lane trip_lane not null default 'decided';

-- You can't be in two cities on one night of your own plan. Enforced by the
-- database rather than the app, so every path in — the dialog, an adopt, a
-- script — gets the same rule. Different lanes overlapping is the whole point.
alter table trip_legs
  add constraint trip_legs_no_overlap_in_lane
  exclude using gist (lane with =, daterange(starts_on, ends_on, '[]') with &&);

-- The board's columns are every date any lane's legs cover. A card on a date no
-- leg covers any more would still exist but never render, so every operation
-- that can shrink that set ends by sending stranded cards back to their pile.
create or replace function sweep_orphaned_trip_items()
returns integer
language sql
set search_path = public
as $$
  with swept as (
    update trip_items i
       set on_date = null, updated_at = now()
     where i.on_date is not null
       and not exists (
         select 1 from trip_legs l
          where i.on_date between l.starts_on and l.ends_on
       )
    returning 1
  )
  select count(*)::int from swept;
$$;

-- Adopt one draft leg into `decided`, trimming whatever `decided` had on those
-- dates. One function so it's a single transaction: supabase-js has no
-- transactions, and a half-finished trim would trip the overlap constraint or
-- leave the agreed route with a hole in it.
--
-- The draft leg is copied, not moved, so the proposer's route stays intact.
create or replace function adopt_trip_leg(p_leg uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  src trip_legs;
  d trip_legs;
  new_id uuid;
begin
  select * into src from trip_legs where id = p_leg;
  if not found then
    raise exception 'That leg no longer exists.';
  end if;
  if src.lane = 'decided' then
    raise exception 'That leg is already decided.';
  end if;

  -- Swallowed whole.
  delete from trip_legs
   where lane = 'decided'
     and starts_on >= src.starts_on
     and ends_on <= src.ends_on;

  -- Straddles both ends: keep a head and a tail. Shorten first, then insert the
  -- tail, so the two never overlap even for a moment.
  for d in
    select * from trip_legs
     where lane = 'decided'
       and starts_on < src.starts_on
       and ends_on > src.ends_on
  loop
    update trip_legs set ends_on = src.starts_on - 1 where id = d.id;
    insert into trip_legs (
      lane, name, name_ja, starts_on, ends_on, position,
      lodging_name, lodging_address, lodging_url, lodging_confirmation,
      lodging_check_in, lodging_check_out, note
    ) values (
      'decided', d.name, d.name_ja, src.ends_on + 1, d.ends_on, d.position,
      d.lodging_name, d.lodging_address, d.lodging_url, d.lodging_confirmation,
      d.lodging_check_in, d.lodging_check_out, d.note
    );
  end loop;

  -- Overlaps the start: cut its end back.
  update trip_legs
     set ends_on = src.starts_on - 1
   where lane = 'decided'
     and starts_on < src.starts_on
     and ends_on >= src.starts_on;

  -- Overlaps the end: push its start forward.
  update trip_legs
     set starts_on = src.ends_on + 1
   where lane = 'decided'
     and starts_on <= src.ends_on
     and ends_on > src.ends_on;

  insert into trip_legs (
    lane, name, name_ja, starts_on, ends_on, position,
    lodging_name, lodging_address, lodging_url, lodging_confirmation,
    lodging_check_in, lodging_check_out, note
  ) values (
    'decided', src.name, src.name_ja, src.starts_on, src.ends_on, src.position,
    src.lodging_name, src.lodging_address, src.lodging_url, src.lodging_confirmation,
    src.lodging_check_in, src.lodging_check_out, src.note
  )
  returning id into new_id;

  perform sweep_orphaned_trip_items();
  return new_id;
end;
$$;

-- "Let's just do your route." Replaces every decided leg with copies of one
-- lane's legs. Cards are untouched apart from the orphan sweep.
create or replace function adopt_trip_route(p_lane trip_lane)
returns integer
language plpgsql
set search_path = public
as $$
declare
  copied integer;
begin
  if p_lane = 'decided' then
    raise exception 'Decided is already the decided route.';
  end if;
  if not exists (select 1 from trip_legs where lane = p_lane) then
    raise exception 'That lane has no legs to adopt.';
  end if;

  delete from trip_legs where lane = 'decided';

  insert into trip_legs (
    lane, name, name_ja, starts_on, ends_on, position,
    lodging_name, lodging_address, lodging_url, lodging_confirmation,
    lodging_check_in, lodging_check_out, note
  )
  select
    'decided', name, name_ja, starts_on, ends_on, position,
    lodging_name, lodging_address, lodging_url, lodging_confirmation,
    lodging_check_in, lodging_check_out, note
  from trip_legs
  where lane = p_lane;

  get diagnostics copied = row_count;
  perform sweep_orphaned_trip_items();
  return copied;
end;
$$;

-- Supabase grants EXECUTE on new public functions to anon and authenticated by
-- default, which would put these on the public REST API. They're invoker-rights
-- and RLS would still stop them, but nothing outside the server needs to see
-- them at all, so take the grant away.
revoke execute on function sweep_orphaned_trip_items() from public, anon, authenticated;
revoke execute on function adopt_trip_leg(uuid) from public, anon, authenticated;
revoke execute on function adopt_trip_route(trip_lane) from public, anon, authenticated;
grant execute on function sweep_orphaned_trip_items() to service_role;
grant execute on function adopt_trip_leg(uuid) to service_role;
grant execute on function adopt_trip_route(trip_lane) to service_role;
