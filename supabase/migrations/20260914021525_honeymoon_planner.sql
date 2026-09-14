-- Honeymoon planner: a private, two-person board for the Japan trip.
--
-- Shape notes:
--   * `trip_items.on_date` is the day the card sits on. NULL means it is still
--     in the idea pool — that is the whole "backlog" concept, no extra table.
--   * `position` is a float, not an int, so a drag between two neighbours is a
--     single UPDATE (2.0 and 3.0 -> 2.5) instead of renumbering the column.
--   * `start_time` NULL means a loose card: it belongs to the day but not to an
--     hour, and the rail floats it in the gaps between timed cards.
--   * `trip_days` rows are created lazily and only carry a note, so the set of
--     days comes from the legs' date ranges, not from rows existing.
--
-- RLS is enabled with no policies, exactly as in the guest tables — everything
-- here is read through the secret key server-side. Do not add an anon policy.

create type trip_item_kind as enum (
  'sight', 'food', 'workshop', 'transit', 'lodging', 'shop', 'rest'
);

create type trip_booking_status as enum (
  'idea', 'to_book', 'booked', 'in_hand'
);

create type trip_planner as enum ('aaron', 'savea');

create type trip_doc_category as enum (
  'flight', 'rail', 'lodging', 'connectivity', 'luggage', 'money', 'other'
);

create table trip_legs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ja text,
  starts_on date not null,
  ends_on date not null,
  position int not null default 0,
  lodging_name text,
  lodging_address text,
  lodging_url text,
  lodging_confirmation text,
  lodging_check_in text,
  lodging_check_out text,
  note text,
  created_at timestamptz not null default now(),
  constraint trip_legs_dates_ordered check (ends_on >= starts_on)
);

create table trip_days (
  on_date date primary key,
  title text,
  note text,
  created_at timestamptz not null default now()
);

create table trip_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  title_ja text,
  kind trip_item_kind not null default 'sight',
  on_date date,
  position double precision not null default 0,
  start_time time,
  duration_min int,
  pinned boolean not null default false,
  booking_status trip_booking_status not null default 'idea',
  booking_url text,
  booking_opens_on date,
  booking_ref text,
  -- ISO-ish weekday numbers the place is shut: 0 = Sunday .. 6 = Saturday.
  closed_days smallint[] not null default '{}',
  cost_yen int,
  city text,
  address text,
  map_url text,
  url text,
  notes text,
  added_by trip_planner not null default 'aaron',
  must_do boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_items_title_not_blank check (length(btrim(title)) > 0),
  constraint trip_items_duration_positive check (duration_min is null or duration_min > 0),
  constraint trip_items_cost_not_negative check (cost_yen is null or cost_yen >= 0)
);

create index trip_items_day_order_idx on trip_items (on_date, position);
create index trip_items_booking_opens_idx on trip_items (booking_opens_on)
  where booking_opens_on is not null;

create table trip_docs (
  id uuid primary key default gen_random_uuid(),
  category trip_doc_category not null default 'other',
  title text not null,
  detail text,
  confirmation text,
  url text,
  starts_at timestamptz,
  ends_at timestamptz,
  cost_yen int,
  position int not null default 0,
  created_at timestamptz not null default now(),
  constraint trip_docs_title_not_blank check (length(btrim(title)) > 0),
  constraint trip_docs_cost_not_negative check (cost_yen is null or cost_yen >= 0)
);

alter table trip_legs enable row level security;
alter table trip_days enable row level security;
alter table trip_items enable row level security;
alter table trip_docs enable row level security;
