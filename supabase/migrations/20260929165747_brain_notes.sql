-- The SecondBrain vault, mirrored.
--
-- The vault is ~3,430 markdown files on the homelab box and it STAYS that way.
-- Obsidian edits those files, Nextcloud syncs them to every device, a git repo
-- outside the vault versions them, and four Python tools operate on them as
-- files. This table is a second derived index alongside the RAG service's own,
-- not a new home for the notes -- the same relationship the vault already has
-- with its vector index, where the files are canonical and the index is built
-- from them.
--
-- It exists because the RAG service is bound to the tailnet on purpose, so the
-- website cannot reach it. The box pushes here instead, the same shape as the
-- lodging finder pushing to /api/lodging-proposals.
--
-- WHAT THIS TABLE IS FOR, and what it is not: browsing and keyword search by a
-- person who is looking at their own notes. The reranked hybrid retrieval on
-- the box answers a different question -- an agent asking something mid-answer
-- -- and takes six to eight seconds doing it. That is the wrong interaction for
-- a page you are scrolling.
--
-- EVERY FIELD EXCEPT path, body AND content_hash IS NULLABLE, on purpose. This
-- is a mirror of files a human edits by hand: three notes in the vault today
-- have no frontmatter at all. A mirror that rejects a note because somebody
-- mistyped a colon is a mirror that silently stops mirroring, and the failure
-- would show up as "search can't find that note" weeks later. Reflect what is
-- there; do not validate it.

create extension if not exists pg_trgm with schema extensions;

create table brain_notes (
  id uuid primary key default gen_random_uuid(),

  -- Vault-relative, e.g. 'Reference/why-x-does-y.md'. The natural key: the box
  -- upserts on it, and a note that moves between buckets is correctly a delete
  -- plus an insert rather than an update.
  path text not null unique,

  -- First path segment: 'Reference', 'Personal', 'Work', '_inbox', or '' for a
  -- note sitting at the vault root. Not an enum -- the buckets are directories
  -- someone can add to in Obsidian without asking Postgres first.
  bucket text not null,

  -- Staging directories start with an underscore, and their contents are NOT
  -- part of the brain yet. The RAG service excludes them from its index for the
  -- same reason: raw material would dominate retrieval. Generated rather than
  -- passed in, so the sync cannot get it wrong.
  staged boolean generated always as (starts_with(bucket, '_')) stored,

  -- The H1, which in this vault IS the claim the note makes. Null when a note
  -- has no frontmatter and no heading.
  title text,
  -- Markdown, frontmatter and title line removed.
  body text not null,
  tags text[] not null default '{}',
  -- Frontmatter, as written: 'claude.ai / 2025-09-24 / <conversation>' and one
  -- of asserted | verified | uncertain. Text, not enums, per the note above.
  source text,
  confidence text,

  -- What the box last sent for this path. The sync compares hashes and ships
  -- only the bodies that changed, which is what keeps an inotify-driven push
  -- down to one small request.
  content_hash text not null,
  file_mtime timestamptz,
  synced_at timestamptz not null default now(),

  constraint brain_notes_path_shape check (
    length(path) > 0 and path not like '/%' and path not like '%..%'
  )
);

-- Same posture as every other table here: on, with no policies, so anon and
-- authenticated are denied outright and only the secret key gets in. See
-- 20260818053959_lock_down_guest_tables.sql for the full reasoning. It matters
-- especially here: Personal/ is two thirds of this table.
alter table brain_notes enable row level security;

-- What a search actually matches, weighted so a word in a note's CLAIM beats
-- the same word buried in somebody else's body text. Titles are claims in this
-- vault, so they are the most informative field by a distance.
--
-- Wrapped in a function because a generated column demands an immutable
-- expression and `array_to_string` is only marked STABLE. That marking is about
-- types whose text output depends on a session setting -- a timestamp's format,
-- a float's precision. `tags` is text[], and text to text is deterministic, so
-- declaring this immutable is safe rather than a fib we are getting away with.
--
-- The catch, worth knowing before editing it: rows do NOT recompute when this
-- function changes. Changing the weights means backfilling every row, so treat
-- the body of this function as part of the table's shape.
create or replace function brain_note_search(
  p_title text,
  p_tags text[],
  p_body text
)
returns tsvector
language sql
immutable
set search_path = public
as $$
  select setweight(to_tsvector('english', coalesce(p_title, '')), 'A')
      || setweight(to_tsvector('english', coalesce(array_to_string(p_tags, ' '), '')), 'B')
      || setweight(to_tsvector('english', coalesce(p_body, '')), 'C')
$$;

-- Supabase grants EXECUTE on new public functions by default, and nothing
-- outside the secret key should be able to call this.
revoke execute on function brain_note_search(text, text[], text)
  from public, anon, authenticated;
grant execute on function brain_note_search(text, text[], text) to service_role;

alter table brain_notes add column search tsvector
  generated always as (brain_note_search(title, tags, body)) stored;

create index brain_notes_search on brain_notes using gin (search);

-- Tag filtering is an array containment test, which needs its own GIN.
create index brain_notes_tags on brain_notes using gin (tags);

-- Trigram on the title, for the half of searching that full-text is bad at:
-- a remembered fragment, a misspelling, a rare literal token inside a word.
-- This is the same gap BM25 fills next to the vector index on the box.
create index brain_notes_title_trgm
  on brain_notes using gin (title extensions.gin_trgm_ops);

-- Browsing is always "this bucket, newest first", and the staged flag splits
-- the review queue from the brain proper in every one of those queries.
create index brain_notes_browse
  on brain_notes (staged, bucket, file_mtime desc);
