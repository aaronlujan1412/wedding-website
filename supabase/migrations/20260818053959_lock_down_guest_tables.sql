-- Guest data was fully readable and writable by the publishable browser key:
-- names, phone numbers and home addresses could be selected, and an UPDATE
-- against guests was accepted. These tables had never had RLS enabled.
--
-- No policies are created on purpose. Everything that touches these tables
-- runs server-side through the secret key, which bypasses RLS, so anon and
-- authenticated need no access at all. RLS with zero policies denies both.
--
-- Do NOT "fix" a later empty result by adding an anon policy here — an empty
-- result from the browser key is the intended behaviour. If the app starts
-- reading empty, SUPABASE_SECRET_KEY is missing from the environment.

alter table guests enable row level security;
alter table guest_groups enable row level security;
alter table seating_tables enable row level security;
