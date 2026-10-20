# The board

A shared work queue for Aaron and Claude, at `/me/board`.

Status: **design, not built.** Nothing in here has been written yet.

## What it is

Not a Kanban app. The Kanban is the view; the job is **context handoff**. A cold
session of Claude — a fresh conversation, or one that has been compacted down to
a summary — should be able to pick up a card and act on it without Aaron
re-explaining what it is or what was already tried.

That reframing decides what matters. Drag and drop is the easy part and `@dnd-kit`
is already a dependency. The hard part is that a card written in October still
makes sense in December, and that findings land on the card rather than in a
terminal scrollback that gets compacted away.

The artifact board at `claude.ai/artifact/9ybEUQC6ijLpigbiHmQY1Z` is the
prototype this replaces. Its 31 cards migrate here and it gets deleted. Two
boards means one rots, and it will be the one nobody opened that week.

## Where it lives

`/me/board`, beside `brain`, `meals` and `second-brain`. It is a `/me` tool and
follows that area's rule: the page renders for everybody — signed out it is a
write-up of what the tool is, signed in it is the tool — and the gate is the data
layer, not `proxy.ts`. Every function that reads real rows calls
`currentOwner()` itself. See the comment at the top of `proxy.ts` for why the
tools under `/me` are deliberately absent from its matcher.

The agent API is `/api/board/*`, shaped after `app/api/brain/decisions/route.ts`,
which already solves this exact problem for the homelab box: GET what is waiting
to be carried out, POST what happened when it was.

## Auth

The UI uses `currentOwner()`. The API uses a bearer token, `BOARD_AGENT_SECRET`,
in the same shape as `BRAIN_SYNC_SECRET` and `LODGING_FINDER_SECRET`.

**It gets its own secret rather than reusing `BRAIN_SYNC_SECRET`.** The decisions
endpoint reuses the sync token on the explicit grounds that anything holding it
can already rewrite the mirror, so a second secret would be a second thing to
rotate for no extra containment. That reasoning does not carry over here: a board
token moves cards, a brain token rewrites the vault mirror. Different blast
radius, different key, per the rule in `lib/hmac.ts`.

Public internet is fine. No new auth model is needed — this is three existing
patterns pointed at new tables.

## Schema

New tables, RLS enabled with **no policies**, matching `guests` and
`guest_groups`. `lib/supabase.ts` bypasses RLS with `SUPABASE_SECRET_KEY` and is
`import "server-only"`. If a board query ever returns an empty array with a null
error, the secret key is missing from the environment. Do not "fix" that by
adding an anon policy.

```
board_projects
  id, slug (unique), name, description
  status            active | archived
  locked_at         see The lock
  brain_tags[]      joins brain_notes.tags
  created_at, updated_at

board_columns
  id, project_id, key, name
  position          integer, columns are reordered rarely
  agent_can_enter   boolean, default true — see The oversight model
  created_at

board_cards
  id, project_id, column_id
  title, body
  summary           one paragraph: where this card actually stands.
                    Claude keeps it current; it is what archiving compresses.
  position          double precision — fractional indexing
  labels[]
  locked_at
  review_kind       null | complete | delete | decision
  review_note       Claude's rationale
  review_at
  created_at, updated_at

board_thread
  id, project_id, card_id (nullable — a question can be about the project)
  author            claude | aaron
  kind              question | answer | note | finding
  body
  options           jsonb — [{id, label, detail}] for a multiple-choice question
  parent_id         an answer points at its question
  status            open | answered | dropped
  created_at, answered_at

board_cursor
  id, last_read_at
```

`position` is a float for the reason `trip_items.position` is: a drag becomes one
UPDATE. `positionBetween()` in `components/honeymoon/trip.ts` already does the
fractional indexing and ports over unchanged.

**`board_cursor` matters more than it looks.** It is where Claude had read up to,
held server-side rather than in the conversation. A session that has been
compacted has forgotten everything; the server has not. Without it, "what changed
since last time" is unanswerable on any cold start, which is the whole problem
this board exists to solve.

Columns are per-project and user-defined. Seed every new project with Backlog,
Next up, In progress and Done.

## The oversight model

Two constraints that pull against each other: Claude should move cards and post
findings as work happens, and Aaron should not be drowning in notifications. The
resolution is a **verb hierarchy, not a notification stream.**

Free, no confirmation:

- post a finding, a note or a question
- edit a card's body
- move a card between columns whose `agent_can_enter` is true

Flagged for review:

- moving a card into a column with `agent_can_enter = false`
- deleting anything
- closing a question

A flagged action does not happen. Claude sets `review_kind` and `review_note` on
the card and the card gets a marker. The board has a filter for them and a count.
Aaron clears them in a batch whenever, accepting or dismissing. Nothing pings.

The property worth protecting: **Claude can never make something disappear or
declare something finished.** Those are the two actions that actually cost
something. Everything else is reversible and visible on the card.

`agent_can_enter` is what makes this work with user-defined columns. The system
cannot guess that a column called "Shipped" is terminal, so the column says so.
It is seeded false on Done and true on everything else, and it is Aaron's to
change.

There is no `board_proposals` table. The flag on the card *is* the proposal, and
it lives where the work is rather than in a queue beside it.

## The lock

`locked_at` on a project and on a card. When set, **the agent API** refuses every
write to it with `409` and a sentence naming the lock. The UI is unaffected —
this is a lock against Claude, not against Aaron.

Checked in the query layer, next to the `currentOwner()` checks, not in a route
guard. Same rule the rest of the site follows: the proxy guards pages, and
anything that touches data guards itself.

## API

```
GET   /api/board/work
        Answered questions since board_cursor, plus unlocked cards.
        Bumps the cursor. Cheap: also returns open_questions as a count,
        so an in-session poll is a small request.

GET   /api/board/cards/:id
        The card, its whole thread, the project's context, and the
        brain_notes matching the project's tags.

PATCH /api/board/cards/:id
        Move or edit. 409 if the card or project is locked.
        409 if the target column has agent_can_enter = false.

POST  /api/board/cards/:id/thread
        A finding or a question. Questions may carry options[].

POST  /api/board/cards/:id/review
        Flag for review: complete, delete or decision, with a rationale.
```

`GET /api/board/work` is the endpoint that earns the whole design. Today every
session starts cold or from a compaction summary. That call is "here is what you
asked, here is what Aaron answered, here is what is unlocked."

A question with `options[]` is answerable at a red light. An open text box is a
question that sits for a week. Prefer options wherever the answer is a choice
rather than an explanation.

## The in-session poll

No server-side automation. When Claude posts questions mid-session it starts a
background poll against `GET /api/board/work` watching `open_questions` fall to
zero, which wakes it with the answers. The conversation continues meanwhile, or
Aaron walks away and comes back.

This is the same mechanism used to watch the HAOS alarms rejoin Thread on
2026-10-20 — a background task polling a condition, not a timer that guesses.

Scheduled polling, if it ever happens, is a separate conversation and a
`vercel.json` cron, like `/api/backup`.

## SecondBrain tags

`brain_notes` is already mirrored into Supabase by `/api/brain/sync`, with a
`tags` array. Attaching tags to a project is a join against a table that already
exists — no MCP call, no second sync.

Deferred to phase 3 anyway. The right tags are not knowable until the board has
been used.

## Phasing

**Phase 1** — schema and migration, `/me/board`, columns and cards with drag, the
agent API, the lock. Migrate the 31 artifact cards and delete that board.

**Phase 2** — the thread, `options[]` questions, the review flag and its filter.

**Phase 3** — project tags joined to `brain_notes`. Multiple projects.

`project_id` is in the schema from day one; phase 1 ships with one project.

## Migration

Per the repo's documented flow. The `</dev/null` is not optional — in a
non-interactive shell `supabase migration new` reads the body from stdin and
hangs, and a hung one killed mid-run records the version with zero statements.

```bash
npx supabase migration new board_schema </dev/null
npx supabase migration up
npx supabase gen types typescript --local > lib/database.types.ts
# at ship time, before the Vercel deploy:
npx supabase db push
```

## Settled

**No assignee.** Whoever picks it up. One project and two actors, and the review
flag already says who is waiting on whom.

**Findings are both.** Every finding is a `board_thread` row, so the history
survives; `board_cards.summary` carries where the card actually stands right now.
The thread is the record and the summary is the answer to "what is this, again" —
and the summary is what archiving compresses, so keeping it current is not
bookkeeping.

## Archiving is compression, not a status

Archiving a project is a **button that summarises it**, not a flag that hides it.
It writes one document — the project's context plus every card's summary and how
it ended — files that into SecondBrain, and leaves a short entry under *Finished
projects* on the site.

This is deliberately not "keep everything and grey it out". The detail belongs in
the vault, which is what the vault is for; the board only needs enough to answer
"why did we do it that way" and to start again. Think of it as zipping a folder
rather than deleting it.

```
board_archives
  id, slug, name
  summary          the compressed project: context + each card's outcome
  card_count, finished_at
  brain_path       where the full write-up landed in the vault
  created_at
```

The original rows go once the archive is written and the vault has the document.
**Pick it back up** creates a new project seeded from `summary`, with a link to
the archive and the vault note. A revived project starts with the reasoning and
none of the dead cards.

Phase 3. It needs the SecondBrain write path, and that is the same path
`/api/brain/sync` already owns — the summary is just another note the box pulls.

## Open questions

None outstanding.
