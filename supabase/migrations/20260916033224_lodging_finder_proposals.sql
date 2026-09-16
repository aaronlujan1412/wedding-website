-- Whole-trip lodging routes proposed by HotelFinder.
--
-- HotelFinder sweeps Rakuten every night and knows, for every candidate place
-- and every night of the trip, which properties are open and what they cost.
-- What it produces is a route: a sequence of stays, each one property held for
-- a run of nights. That is the same shape as trip_stays, deliberately.
--
-- These are kept in their own tables rather than written straight into
-- trip_stays as suggestions, for two reasons. A route is a set of stays that
-- only makes sense together — adopting "Kyoto Dec 22–29" alone loses the fact
-- that it was the cheap half of a route that put you in Nagano for New Year.
-- And a machine that proposes dozens of options every morning would bury the
-- handful of ideas a person actually had.
--
-- Nothing here is part of the plan. A proposal becomes real only when someone
-- sends it to a planner's lane, which copies it into trip_stays as an ordinary
-- suggestion; from there the lodging tab and adopt_trip_stay work as they
-- always have. Decided is never touched by any of this.

create table trip_route_proposals (
  id uuid primary key default gen_random_uuid(),

  -- Which run of the finder produced this. A publish replaces everything from
  -- the same source, so these are always one consistent set.
  source text not null default 'hotelfinder',
  generated_at timestamptz not null default now(),

  -- Cheapest first, as ranked by whatever produced them.
  position int not null default 0,

  label text,
  nights int not null check (nights > 0),
  moves int not null default 0 check (moves >= 0),

  -- Yen. Beds and travel are kept apart because they're estimated differently
  -- and one of them is much softer than the other.
  lodging_yen bigint not null check (lodging_yen >= 0),
  travel_yen bigint not null default 0 check (travel_yen >= 0),
  travel_km int not null default 0 check (travel_km >= 0),

  -- How the money was arrived at, so the page can say. 'summed-nights' means
  -- each night was priced by its own one-night search and they were added up:
  -- Rakuten prices only the first night of a multi-night stay, so a real quote
  -- will differ. Never present one of these as a bookable price.
  price_basis text not null default 'summed-nights',

  created_at timestamptz not null default now()
);

create table trip_stay_proposals (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references trip_route_proposals(id) on delete cascade,
  position int not null default 0,

  -- Where, in the finder's terms and in a person's.
  place_id text not null,
  place_name text not null,

  -- Rakuten's names are Japanese, so it goes in both: name is what to show,
  -- name_ja is what to hand a taxi driver.
  name text not null,
  name_ja text,

  -- Same half-open convention as trip_stays: you sleep [check_in_on, check_out_on).
  check_in_on date not null,
  check_out_on date not null,

  cost_yen integer check (cost_yen >= 0),
  per_night_yen integer check (per_night_yen >= 0),
  breakfast boolean not null default false,
  dinner boolean not null default false,

  source_property_id text,
  url text,

  constraint trip_stay_proposals_at_least_one_night check (check_out_on > check_in_on)
);

alter table trip_route_proposals enable row level security;
alter table trip_stay_proposals enable row level security;

create index trip_route_proposals_rank on trip_route_proposals (source, position);
create index trip_stay_proposals_route on trip_stay_proposals (route_id, position);

-- Replace one source's proposals with a fresh set, in one transaction.
--
-- supabase-js has no transactions, and a delete followed by a failed insert
-- would leave the tab empty with no way to tell that from "the finder found
-- nothing". Same reasoning as adopt_trip_leg.
--
-- The payload is the finder's own output: an array of routes, each with a
-- stays array. Taking it as jsonb keeps the API route a thin pipe rather than
-- a second place that knows the shape of a route.
create or replace function replace_trip_route_proposals(p_source text, p_routes jsonb)
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

  delete from trip_route_proposals where source = p_source;

  for route in select * from jsonb_array_elements(p_routes)
  loop
    insert into trip_route_proposals (
      source, position, label, nights, moves, lodging_yen, travel_yen, travel_km, price_basis
    ) values (
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

-- Send a proposed stay to a planner's lane. It becomes an ordinary suggestion
-- in trip_stays — an idea, never decided, and never adopted on its behalf.
-- Whoever it belongs to still has to agree to it in the lodging tab.
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
  new_id uuid;
begin
  if p_lane = 'decided' then
    raise exception 'A proposal goes to a planner''s lane, not straight to Decided.';
  end if;

  select * into src from trip_stay_proposals where id = p_stay;
  if not found then
    raise exception 'That proposal no longer exists. The finder may have published a new set.';
  end if;

  insert into trip_stays (
    lane, added_by, name, name_ja, city,
    check_in_on, check_out_on, booking_status, url,
    cost_amount, cost_currency, notes
  ) values (
    p_lane, p_planner, src.name, src.name_ja, src.place_name,
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

-- Send a whole route: every stay in it, in order, to one lane.
create or replace function send_trip_route_proposal(
  p_route uuid,
  p_lane trip_lane,
  p_planner trip_planner
)
returns integer
language plpgsql
set search_path = public
as $$
declare
  stay trip_stay_proposals;
  sent integer := 0;
begin
  if not exists (select 1 from trip_route_proposals where id = p_route) then
    raise exception 'That route no longer exists. The finder may have published a new set.';
  end if;

  for stay in
    select * from trip_stay_proposals where route_id = p_route order by position
  loop
    perform send_trip_stay_proposal(stay.id, p_lane, p_planner);
    sent := sent + 1;
  end loop;

  return sent;
end;
$$;

-- Supabase grants execute on new public functions to anon and authenticated by
-- default; the planner is reached only through the secret key server-side.
revoke execute on function replace_trip_route_proposals(text, jsonb) from public, anon, authenticated;
revoke execute on function send_trip_stay_proposal(uuid, trip_lane, trip_planner) from public, anon, authenticated;
revoke execute on function send_trip_route_proposal(uuid, trip_lane, trip_planner) from public, anon, authenticated;
grant execute on function replace_trip_route_proposals(text, jsonb) to service_role;
grant execute on function send_trip_stay_proposal(uuid, trip_lane, trip_planner) to service_role;
grant execute on function send_trip_route_proposal(uuid, trip_lane, trip_planner) to service_role;
