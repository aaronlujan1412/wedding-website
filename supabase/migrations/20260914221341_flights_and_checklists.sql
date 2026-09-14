-- Flights get their own table, and checklists get a general one.
--
-- Flights were a "flight" category in trip_docs: a title and a free-text
-- detail. That can't answer "how long is this flight", "what time is it in
-- Tokyo when we land" or "do we have time to make the connection", all of
-- which need real airports, instants and time zones. Nothing in production
-- used that category yet, so there is nothing to carry over.

create type trip_cabin as enum ('economy', 'premium', 'business', 'first');

create table trip_flights (
  id uuid primary key default gen_random_uuid(),
  airline text not null,
  flight_number text not null,

  -- Airports by IATA code. The time zone is stored alongside rather than looked
  -- up at render, so an airport outside the app's built-in list still works.
  from_airport text not null,
  from_city text,
  departs_at timestamptz not null,
  departs_tz text not null,

  to_airport text not null,
  to_city text,
  arrives_at timestamptz not null,
  arrives_tz text not null,

  cabin trip_cabin,
  aircraft text,
  confirmation text,
  -- Seats per person: "who's in 22A" is the question at the gate.
  seat_aaron text,
  seat_savea text,
  departure_terminal text,
  departure_gate text,
  arrival_terminal text,
  baggage text,
  meal text,
  checkin_url text,
  status_url text,
  notes text,

  cost_amount int,
  cost_currency trip_currency not null default 'USD',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint trip_flights_arrives_after_departs check (arrives_at > departs_at),
  constraint trip_flights_from_is_iata check (from_airport ~ '^[A-Z]{3}$'),
  constraint trip_flights_to_is_iata check (to_airport ~ '^[A-Z]{3}$'),
  constraint trip_flights_cost_not_negative check (cost_amount is null or cost_amount >= 0)
);

create index trip_flights_departs_idx on trip_flights (departs_at);

-- One table for every checklist in the planner. `list` names which one:
-- "flight:<id>" for the things to grab before a journey, "packing" later.
-- A journey is computed from its flights rather than stored, so its checklist
-- is the union of the lists on each of its flights — regrouping flights never
-- strands an item.
create table trip_checklist_items (
  id uuid primary key default gen_random_uuid(),
  list text not null,
  label text not null,
  done boolean not null default false,
  -- Who's got it. Null means nobody has claimed it yet.
  owner trip_planner,
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_checklist_items_label_not_blank check (length(btrim(label)) > 0)
);

create index trip_checklist_items_list_idx on trip_checklist_items (list, position);

alter table trip_flights enable row level security;
alter table trip_checklist_items enable row level security;
