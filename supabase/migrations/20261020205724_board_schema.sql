-- The board: a shared work queue for Aaron and Claude, at /me/board.
-- Design and reasoning in docs/board-design.md.
--
-- RLS is enabled on every table here with NO policies, the same posture as
-- guests/guest_groups. That denies anon and authenticated entirely and is
-- deliberate: lib/supabase.ts holds SUPABASE_SECRET_KEY, bypasses RLS, and is
-- `import "server-only"`. If a board query ever starts returning an empty array
-- with a null error, the secret key is missing from the environment -- do NOT
-- "fix" that by adding an anon policy.

create table board_projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  -- "NO TOUCHY". Set, and the agent API refuses every write to this project
  -- and its cards. The UI is unaffected: this is a lock against Claude.
  locked_at timestamptz,
  -- Joins brain_notes.tags, so a card carries the vault's context with it.
  brain_tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Columns are per-project and user-defined, so the system cannot assume that
-- the last one means "finished".
create table board_columns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references board_projects (id) on delete cascade,
  key text not null,
  name text not null,
  position integer not null,
  -- Whether the agent may move a card INTO this column unprompted. False on
  -- the terminal ones. A column named "Shipped" means finished and nothing in
  -- the schema could have guessed that, so the column says so. When false, a
  -- move is refused and Claude sets board_cards.review_kind instead.
  agent_can_enter boolean not null default true,
  created_at timestamptz not null default now(),
  unique (project_id, key)
);

create table board_cards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references board_projects (id) on delete cascade,
  -- restrict, not cascade: deleting a column should fail while cards are in
  -- it rather than silently taking the work with it.
  column_id uuid not null references board_columns (id) on delete restrict,
  title text not null,
  body text,
  -- Where this card actually stands, in a paragraph. Claude keeps it current.
  -- This is what archiving compresses, so it is not bookkeeping.
  summary text,
  -- Float so a drag is one UPDATE. See positionBetween() in
  -- components/honeymoon/trip.ts -- same fractional indexing as trip_items.
  position double precision not null default 0,
  labels text[] not null default '{}',
  locked_at timestamptz,
  -- The review flag IS the proposal; there is no separate proposals table.
  -- Claude sets it instead of doing the thing, and it lives on the card rather
  -- than in a queue beside it.
  review_kind text check (review_kind in ('complete', 'delete', 'decision')),
  review_note text,
  review_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A flag with no reason on it is one nobody can act on.
  constraint board_cards_review_needs_note
    check (review_kind is null or review_note is not null)
);

create table board_thread (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references board_projects (id) on delete cascade,
  -- Null means the item is about the project rather than any one card.
  card_id uuid references board_cards (id) on delete cascade,
  author text not null check (author in ('claude', 'aaron')),
  kind text not null check (kind in ('question', 'answer', 'note', 'finding')),
  body text not null,
  -- [{id, label, detail}] for a multiple-choice question. A question with
  -- options is answerable at a red light; an open text box sits for a week.
  options jsonb,
  answer_option_id text,
  parent_id uuid references board_thread (id) on delete set null,
  status text not null default 'open'
    check (status in ('open', 'answered', 'dropped')),
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

-- Where Claude has read up to. Exactly one row, enforced by the primary key.
--
-- Held server-side on purpose. A session that has been compacted has forgotten
-- its cursor; the server has not. Without this, "what changed since last time"
-- is unanswerable on any cold start, which is the problem the board exists to
-- solve.
create table board_cursor (
  id boolean primary key default true check (id),
  last_read_at timestamptz not null default now()
);
insert into board_cursor (id) values (true);

create index board_cards_lane_idx
  on board_cards (project_id, column_id, position);
create index board_cards_review_idx
  on board_cards (project_id) where review_kind is not null;
create index board_thread_card_idx
  on board_thread (card_id, created_at);
create index board_thread_open_idx
  on board_thread (project_id) where status = 'open';

-- Creating a project is several writes that must land together: the project,
-- and the columns without which it cannot hold a card. supabase-js has no
-- transactions, so this is a function for the same reason adopt_trip_leg is.
--
-- The seeded set is a starting point, not a fixture. Rename, reorder, add and
-- delete them per project; only agent_can_enter carries meaning to the API.
create function board_create_project(
  p_slug text,
  p_name text,
  p_description text default null
) returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into board_projects (slug, name, description)
  values (p_slug, p_name, p_description)
  returning id into v_id;

  insert into board_columns (project_id, key, name, position, agent_can_enter)
  values
    (v_id, 'backlog', 'Backlog',     0, true),
    (v_id, 'next',    'Next up',     1, true),
    (v_id, 'doing',   'In progress', 2, true),
    (v_id, 'done',    'Done',        3, false);

  return v_id;
end;
$$;

-- Supabase grants EXECUTE on new public functions by default.
revoke execute on function board_create_project(text, text, text)
  from public, anon, authenticated;

alter table board_projects enable row level security;
alter table board_columns enable row level security;
alter table board_cards enable row level security;
alter table board_thread enable row level security;
alter table board_cursor enable row level security;
