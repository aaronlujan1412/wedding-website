-- Somewhere to write that isn't attached to anything.
--
-- The planner already holds notes in five places -- a day's note, and the
-- `notes` field on a card, a stay, a ride and a flight -- and every one of
-- them needs a thing to hang off first. "Ask the ryokan about tattoos" has no
-- card, and inventing one to hold a sentence is how a board fills with cards
-- nobody meant.
--
-- A notebook is a name and, usually, whose it is. It carries the ownership so
-- the notes inside it don't have to: everything in Savea's notebook is hers
-- without her tagging a single line. There is one host login, so an owner
-- colours a notebook, it does not lock it -- both of them can read both.

create table trip_notebooks (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  name text not null,
  -- Null is a notebook you keep together, drawn in Decided's green.
  owner trip_planner,
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint trip_notebooks_name_not_blank check (length(btrim(name)) > 0)
);

alter table trip_notebooks enable row level security;

create table trip_notes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  notebook_id uuid not null references trip_notebooks (id) on delete cascade,
  -- A note is worth keeping before it is worth naming, so both of these start
  -- empty and the list falls back to the first line of the body.
  title text not null default '',
  body text not null default '',
  -- A note that turns out to be about one day says so, and the itinerary
  -- picks it up. Left null it stays loose, which is the point of the tab.
  on_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table trip_notes enable row level security;

-- Newest first is how the list reads, and a notebook is always the filter.
create index trip_notes_by_notebook on trip_notes (notebook_id, updated_at desc);
create index trip_notebooks_by_trip on trip_notebooks (trip_id, position);

-- Every trip opens with the three you'd make by hand. An empty tab that asks
-- you to create a notebook before you can write anything is a tab you close.
insert into trip_notebooks (trip_id, name, owner, position)
select t.id, n.name, n.owner, n.position
from trips t
cross join (
  values
    ('Savea', 'savea'::trip_planner, 0::double precision),
    ('Aaron', 'aaron'::trip_planner, 1),
    ('Together', null, 2)
) as n (name, owner, position);
