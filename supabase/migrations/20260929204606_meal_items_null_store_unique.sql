-- Make the price book's unique key actually unique.
--
-- `unique (name, store)` did nothing, because every row has a NULL store and
-- Postgres treats NULLs as DISTINCT in a unique constraint by default -- two
-- rows of ('Panko', NULL) do not conflict. The seed script upserts on that key,
-- so instead of updating it inserted, and seven runs left seven copies of every
-- item: 672 rows where there should be 96.
--
-- It fails in the worst direction, too. Nothing errors, the counts just quietly
-- grow, and a shopping list computed from the table would price the same item
-- several times over.
--
-- `nulls not distinct` (Postgres 15+, this runs 17) is the fix: it makes NULL
-- compare equal to NULL for uniqueness, which is what "one row per item per
-- store" meant all along. The alternative -- making store NOT NULL with an
-- empty-string default -- encodes "no particular store" as a value that reads
-- like a store name, which is worse to query and worse to look at.

-- Collapse what the broken key let through, keeping one row per item.
--
-- Tie-broken on ctid rather than created_at: every row the seed wrote in a
-- single batch shares a created_at to the microsecond, so `a.created_at >
-- b.created_at` left the whole batch in place and the constraint below then
-- refused to build. ctid is unique per row by construction, which is exactly
-- what a "keep one of these" delete needs.
delete from meal_items a
using meal_items b
where a.name is not distinct from b.name
  and a.store is not distinct from b.store
  and a.ctid > b.ctid;

alter table meal_items drop constraint meal_items_unique;

alter table meal_items
  add constraint meal_items_unique unique nulls not distinct (name, store);
