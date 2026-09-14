-- A private bucket for nightly logical backups.
--
-- This project has no PITR and no stored snapshots, so a bad `delete` is
-- final. `/api/backup` dumps every table holding typed-in data here once a
-- night and prunes anything older than a fortnight. Private, obviously: these
-- files are the guest list, phone numbers and home addresses in one JSON.
--
-- The insert below is kept for the record but is NOT what provisions the
-- bucket. On the storage version this project runs, a row written straight
-- into storage.buckets does not become visible to the storage API — the older
-- guest-photos migration predates that. `npm run db:buckets` creates them
-- through the API instead, and is idempotent, so run it against any new
-- environment (including a fresh local stack) before expecting uploads to work.
insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;
