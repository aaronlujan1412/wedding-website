-- The actual paper: a confirmation PDF held against the thing it confirms.
--
-- `owner` is a key in exactly the shape `trip_checklist_items.list` already
-- uses ('stay:<uuid>', 'flight:<uuid>', …), for the same reason: the table
-- knows nothing about what it is a paper for, so a new tab that wants
-- attachments needs no migration. The file itself lives in the private
-- `trip-papers` bucket — `storage_path` is the only thing that knows where.

create table trip_papers (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  owner text not null,
  storage_path text not null unique,
  -- The name it was uploaded under. What you look for in a folder of them.
  name text not null,
  bytes integer not null,
  uploaded_at timestamptz not null default now(),

  constraint trip_papers_owner_shape check (owner ~ '^[a-z]+:[0-9a-f-]{36}$'),
  constraint trip_papers_name_not_blank check (length(btrim(name)) > 0),
  constraint trip_papers_bytes_positive check (bytes > 0)
);

-- Same posture as every other planner table: on, with no policies, so anon and
-- authenticated are denied outright and only the secret key gets in.
alter table trip_papers enable row level security;

create index trip_papers_owner on trip_papers (trip_id, owner);

-- Deleting a stay has to take its papers with it, but `owner` is a text key
-- rather than a foreign key — that is what lets one table serve every tab — so
-- the cascade is a trigger instead.
--
-- Note this is the opposite of what adopt_trip_stay does with a swallowed
-- stay's checklist. A checklist is generic ("passports for check-in") and is
-- still true of whatever bed replaces it; a confirmation PDF names one hotel
-- and one booking, so it dies with the row it confirms.
create or replace function delete_trip_papers_for()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  delete from trip_papers where owner = tg_argv[0] || ':' || old.id;
  return old;
end;
$$;

create trigger trip_stays_delete_papers
  after delete on trip_stays
  for each row execute function delete_trip_papers_for('stay');

create trigger trip_flights_delete_papers
  after delete on trip_flights
  for each row execute function delete_trip_papers_for('flight');

create trigger trip_transit_delete_papers
  after delete on trip_transit
  for each row execute function delete_trip_papers_for('transit');

create trigger trip_docs_delete_papers
  after delete on trip_docs
  for each row execute function delete_trip_papers_for('doc');

revoke execute on function delete_trip_papers_for() from public, anon, authenticated;
