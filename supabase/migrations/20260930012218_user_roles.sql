-- What an account can reach.
--
-- Until now there was one account and every signed-in request saw everything.
-- A second person changes that, and the thing behind the gate is not uniform:
-- the meal planner is a household tool, and the vault is 2,231 Personal/ notes
-- with family, custody and health among them.
--
-- The homelab has always drawn this line at its edge -- the work RAG instance
-- mounts only Reference/ and Work/, and classify_vault.py audits every note
-- bound for Reference/ against exactly those terms. This is the same line drawn
-- one layer in, now that there is more than one person inside.
--
--   owner  everything: the vault, the inbox, the meals
--   meals  the meal planner only
--
-- Defaulting to `owner` on purpose: the only existing row is the one that has
-- been reading everything, and a migration that quietly demoted it would lock
-- somebody out of their own site.
alter table users
  add column role text not null default 'owner';

alter table users
  add constraint users_role check (role in ('owner', 'meals'));

comment on column users.role is
  'owner = full access; meals = the meal planner only. Enforced in the query layer (lib/site-user.ts), not by RLS — every table here is RLS-on-with-no-policies and reached solely by the secret key.';
