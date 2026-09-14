-- Reconstructed 2026-09-14 from a dump of the live schema. Committed empty for
-- the same reason as 20260909155143 — see that file.

-- Whether the full-resolution original went straight to the home server rather
-- than the fallback bucket (see commit de0d47f).
alter table guest_photos
  add column if not exists original_at_home boolean not null default false;
