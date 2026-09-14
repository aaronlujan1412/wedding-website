-- Reconstructed 2026-09-14 from a dump of the live schema.
--
-- This file was committed empty. `supabase db push` recorded this version after
-- an interrupted first attempt without executing it, and the statements were
-- then applied to production by hand (see commit 18dcdce). Production has
-- always had these objects; only a database rebuilt from migrations — the
-- local stack, or a restore — was missing them. Written idempotently so it is
-- safe anywhere it runs.

-- Backs the throttle on the last-four-of-phone check (lib/rate-limit.ts). Only
-- failures are recorded, and the caller is an HMAC of their IP, not the IP.
create table if not exists verification_attempts (
  fingerprint text not null,
  created_at timestamptz not null default now()
);

create index if not exists verification_attempts_recent_idx
  on verification_attempts (fingerprint, created_at desc);

alter table verification_attempts enable row level security;

-- Hosts post photos too, and they aren't a household.
alter table guest_photos alter column group_id drop not null;

-- The untouched file behind each web-sized copy, in the private originals
-- bucket. Null is normal: that upload is best-effort.
alter table guest_photos add column if not exists original_path text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'guest_photos_original_path_key'
  ) then
    alter table guest_photos
      add constraint guest_photos_original_path_key unique (original_path);
  end if;
end $$;
