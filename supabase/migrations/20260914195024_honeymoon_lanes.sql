-- Three lanes instead of one.
--
-- The board was a single row of day columns. It becomes a grid: the same day
-- columns, crossed with a "decided" lane on top and one draft lane each. You
-- both throw suggestions into your own row, and dragging a card up into
-- `decided` is what agreeing looks like. Only `decided` feeds the itinerary and
-- the pocket print.
--
-- `lane` is deliberately not the same thing as `added_by`. Authorship is
-- history and never changes; the lane is where the card currently sits. A card
-- Savea suggested keeps her initial after it is promoted.

create type trip_lane as enum ('decided', 'savea', 'aaron');

alter table trip_items
  add column lane trip_lane not null default 'decided';

-- Ordering is now scoped to a cell (lane + day), not just a day.
drop index if exists trip_items_day_order_idx;
create index trip_items_lane_day_order_idx on trip_items (lane, on_date, position);
