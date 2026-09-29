-- Accounts for the SecondBrain section of /me.
--
-- Every other gate on this site is a shared secret compared against an env var:
-- one host passphrase, one guest last-four check. That is the right shape for a
-- wedding, where the thing behind the gate is a guest list and the people who
-- need in are two.
--
-- This is not that. The vault being mirrored here is the whole SecondBrain,
-- Personal/ included -- family, custody and health notes among them. The
-- homelab's own design already treats that bucket as the one that must never
-- reach a machine someone else controls: the work RAG instance mounts only
-- Reference/ and Work/, and classify_vault.py audits every note bound for
-- Reference/ against exactly those terms. Widening that to hosted Postgres is a
-- deliberate decision, and it comes with a real login rather than a passphrase
-- in an environment variable.
--
-- So: per-user rows, per-user salts, and a password hash that is expensive to
-- attack even if this table is read. See lib/password.ts for the scheme.
--
-- There is no signup and no self-service reset. Users are made from the command
-- line by scripts/brain-user.mjs, because the set of people who should have an
-- account here is "me" and a public signup form is a strictly larger attack
-- surface than a script.

create table brain_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  -- The full encoded string, parameters and salt included -- never a bare
  -- digest. lib/password.ts parses it, so the cost can be raised later without
  -- invalidating hashes written today.
  password_hash text not null,
  -- Bumping this invalidates every session already issued to this user, since
  -- the value is signed into the cookie and checked on read. That is the whole
  -- revocation story: no server-side session table to keep, sweep, or get out
  -- of step with reality.
  token_version integer not null default 1,
  -- Reserved for a second factor. Nullable and unused for now, but the column
  -- costs nothing today and adding it later means a migration against a table
  -- holding live credentials.
  totp_secret text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,

  -- Lowercase, so a username can't be shadowed by one differing only in case.
  constraint brain_users_username_shape
    check (username ~ '^[a-z0-9][a-z0-9._-]{1,30}$'),
  -- A row whose hash never got written would be an account that cannot be
  -- signed into but exists -- fail at write time instead.
  constraint brain_users_hash_not_blank
    check (length(password_hash) > 0)
);

-- Same posture as every other table here: on, with no policies, so anon and
-- authenticated are denied outright and only the secret key gets in. It matters
-- more on this table than on any other in the database -- see
-- 20260818053959_lock_down_guest_tables.sql for the full reasoning.
alter table brain_users enable row level security;

-- Failed sign-ins, counted per caller.
--
-- Mirrors verification_attempts, which throttles the guest last-four check, and
-- carries an HMAC of the IP rather than the IP itself for the same reason: it
-- needs to be something to count against, not a log of who visited.
--
-- The difference is what happens when the throttle itself breaks.
-- lib/rate-limit.ts fails OPEN on purpose, because a broken throttle must not
-- lock a household out of their own RSVP. Here the check fails CLOSED: what is
-- behind this gate is worth more than the inconvenience of a sign-in that says
-- try again in a minute.
create table brain_login_attempts (
  id bigint generated always as identity primary key,
  fingerprint text not null,
  created_at timestamptz not null default now()
);

alter table brain_login_attempts enable row level security;

-- The lookup is always "this caller, inside this window", so the index carries
-- both and the sweep of old rows rides along on the same order.
create index brain_login_attempts_caller
  on brain_login_attempts (fingerprint, created_at);
