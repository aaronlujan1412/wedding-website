-- Counts over the mirror, done in Postgres.
--
-- These exist because PostgREST caps a select at 1,000 rows by default, and the
-- first version of the hub counted buckets by fetching every row and grouping
-- in JS. With 3,430 notes it confidently reported 1,000 -- not an error, not an
-- empty result, just a wrong number that looked entirely plausible. Aggregates
-- belong on the side of the wire that has all the rows.
--
-- Same reasoning as the planner's Postgres functions: when supabase-js cannot
-- express it, the query goes here rather than being approximated in TypeScript.

-- Notes per bucket, ignoring the staging directories, plus the staged count and
-- the last sync so the hub gets its whole header in one round trip.
create or replace function brain_bucket_counts()
returns table (bucket text, note_count bigint)
language sql
stable
set search_path = public
as $$
  select bucket, count(*)
  from brain_notes
  where not staged
  group by bucket
  order by count(*) desc, bucket
$$;

-- Tag frequency for the browse page's filter list. Unnesting 3,430 arrays and
-- grouping is trivial here and impossible to do correctly through PostgREST.
create or replace function brain_tag_counts(p_limit integer default 40)
returns table (tag text, note_count bigint)
language sql
stable
set search_path = public
as $$
  select t.tag, count(*)
  from brain_notes n, unnest(n.tags) as t(tag)
  where not n.staged
  group by t.tag
  order by count(*) desc, t.tag
  limit greatest(1, least(coalesce(p_limit, 40), 500))
$$;

-- The hub's header numbers: how many notes, how many waiting in staging, and
-- when the box last pushed.
create or replace function brain_totals()
returns table (total bigint, staged bigint, last_synced timestamptz)
language sql
stable
set search_path = public
as $$
  select
    count(*) filter (where not staged),
    count(*) filter (where staged),
    max(synced_at)
  from brain_notes
$$;

-- Supabase grants EXECUTE on new public functions by default, and none of these
-- should be reachable by anon or authenticated: the site talks to the database
-- with the secret key from server components only.
revoke execute on function brain_bucket_counts() from public, anon, authenticated;
revoke execute on function brain_tag_counts(integer) from public, anon, authenticated;
revoke execute on function brain_totals() from public, anon, authenticated;

grant execute on function brain_bucket_counts() to service_role;
grant execute on function brain_tag_counts(integer) to service_role;
grant execute on function brain_totals() to service_role;
