-- The login is the site's, not the Second Brain's.
--
-- These tables were named when the only thing behind a password was the vault.
-- /me is becoming the hub for everything on the homelab -- the brain is the
-- first tool on it, not the reason it exists -- so an account here is an
-- account for the site, and the next tool should not have to either invent its
-- own users table or import one named after somebody else's feature.
--
-- What KEEPS the brain_ prefix: brain_notes and brain_decisions. Those really
-- are about the Second Brain, and a second tool will bring its own tables
-- rather than sharing those.
--
-- `users` is unambiguous in this schema despite the wedding sharing it: guests
-- and guest_groups are people the site knows about, and this is the only table
-- of people who sign in. It is also distinct from Supabase's own `auth.users`,
-- which this project deliberately does not use -- the sessions here are HMAC
-- cookies, not Supabase Auth.
--
-- Safe to run against production even though the tables are already there:
-- nothing deployed reads them yet. The code that does is in this same change.

alter table brain_users rename to users;
alter table brain_login_attempts rename to login_attempts;

-- Indexes and constraints carry their old names through a table rename, which
-- leaves `brain_users_username_shape` on a table called `users` -- the kind of
-- fossil that makes someone go looking for a `brain_users` that no longer
-- exists.
alter table users rename constraint brain_users_username_shape to users_username_shape;
alter table users rename constraint brain_users_hash_not_blank to users_hash_not_blank;

alter index brain_login_attempts_caller rename to login_attempts_caller;

-- The foreign key from brain_decisions followed the rename on its own, but its
-- name did not.
alter table brain_decisions
  rename constraint brain_decisions_decided_by_fkey to brain_decisions_decided_by_users_fkey;
