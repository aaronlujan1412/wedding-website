-- What to check out while you're wandering.
--
-- A wander blockout originally had no list at all: it named a city and the
-- ideas "nearby" were looked up live by matching `city` across the pile. That
-- was wrong in practice. Of 107 cards sitting in piles, 11 had a city on them,
-- and those disagreed with each other -- "Tokyo", "Shinjuku" and "Tokyo
-- Shinjuku" are the same afternoon. So the list was almost always empty, with
-- nowhere to add anything, which is not a feature that degrades gracefully:
-- it is an invisible one.
--
-- A card now says which wander block it belongs to. The city match survives as
-- a suggestion inside the picker, where being occasionally wrong is helpful
-- rather than silently empty.
--
-- Self-referencing rather than a join table because a card belongs to at most
-- one afternoon. `on delete set null` so deleting the block returns its cards
-- to the pile instead of taking them with it.

alter table trip_items
  add column wander_id uuid references trip_items (id) on delete set null;

comment on column trip_items.wander_id is
  'The wander blockout this card is attached to. Null means loose in the pile.';

-- Partial: the overwhelming majority of cards are not attached to anything.
create index trip_items_wander_idx
  on trip_items (wander_id) where wander_id is not null;

-- A card cannot be its own list.
alter table trip_items
  add constraint trip_items_wander_not_self check (wander_id is distinct from id);
