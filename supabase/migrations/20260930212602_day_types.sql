-- What KIND of day it is, decided by the household rather than by this schema.
--
-- The table has carried two booleans since it was written: `kid_here` and
-- `prep_day`. Both are display-only -- no scheduler, generator or query has
-- ever read either -- and both are the same idea wearing a column: a label on
-- a day that changes how you cook it. Two of them was already one too few, and
-- a party night, a takeaway night and a day nobody is home are all the same
-- shape of fact.
--
-- text[], like meal_recipes.tags and brain_notes.tags before it. A day type
-- exists because a day has it and stops existing when the last day drops it,
-- so there is no list to curate and no way to collect types nobody remembers
-- making. Same trade as the dish categories, made for the same reason.
--
-- THE OLD COLUMNS STAY FOR NOW, backfilled into tags. Dropping them is a
-- second migration after this code has deployed, exactly as
-- 20260915024153/24154 did for the leg lodging columns -- the deployed query
-- still names them in its select, and a column that disappears between
-- `db push` and Vercel finishing is a 400 on the month page for as long as the
-- deploy takes.

alter table meal_plan_days
  add column tags text[] not null default '{}';

-- Whatever those two booleans were saying, said the new way. 'daniel' rather
-- than 'kid': the label on the page has always been his name, and a type you
-- read as a name is one nobody has to decode.
update meal_plan_days
set tags = (
  case when kid_here then array['daniel'] else '{}'::text[] end
  || case when prep_day then array['prep'] else '{}'::text[] end
)
where kid_here or prep_day;

comment on column meal_plan_days.tags is
  'What kind of day it is: daniel, party, prep, takeaway. Made up by the household -- a type exists because a day has it. Supersedes kid_here and prep_day, which are backfilled here and dropped in a later migration.';

comment on column meal_plan_days.kid_here is
  'Superseded by tags (''daniel''). Kept only so the currently deployed query can still select it; drop once this has shipped.';

comment on column meal_plan_days.prep_day is
  'Superseded by tags (''prep''). Kept only so the currently deployed query can still select it; drop once this has shipped.';

-- "Which days are party days" is an array containment test, same as the dishes.
create index meal_plan_days_tags on meal_plan_days using gin (tags);

-- The same shape rule the dish categories get, from the same function: no
-- blanks, nothing long enough to break a calendar cell.
alter table meal_plan_days
  add constraint meal_plan_days_tags_shape check (meal_tags_sane(tags));
