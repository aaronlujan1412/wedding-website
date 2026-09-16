-- Getting between places, inside Japan.
--
-- Sibling of trip_flights, with the differences that matter:
--
-- * No per-row time zones. Every one of these is in Japan, so the zone is a
--   constant in the code (TRANSIT_TZ) exactly as STAY_TZ already is for stays.
--   Instants are still stored, because a night bus leaves on one date and
--   arrives on the next and a date-plus-time pair would have to encode that
--   twice. If a ride ever happens outside Japan this becomes a column.
--
-- * Places are free text, not codes. There is no IATA for stations, "Tokyo"
--   is three different stations depending on the line, and the thing you need
--   on the platform is the name as printed on the ticket.
--
-- * A lane, like legs and stays: "shinkansen or the night bus" is a real
--   argument and it deserves the same drafting row as everything else.
--   Adopting one is a plain update to lane = 'decided' rather than a Postgres
--   function -- a train is a point in time, so there is none of the trimming,
--   splitting and swallowing that makes adopt_trip_leg and adopt_trip_stay
--   need a transaction.
--
-- * The rail pass. A covered ride is reserved at a ticket window and costs
--   nothing at the time, so it must not land in "cash on you" or the trip
--   total. The pass itself is a trip_docs row in the 'rail' category.

create type trip_transit_mode as enum ('train', 'bus', 'ferry', 'taxi', 'car');

create table trip_transit (
  id uuid primary key default gen_random_uuid(),

  lane trip_lane not null default 'decided',
  added_by trip_planner not null default 'aaron',

  mode trip_transit_mode not null default 'train',
  -- "JR Central", "Odakyu", "Willer Express". Null when it doesn't matter,
  -- which is most taxis.
  operator text,
  -- The named service: "Hikari 507", "Azusa 15". This is what the departure
  -- board shows, so it is what you look for.
  service text,

  from_place text not null,
  from_place_ja text,
  departs_at timestamptz not null,
  departs_platform text,

  to_place text not null,
  to_place_ja text,
  arrives_at timestamptz not null,
  arrives_platform text,

  -- Reserved seating is the thing you forget until the train is full on the
  -- 30th of December. Car and seat are separate because they are printed and
  -- announced separately.
  reserved boolean not null default false,
  car text,
  seat_aaron text,
  seat_savea text,

  covered_by_pass boolean not null default false,
  confirmation text,
  booking_url text,
  notes text,

  -- Yen, unlike flights: a train in Japan is bought in Japan.
  cost_amount int,
  cost_currency trip_currency not null default 'JPY',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint trip_transit_arrives_after_departs check (arrives_at > departs_at),
  constraint trip_transit_from_not_blank check (length(btrim(from_place)) > 0),
  constraint trip_transit_to_not_blank check (length(btrim(to_place)) > 0),
  constraint trip_transit_cost_not_negative
    check (cost_amount is null or cost_amount >= 0)
);

create index trip_transit_departs_idx on trip_transit (lane, departs_at);

-- Deliberately no policies, like every other planner table: RLS on with none
-- denies anon and authenticated outright, and lib/supabase.ts reaches these
-- rows with the secret key from server components only.
alter table trip_transit enable row level security;

/* ------------------------------------------------ blockouts point at one -- */

-- The column shipped with the blockouts migration carrying no foreign key,
-- because this table did not exist yet. It does now.
alter table trip_items
  add constraint trip_items_linked_transit_fkey
  foreign key (linked_transit_id) references trip_transit (id) on delete set null;

create index trip_items_linked_transit_idx
  on trip_items (linked_transit_id) where linked_transit_id is not null;
