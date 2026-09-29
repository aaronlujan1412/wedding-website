-- Pack size is part of an item's identity.
--
-- The price book lists frozen chicken breast twice -- a 6 lb bag at $24.99 and
-- a 10 lb bag at $38.99, with a note that the larger one "can carry both halves
-- of the month". Same name, different pack, different price, and the choice
-- between them is a real budgeting decision rather than a duplicate to collapse.
--
-- Keying on (name, store) silently merged them and left 95 items where the book
-- has 96, quietly deleting the cheaper option. What makes a row unique here is
-- the thing you actually put in the basket: this product, at this store, in this
-- size.
--
-- Still `nulls not distinct`, for the same reason as before: store is NULL on
-- every row today, and NULLs comparing distinct is what let the duplicates in
-- to begin with.

alter table meal_items drop constraint meal_items_unique;

alter table meal_items
  add constraint meal_items_unique unique nulls not distinct (name, store, pack);
