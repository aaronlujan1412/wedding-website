-- Pin the fingerprint's sort to byte order.
--
-- The fingerprint only works if both sides build the same string from the same
-- rows, and the two were sorting differently. Postgres ordered by the database
-- collation, which files '_inbox/...' FIRST; Python's sorted() orders by code
-- point, which files it LAST, because '_' (0x5F) comes after the uppercase
-- letters. Same rows, same hashes, different order, different md5 -- so the
-- cheap check never matched and every tick fell through to the full manifest
-- exchange it exists to avoid.
--
-- `collate "C"` is byte order, which is what every language's default string
-- sort agrees on. Anything comparing a hash across two runtimes has to say so
-- explicitly; a database collation is a locale setting, not a sort order.
create or replace function brain_fingerprint()
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(
    md5(string_agg(path || ':' || content_hash, E'\n' order by path collate "C")),
    'empty'
  )
  from brain_notes
$$;
