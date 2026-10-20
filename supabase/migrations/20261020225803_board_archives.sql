-- Archiving a project, which is compression rather than a status.
--
-- A board is for work in flight. A finished project should not sit in the
-- switcher forever as a thing to scroll past, and it should not be deleted
-- either -- the reasoning is the part worth keeping, and it is exactly what
-- you want six months later when the same question comes round again.
--
-- So archiving writes ONE document: the project's context plus every card's
-- outcome, grouped by where it ended up. That is kept; the cards, columns and
-- thread are not. Think zipping a folder, not deleting it.
--
-- `brain_path` is where the full write-up lands in the vault. It is nullable
-- and currently always null: the site cannot write to the vault -- the RAG
-- service is bound to the tailnet, brain_notes is a MIRROR that the next
-- reconcile would wipe, and brain_decisions only promotes a note that already
-- exists in _inbox. Filing an archive into the vault needs the homelab box to
-- learn a new decision kind. The column is here so that when it does, there is
-- somewhere to record the answer.

create table board_archives (
  id uuid primary key default gen_random_uuid(),

  -- Not unique and not a foreign key. The project is gone by the time this
  -- row is read, and archiving frees its slug for reuse.
  slug text not null,
  name text not null,

  -- The compressed project, as markdown.
  summary text not null,

  card_count integer not null default 0,
  finished_at timestamptz not null default now(),
  brain_path text,
  created_at timestamptz not null default now()
);

create index board_archives_recent_idx on board_archives (finished_at desc);

alter table board_archives enable row level security;

/*
 * Archive and tear down, in one transaction.
 *
 * The order matters and is the reason this is a function rather than four
 * calls from supabase-js, which has no transactions: board_cards.column_id is
 * `on delete restrict`, so the cards must go before the columns. Relying on
 * the project's cascade to reach both would leave that order to Postgres.
 *
 * The summary is composed by the caller and passed in. Doing it here would
 * mean writing the markdown in plpgsql, and the shape of that document is a
 * presentation decision that belongs with the rest of them.
 */
create function board_archive_project(
  p_project uuid,
  p_summary text
) returns uuid
language plpgsql
as $$
declare
  v_archive uuid;
  v_count integer;
  v_slug text;
  v_name text;
begin
  select slug, name into v_slug, v_name
    from board_projects where id = p_project;

  if v_slug is null then
    raise exception 'no such project';
  end if;

  select count(*) into v_count from board_cards where project_id = p_project;

  insert into board_archives (slug, name, summary, card_count)
  values (v_slug, v_name, p_summary, v_count)
  returning id into v_archive;

  delete from board_thread  where project_id = p_project;
  delete from board_cards   where project_id = p_project;
  delete from board_columns where project_id = p_project;
  delete from board_projects where id = p_project;

  return v_archive;
end;
$$;

-- Supabase grants EXECUTE on new public functions by default.
revoke execute on function board_archive_project(uuid, text)
  from public, anon, authenticated;
