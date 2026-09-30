-- Ticking things off while you shop.
--
-- A shopping list is used standing up, one item at a time, and the only state
-- that matters in that moment is whether this one is in the basket yet. Stored
-- per line rather than per item, because the same item on two orders is two
-- separate trips a fortnight apart.
--
-- A timestamp rather than a boolean: "when did we do this order" is worth
-- knowing afterwards and costs the same to store. Null is not-yet.
alter table meal_plan_items add column bought_at timestamptz;

-- The list is read as "what is left", so that is what gets the index.
create index meal_plan_items_outstanding
  on meal_plan_items (plan_id, bought_at);
