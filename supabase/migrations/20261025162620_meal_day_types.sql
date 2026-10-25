-- What each kind of day means, written down.
--
-- A kind of day (meal_plan_days.tags) has only ever been a word on a calendar
-- cell: "daniel", "prep", "party". What the word asks of whoever is cooking --
-- five servings, nothing spicy, cook the lunches too -- lived in somebody's
-- head, or in the one free-text note on the standing setup.
--
-- Keyed by the word itself rather than an id, because the days carry the word
-- (text[], see 20260930212602_day_types.sql) and there is nothing to join on
-- otherwise. That also means a row can exist before any day has the kind, which
-- is the point: you can say what "party" means before the first party.
--
-- Description only. Nothing reads these mechanically -- the scheduler and the
-- list builder treat a daniel day like any other -- so this is for the people
-- cooking and for whoever builds the month, not a rule.

create table meal_day_types (
  name text primary key,
  description text,
  updated_at timestamptz not null default now(),

  -- Stored the way the days store it (`dayType()` in lib/meal-types.ts):
  -- lower case, no blanks, short enough for a calendar cell.
  constraint meal_day_types_name_shape check (meal_tags_sane(array[name]) and name = lower(name))
);

-- Same posture as every meal table: RLS on, no policies, reached only through
-- the server's secret key.
alter table meal_day_types enable row level security;

comment on table meal_day_types is
  'What a kind of day (meal_plan_days.tags) means, keyed by the word. Descriptive only; nothing schedules or buys from it.';
