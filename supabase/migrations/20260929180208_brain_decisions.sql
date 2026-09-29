-- Letting a staged note into the brain, or turning it away.
--
-- The vault's own rule is that a note becomes part of the brain only when a
-- HUMAN moves it -- "the review step is not optional, made mechanical". That
-- rule survives here intact. What changes is where the human is standing: this
-- table is a queue of decisions, and the box is still the thing that moves the
-- file. Pressing a button on a phone and running promote_inbox.sh at a desk are
-- the same act with a different reach.
--
-- It has to be a queue rather than a direct call because the traffic only runs
-- one way. The RAG service is bound to the tailnet, so the website cannot ask
-- the box to do anything; the box asks the website what is waiting, does it,
-- and reports back. Every design that looked like push collapsed into exactly
-- this with more moving parts.
--
-- A decision is never destructive. Approving MOVES a file from _inbox into a
-- bucket; rejecting moves it to _rejected/ rather than deleting it. Nothing in
-- this system removes a note anyone wrote, which matters when the button is on
-- a phone and a thumb is imprecise.

create table brain_decisions (
  id uuid primary key default gen_random_uuid(),

  -- The staged note's vault path, e.g. '_inbox/some-claim.md'. Not a foreign
  -- key to brain_notes: the row there disappears the moment the file moves,
  -- and the log of what was decided should outlive the note's stay in staging.
  path text not null,

  decision text not null,
  -- Where an approved note lands. The reviewer picks, rather than letting
  -- classify_vault.py guess from tags -- it is honest about not being able to
  -- (`hardware` is GPUs and hinges) and leaves a real ambiguous pile. Someone
  -- who has just read the note knows the answer.
  destination text,

  -- What the note said, copied at decision time. The note itself moves out of
  -- _inbox and this row would otherwise be a path pointing at nothing.
  note_title text,

  decided_by uuid references brain_users (id) on delete set null,
  decided_at timestamptz not null default now(),

  -- queued  -> waiting for the box to pick it up
  -- applied -> the file has been moved
  -- failed  -> the box tried and could not; `error` says why
  state text not null default 'queued',
  applied_at timestamptz,
  error text,

  constraint brain_decisions_decision check (decision in ('approve', 'reject')),
  constraint brain_decisions_state check (state in ('queued', 'applied', 'failed')),
  -- An approval has to say where; a rejection has one destination and it is
  -- not a choice.
  constraint brain_decisions_destination check (
    (decision = 'approve' and destination is not null)
    or (decision = 'reject' and destination is null)
  ),
  -- Only where a note can actually go. The box checks this again before it
  -- moves anything -- a path arriving over the network is never trusted twice
  -- -- but refusing it here means a bad value cannot even be queued.
  constraint brain_decisions_destination_known check (
    destination is null or destination in ('Reference', 'Personal', 'Work')
  ),
  constraint brain_decisions_path_shape check (
    path like '\_inbox/%' and path not like '%..%'
  )
);

alter table brain_decisions enable row level security;

-- One open decision per note. Double-clicking approve must not queue the move
-- twice, and a decided note should leave the queue rather than offering itself
-- again. Partial, so the same path can be decided again if a new note is later
-- filed under the same name.
create unique index brain_decisions_one_open
  on brain_decisions (path) where state = 'queued';

-- The box asks for the queued ones, oldest first.
create index brain_decisions_pending
  on brain_decisions (state, decided_at);
