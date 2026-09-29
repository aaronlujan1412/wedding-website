-- One value that changes whenever the mirror and the vault disagree.
--
-- The box checks in on a timer. Without this, every check means shipping a
-- manifest of 3,430 paths and hashes -- about 300KB -- to be told "nothing has
-- changed", which at a one-minute cadence is a couple of hundred megabytes a
-- day of upload for an answer that is almost always no.
--
-- So the box sends this one hash instead. Matching means stop; differing means
-- fall through to the full manifest. The expensive exchange then happens only
-- when there is actually something to do.
--
-- md5 rather than sha256 because it is built into Postgres with no extension,
-- and this is a change-detector rather than a security boundary: the worst a
-- collision could do is delay a sync until the next tick.
create or replace function brain_fingerprint()
returns text
language sql
stable
set search_path = public
as $$
  -- Sorted by path so both sides build the same string from the same rows, and
  -- coalesced so an empty mirror has a stable fingerprint of its own rather
  -- than null (which would compare unequal to itself and resync forever).
  select coalesce(
    md5(string_agg(path || ':' || content_hash, E'\n' order by path)),
    'empty'
  )
  from brain_notes
$$;

revoke execute on function brain_fingerprint() from public, anon, authenticated;
grant execute on function brain_fingerprint() to service_role;
