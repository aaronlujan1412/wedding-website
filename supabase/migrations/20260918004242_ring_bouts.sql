-- The Ring: two ideas at a time, one verdict, until the pile is a list.
--
-- The board already lets you drag a card up into Decided one at a time, which
-- works for the card you already agreed on and does nothing for the other
-- hundred. Agreeing is not the hard part -- cutting is, and nobody cuts their
-- own idea alone. So the tab asks one question at a time, with both of them
-- sitting in front of it, and keeps score.
--
-- A bout is an EVENT, not a score. Every rating and every win-loss record on
-- the banzuke is replayed from this table in order, so there is no rating
-- column anywhere to drift out of step with the history that produced it, and
-- undo is a delete. Elo is order-dependent, hence the created_at index: the
-- replay reads these rows in exactly the order they were decided.

-- The ring has two sides, east and west, the way a dohyo does. When the
-- matchmaker can pair one person's idea against the other's -- which it
-- prefers to do, because that is the argument worth having -- east is Savea's
-- side and west is Aaron's, matching the two columns of the banzuke. When it
-- has to pair two of the same person's ideas, the sides are just left and
-- right.
--
-- 'both' is the escape valve: we are doing both of these, stop asking. Without
-- it every bout is a forced loss and the tab turns into an argument.
-- 'neither' is the point of the whole exercise: two ideas gone in one press.
-- 'skip' settles nothing and is still worth storing, so the matchmaker does
-- not hand back the pair you just walked away from.
create type trip_bout_outcome as enum ('east', 'west', 'both', 'neither', 'skip');

create table trip_bouts (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  east_id uuid not null references trip_items (id) on delete cascade,
  west_id uuid not null references trip_items (id) on delete cascade,
  outcome trip_bout_outcome not null,
  created_at timestamptz not null default now(),

  constraint trip_bouts_two_sides check (east_id <> west_id)
);

alter table trip_bouts enable row level security;

-- The replay reads every bout of one trip, oldest first. Nothing else queries
-- this table.
create index trip_bouts_by_trip on trip_bouts (trip_id, created_at, id);

-- Cut from the basho: the ring asked, and the answer was neither of them.
--
-- The bout above is the record of what happened; this is the state it left
-- behind, the same way `lane` is where a card sits now and `added_by` is who
-- thought of it. Deriving "is it cut" from the bouts instead would make
-- bringing back ONE of the two cards a history edit -- you would have to
-- delete the bout, which brings its opponent back with it.
--
-- Nothing outside the Ring reads this. A cut card stays in its pile on the
-- board, keeps its notes and its bookings, and comes back with one press.
alter table trip_items add column cut_at timestamptz;
