-- A trip is a thing you make, not something inferred from its legs.
--
-- Until now the planner had no trip. Its dates were derived -- `tripDays()` is
-- the union of every leg's days -- which meant the route defined the holiday
-- rather than sitting inside it. Three things fell out of that:
--
--   * The same legs had to be drawn twice, as filter chips on top and as a
--     band inside each lane, because there was nowhere else for the shape of
--     the trip to live.
--   * A day you had not yet assigned a city to could not exist. The grid could
--     only render days some leg already covered.
--   * Shrinking a leg dropped cards off the board entirely, which is the whole
--     reason sweep_orphaned_trip_items() has to run after every leg edit.
--
-- With real start and end dates on a trip, "in the trip but not yet placed" is
-- an ordinary state instead of an impossible one.

create table trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ja text,
  starts_on date not null,
  ends_on date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint trips_name_not_blank check (length(btrim(name)) > 0),
  -- Inclusive on both ends, matching trip_legs: a one-day trip has
  -- starts_on = ends_on. Stays are the odd one out and say so themselves.
  constraint trips_ends_after_starts check (ends_on >= starts_on)
);

alter table trips enable row level security;

-- The honeymoon, from whatever the route already says. Done before anything
-- gets a trip_id so there is something to point every existing row at.
insert into trips (name, name_ja, starts_on, ends_on)
select
  'Japan',
  '日本',
  coalesce(min(starts_on), current_date),
  coalesce(max(ends_on), current_date + 13)
from trip_legs;

/* ------------------------------------------------- everything gets a trip -- */

-- Added nullable, backfilled to the one trip that exists, then made NOT NULL,
-- so this runs against a database with rows in it. `on delete cascade`: a trip
-- is the outermost thing here, and orphaned legs belonging to a holiday that
-- no longer exists are not worth keeping.

alter table trip_legs add column trip_id uuid references trips (id) on delete cascade;
alter table trip_days add column trip_id uuid references trips (id) on delete cascade;
alter table trip_items add column trip_id uuid references trips (id) on delete cascade;
alter table trip_docs add column trip_id uuid references trips (id) on delete cascade;
alter table trip_flights add column trip_id uuid references trips (id) on delete cascade;
alter table trip_stays add column trip_id uuid references trips (id) on delete cascade;
alter table trip_transit add column trip_id uuid references trips (id) on delete cascade;
alter table trip_checklist_items add column trip_id uuid references trips (id) on delete cascade;
-- Stay proposals hang off a route proposal and cascade with it, so only the
-- route needs to know which trip it was generated for.
alter table trip_route_proposals add column trip_id uuid references trips (id) on delete cascade;

update trip_legs set trip_id = (select id from trips limit 1);
update trip_days set trip_id = (select id from trips limit 1);
update trip_items set trip_id = (select id from trips limit 1);
update trip_docs set trip_id = (select id from trips limit 1);
update trip_flights set trip_id = (select id from trips limit 1);
update trip_stays set trip_id = (select id from trips limit 1);
update trip_transit set trip_id = (select id from trips limit 1);
update trip_checklist_items set trip_id = (select id from trips limit 1);
update trip_route_proposals set trip_id = (select id from trips limit 1);

alter table trip_legs alter column trip_id set not null;
alter table trip_days alter column trip_id set not null;
alter table trip_items alter column trip_id set not null;
alter table trip_docs alter column trip_id set not null;
alter table trip_flights alter column trip_id set not null;
alter table trip_stays alter column trip_id set not null;
alter table trip_transit alter column trip_id set not null;
alter table trip_checklist_items alter column trip_id set not null;
alter table trip_route_proposals alter column trip_id set not null;

create index trip_legs_trip_idx on trip_legs (trip_id, starts_on);
create index trip_items_trip_idx on trip_items (trip_id, position);
create index trip_docs_trip_idx on trip_docs (trip_id, category, position);
create index trip_flights_trip_idx on trip_flights (trip_id, departs_at);
create index trip_stays_trip_idx on trip_stays (trip_id, check_in_on);
create index trip_transit_trip_idx on trip_transit (trip_id, departs_at);
create index trip_checklist_items_trip_idx on trip_checklist_items (trip_id, list, position);
create index trip_route_proposals_trip_idx on trip_route_proposals (trip_id, source, position);

-- A day note was keyed by its date alone, which was fine while there was only
-- ever one trip. Two trips can both have something to say about Dec 25.
alter table trip_days drop constraint trip_days_pkey;
alter table trip_days add primary key (trip_id, on_date);

/* ------------------------------------------------ the functions, scoped -- */

-- Every one of these used to operate on whole tables. Left alone, adopting a
-- route in one trip would delete another trip's agreed legs -- the failure
-- only appears once there is a second trip, which is exactly the kind that
-- gets shipped.

drop function if exists sweep_orphaned_trip_items();
drop function if exists adopt_trip_route(trip_lane);

create or replace function sweep_orphaned_trip_items(p_trip uuid)
returns integer
language sql
set search_path = public
as $$
  with swept as (
    update trip_items i
       set on_date = null, updated_at = now()
     where i.trip_id = p_trip
       and i.on_date is not null
       and not exists (
         select 1 from trip_legs l
          where l.trip_id = p_trip
            and i.on_date between l.starts_on and l.ends_on
       )
    returning 1
  )
  select count(*)::int from swept;
$$;

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

  delete from trip_legs
   where trip_id = src.trip_id
     and lane = 'decided'
     and starts_on >= src.starts_on
     and ends_on <= src.ends_on;

  for d in
    select * from trip_legs
     where trip_id = src.trip_id
       and lane = 'decided'
       and starts_on < src.starts_on
       and ends_on > src.ends_on
  loop
    update trip_legs set ends_on = src.starts_on - 1 where id = d.id;
    insert into trip_legs (trip_id, lane, name, name_ja, starts_on, ends_on, position, note)
    values (src.trip_id, 'decided', d.name, d.name_ja, src.ends_on + 1, d.ends_on, d.position, d.note);
  end loop;

  update trip_legs
     set ends_on = src.starts_on - 1
   where trip_id = src.trip_id
     and lane = 'decided'
     and starts_on < src.starts_on
     and ends_on >= src.starts_on;

  update trip_legs
     set starts_on = src.ends_on + 1
   where trip_id = src.trip_id
     and lane = 'decided'
     and starts_on <= src.ends_on
     and ends_on > src.ends_on;

  insert into trip_legs (trip_id, lane, name, name_ja, starts_on, ends_on, position, note)
  values (src.trip_id, 'decided', src.name, src.name_ja, src.starts_on, src.ends_on, src.position, src.note)
  returning id into new_id;

  perform sweep_orphaned_trip_items(src.trip_id);
  return new_id;
end;
$$;

create or replace function adopt_trip_route(p_lane trip_lane, p_trip uuid)
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
  if not exists (
    select 1 from trip_legs where lane = p_lane and trip_id = p_trip
  ) then
    raise exception 'That lane has no legs to adopt.';
  end if;

  delete from trip_legs where lane = 'decided' and trip_id = p_trip;

  insert into trip_legs (trip_id, lane, name, name_ja, starts_on, ends_on, position, note)
  select p_trip, 'decided', name, name_ja, starts_on, ends_on, position, note
  from trip_legs
  where lane = p_lane and trip_id = p_trip;

  get diagnostics copied = row_count;
  perform sweep_orphaned_trip_items(p_trip);
  return copied;
end;
$$;

create or replace function adopt_trip_stay(p_stay uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  src trip_stays;
  d trip_stays;
  n trip_stays;
  swallowed uuid[];
begin
  select * into src from trip_stays where id = p_stay;
  if not found then
    raise exception 'That stay no longer exists.';
  end if;
  if src.lane = 'decided' then
    raise exception 'That stay is already decided.';
  end if;

  with gone as (
    delete from trip_stays
     where trip_id = src.trip_id
       and lane = 'decided'
       and check_in_on >= src.check_in_on
       and check_out_on <= src.check_out_on
    returning id
  )
  select array_agg(id) into swallowed from gone;

  -- Straddles both ends: shorten it to end where the new one starts, then put
  -- the remainder back after it.
  for d in
    select * from trip_stays
     where trip_id = src.trip_id
       and lane = 'decided'
       and check_in_on < src.check_in_on
       and check_out_on > src.check_out_on
  loop
    update trip_stays set check_out_on = src.check_in_on where id = d.id;
    d.id := gen_random_uuid();
    d.check_in_on := src.check_out_on;
    d.created_at := now();
    d.updated_at := now();
    insert into trip_stays select (d).*;
  end loop;

  update trip_stays
     set check_out_on = src.check_in_on, updated_at = now()
   where trip_id = src.trip_id
     and lane = 'decided'
     and check_in_on < src.check_in_on
     and check_out_on > src.check_in_on;

  update trip_stays
     set check_in_on = src.check_out_on, updated_at = now()
   where trip_id = src.trip_id
     and lane = 'decided'
     and check_in_on < src.check_out_on
     and check_out_on > src.check_out_on;

  n := src;
  n.id := gen_random_uuid();
  n.lane := 'decided';
  n.created_at := now();
  n.updated_at := now();
  insert into trip_stays select (n).*;

  if swallowed is not null then
    update trip_checklist_items
       set list = 'stay:' || n.id
     where list = any (select 'stay:' || s from unnest(swallowed) s);
  end if;

  return n.id;
end;
$$;

-- Supabase grants EXECUTE on new public functions by default, and none of
-- these should be reachable by anon or authenticated: the planner talks to the
-- database with the secret key from server components only.
revoke execute on function sweep_orphaned_trip_items(uuid) from public, anon, authenticated;
revoke execute on function adopt_trip_leg(uuid) from public, anon, authenticated;
revoke execute on function adopt_trip_route(trip_lane, uuid) from public, anon, authenticated;
revoke execute on function adopt_trip_stay(uuid) from public, anon, authenticated;

grant execute on function sweep_orphaned_trip_items(uuid) to service_role;
grant execute on function adopt_trip_leg(uuid) to service_role;
grant execute on function adopt_trip_route(trip_lane, uuid) to service_role;
grant execute on function adopt_trip_stay(uuid) to service_role;

/* ------------------------------------- the finder's functions, scoped too -- */

-- These three land rows in trip_route_proposals and trip_stays, which now
-- require a trip. Two of them can work out which trip they mean on their own:
-- a stay proposal belongs to a route proposal, and a route proposal knows its
-- trip. Only the publish endpoint has to be told, because it is creating the
-- set from scratch.

create or replace function send_trip_stay_proposal(
  p_stay uuid,
  p_lane trip_lane,
  p_planner trip_planner
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  src trip_stay_proposals;
  trip uuid;
  new_id uuid;
begin
  if p_lane = 'decided' then
    raise exception 'A proposal goes to a planner''s lane, not straight to Decided.';
  end if;

  select * into src from trip_stay_proposals where id = p_stay;
  if not found then
    raise exception 'That proposal no longer exists. The finder may have published a new set.';
  end if;

  select r.trip_id into trip
    from trip_route_proposals r
   where r.id = src.route_id;

  insert into trip_stays (
    trip_id, lane, added_by, name, name_ja, city,
    check_in_on, check_out_on, booking_status, url,
    cost_amount, cost_currency, notes
  ) values (
    trip, p_lane, p_planner, src.name, src.name_ja, src.place_name,
    src.check_in_on, src.check_out_on, 'idea', src.url,
    src.cost_yen, 'JPY',
    -- The estimate travels with the stay, so nobody later reads a summed-nights
    -- number as a quote somebody was given.
    concat_ws(' ',
      'From the lodging finder.',
      case when src.breakfast and src.dinner then 'Dinner and breakfast.'
           when src.breakfast then 'Breakfast.'
           when src.dinner then 'Dinner.' end,
      'Price is each night''s cheapest plan added up, not a quote.'
    )
  )
  returning id into new_id;

  return new_id;
end;
$$;

drop function if exists replace_trip_route_proposals(text, jsonb);

create or replace function replace_trip_route_proposals(
  p_source text,
  p_routes jsonb,
  p_trip uuid
)
returns integer
language plpgsql
set search_path = public
as $$
declare
  route jsonb;
  stay jsonb;
  route_id uuid;
  rank int := 0;
  stay_rank int;
begin
  if jsonb_typeof(p_routes) <> 'array' then
    raise exception 'routes must be a JSON array';
  end if;

  -- Scoped to the trip as well as the source: publishing next year's holiday
  -- must not wipe this one's shortlist.
  delete from trip_route_proposals where source = p_source and trip_id = p_trip;

  for route in select * from jsonb_array_elements(p_routes)
  loop
    insert into trip_route_proposals (
      trip_id, source, position, label, nights, moves,
      lodging_yen, travel_yen, travel_km, price_basis
    ) values (
      p_trip,
      p_source,
      rank,
      route->>'label',
      (route->>'nights')::int,
      coalesce((route->>'moves')::int, 0),
      (route->>'lodging_yen')::bigint,
      coalesce((route->>'travel_yen')::bigint, 0),
      coalesce((route->>'travel_km')::int, 0),
      coalesce(route->>'price_basis', 'summed-nights')
    )
    returning id into route_id;

    stay_rank := 0;
    for stay in select * from jsonb_array_elements(route->'stays')
    loop
      insert into trip_stay_proposals (
        route_id, position, place_id, place_name, name, name_ja,
        check_in_on, check_out_on, cost_yen, per_night_yen,
        breakfast, dinner, source_property_id, url
      ) values (
        route_id,
        stay_rank,
        stay->>'place_id',
        stay->>'place_name',
        stay->>'name',
        stay->>'name_ja',
        (stay->>'check_in_on')::date,
        (stay->>'check_out_on')::date,
        (stay->>'cost_yen')::int,
        (stay->>'per_night_yen')::int,
        coalesce((stay->>'breakfast')::boolean, false),
        coalesce((stay->>'dinner')::boolean, false),
        stay->>'source_property_id',
        stay->>'url'
      );
      stay_rank := stay_rank + 1;
    end loop;

    rank := rank + 1;
  end loop;

  return rank;
end;
$$;

revoke execute on function replace_trip_route_proposals(text, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function replace_trip_route_proposals(text, jsonb, uuid) to service_role;
