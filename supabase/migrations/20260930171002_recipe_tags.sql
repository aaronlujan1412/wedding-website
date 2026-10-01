-- Categories you make up yourself, and somewhere to write the actual method.
--
-- TAGS. The dish library is browsed by `kind` -- dinner, lunch, snack, special
-- -- which is four fixed boxes decided before anyone had cooked from it. The
-- questions actually asked of it cut across those: what is high protein, what
-- is quick on a weeknight, what is light. Those are not a fifth and sixth
-- column, they are whatever the household decides matters this month.
--
-- text[] rather than a categories table, matching brain_notes, which already
-- does exactly this. The consequence is the good one: a category exists the
-- moment somebody types it on a dish and stops existing when the last dish
-- drops it, so there is no list to curate and no way to accumulate empty
-- categories nobody remembers creating.
--
-- METHOD. `method` has been a one-line text input since it was added, and it
-- shows -- twenty-five dishes carry things like "Oven 425F" and "Portioning
-- into bags is the entire point". Useful notes, but nothing you can cook from.
-- The column was always text and always took newlines; it is the FORM that
-- constrained it, so nothing changes here except the comment saying so, and the
-- expectation that a method may now be several lines.

alter table meal_recipes
  add column tags text[] not null default '{}';

comment on column meal_recipes.tags is
  'Categories the household made up: high protein, quick, light. A tag exists because a dish has it -- there is no separate list.';

comment on column meal_recipes.method is
  'How to cook it. May be several lines; the cook view renders each as a step. Was a one-line input for a while, which is why older rows hold a single hint like "Oven 425F".';

-- Filtering is "which dishes carry this tag", which is an array containment
-- test, which wants GIN. 35 rows would not need it today; the index is here
-- because the query it serves is the page's whole purpose and a seq scan that
-- works by accident is a thing somebody later has to prove is fine.
create index meal_recipes_tags on meal_recipes using gin (tags);

-- Tags are compared and de-duplicated as written, so "High Protein" and
-- "high protein" would be two chips that look like one bug. Normalising on the
-- way in is the form's job -- the constraint below only stops the shapes that
-- would break the chip rail outright, not every near-miss.
--
-- A function because a CHECK may not contain a subquery, and unnest() is one.
-- Marked immutable, which it genuinely is: text in, boolean out, no session
-- state, nothing that depends on a locale or a setting.
create or replace function meal_tags_sane(p_tags text[])
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(
    bool_and(length(btrim(t)) > 0 and length(t) <= 40),
    true  -- an empty array is fine; bool_and over no rows is null
  )
  from unnest(coalesce(p_tags, '{}')) as t
$$;

-- Supabase grants EXECUTE on new public functions to anon and authenticated by
-- default, and meal_recipes is RLS-with-no-policies.
revoke execute on function meal_tags_sane(text[]) from public, anon, authenticated;
grant execute on function meal_tags_sane(text[]) to service_role;

alter table meal_recipes
  add constraint meal_recipes_tags_shape check (meal_tags_sane(tags));
