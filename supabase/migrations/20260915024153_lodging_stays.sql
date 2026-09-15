-- Where you sleep becomes its own thing.
--
-- Lodging was six columns on trip_legs, which meant one bed per leg: three
-- nights in Shinjuku then a ryokan meant splitting the route to fit the hotels.
-- A stay has its own check-in and check-out dates, so any number of them can
-- sit inside a leg, and it has room for what actually matters at a Japanese
-- front desk.
--
-- Stays belong to a lane like legs and cards do. Suggestions in a planner's
-- lane may overlap — "Kyoto ryokan or Osaka hotel for these three nights" is
-- two stays on the same nights — but Decided can only sleep in one place.

create type trip_stay_payment as enum ('prepaid', 'at_desk');

create table trip_stays (
  id uuid primary key default gen_random_uuid(),
  lane trip_lane not null default 'decided',
  added_by trip_planner not null default 'aaron',

  name text not null,
  name_ja text,
  city text,

  -- Nights are [check_in_on, check_out_on): check out on the 29th and the last
  -- night was the 28th. The next stay can check in the same day.
  check_in_on date not null,
  check_out_on date not null,
  check_in_time time,
  check_out_time time,

  booking_status trip_booking_status not null default 'idea',
  payment trip_stay_payment,
  -- Free cancellation runs out at the end of this day.
  cancel_by date,
  confirmation text,
  url text,

  -- What you hand a taxi driver: the address in Japanese and the phone number.
  address text,
  address_ja text,
  phone text,
  map_url text,
  getting_there text,

  -- Ryokan details. Dinner is served at a set time and they will wait for you.
  breakfast_time time,
  dinner_time time,
  onsen_hours text,
  tattoos_ok boolean,

  -- Bags sent ahead to the next stay (takkyubin). They arrive the next day.
  forward_bags boolean not null default false,

  -- The whole stay, as entered. Same convention as trip_items.
  cost_amount integer check (cost_amount >= 0),
  cost_currency trip_currency not null default 'JPY',
  -- Yen paid in cash at the desk on top of the booking: lodging tax, onsen tax.
  desk_cash_yen integer check (desk_cash_yen >= 0),

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint trip_stays_at_least_one_night check (check_out_on > check_in_on)
);

alter table trip_stays enable row level security;

create index trip_stays_lane_dates on trip_stays (lane, check_in_on);

-- One bed a night in the agreed plan. Suggestions are exempt: overlapping
-- alternatives are the point of them.
alter table trip_stays
  add constraint trip_stays_no_double_booking
  exclude using gist (daterange(check_in_on, check_out_on, '[)') with &&)
  where (lane = 'decided');

-- Carry over whatever lodging the legs already had. A leg's last day is
-- inclusive, so its stay checks out the morning after.
insert into trip_stays (
  lane, added_by, name, city, check_in_on, check_out_on,
  check_in_time, check_out_time, confirmation, url, address, notes
)
select
  l.lane,
  case when l.lane = 'savea' then 'savea'::trip_planner else 'aaron'::trip_planner end,
  l.lodging_name,
  l.name,
  l.starts_on,
  l.ends_on + 1,
  case when l.lodging_check_in ~ '^\d{1,2}:\d{2}$' then l.lodging_check_in::time end,
  case when l.lodging_check_out ~ '^\d{1,2}:\d{2}$' then l.lodging_check_out::time end,
  l.lodging_confirmation,
  l.lodging_url,
  l.lodging_address,
  -- A check-in time that wasn't a clock time ("after 3ish") isn't lost.
  nullif(concat_ws(' · ',
    case when l.lodging_check_in !~ '^\d{1,2}:\d{2}$' then 'Check in ' || l.lodging_check_in end,
    case when l.lodging_check_out !~ '^\d{1,2}:\d{2}$' then 'Check out ' || l.lodging_check_out end
  ), '')
from trip_legs l
where l.lodging_name is not null;

-- Agree to one suggested stay. Copies it into Decided and trims whatever
-- Decided had on those nights, splitting a stay in two if the new one lands in
-- its middle. The same shape as adopt_trip_leg, with half-open night ranges.
--
-- A stay that is swallowed whole hands its checklist to the new one: "forward
-- the bags" still needs doing whichever hotel wins.
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
     where lane = 'decided'
       and check_in_on >= src.check_in_on
       and check_out_on <= src.check_out_on
    returning id
  )
  select array_agg(id) into swallowed from gone;

  -- Straddles both ends: shorten it to end where the new one starts, then put
  -- the remainder back after it.
  for d in
    select * from trip_stays
     where lane = 'decided'
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
   where lane = 'decided'
     and check_in_on < src.check_in_on
     and check_out_on > src.check_in_on;

  update trip_stays
     set check_in_on = src.check_out_on, updated_at = now()
   where lane = 'decided'
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

-- Legs no longer carry lodging, so adopting one stops copying it. The columns
-- themselves go in the next migration, once the code that writes them is gone.
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
   where lane = 'decided'
     and starts_on >= src.starts_on
     and ends_on <= src.ends_on;

  for d in
    select * from trip_legs
     where lane = 'decided'
       and starts_on < src.starts_on
       and ends_on > src.ends_on
  loop
    update trip_legs set ends_on = src.starts_on - 1 where id = d.id;
    insert into trip_legs (lane, name, name_ja, starts_on, ends_on, position, note)
    values ('decided', d.name, d.name_ja, src.ends_on + 1, d.ends_on, d.position, d.note);
  end loop;

  update trip_legs
     set ends_on = src.starts_on - 1
   where lane = 'decided'
     and starts_on < src.starts_on
     and ends_on >= src.starts_on;

  update trip_legs
     set starts_on = src.ends_on + 1
   where lane = 'decided'
     and starts_on <= src.ends_on
     and ends_on > src.ends_on;

  insert into trip_legs (lane, name, name_ja, starts_on, ends_on, position, note)
  values ('decided', src.name, src.name_ja, src.starts_on, src.ends_on, src.position, src.note)
  returning id into new_id;

  perform sweep_orphaned_trip_items();
  return new_id;
end;
$$;

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

  insert into trip_legs (lane, name, name_ja, starts_on, ends_on, position, note)
  select 'decided', name, name_ja, starts_on, ends_on, position, note
  from trip_legs
  where lane = p_lane;

  get diagnostics copied = row_count;
  perform sweep_orphaned_trip_items();
  return copied;
end;
$$;

revoke execute on function adopt_trip_stay(uuid) from public, anon, authenticated;
grant execute on function adopt_trip_stay(uuid) to service_role;
