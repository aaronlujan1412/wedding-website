-- Shared ticks for the helper pages' checklists: packing, setting up the
-- lodge, clean-up and the shot list. A row is a ticked box; unticking
-- deletes it, so the table only ever holds what's done.
--
-- `card` is the helper card's id (`components/helpers/cards.ts`) and `item`
-- the line's key: its text after the texts of the lines it sits under
-- (`tickKey`). Text rather than position, so adding a line to a list never
-- moves a tick onto a different one; rewording a line unticks it, which is
-- right, since it's a different thing to do now.
create table public.helper_ticks (
  card text not null,
  item text not null,
  ticked_at timestamptz not null default now(),
  primary key (card, item)
);

-- Server-only, like guests: RLS on and no policies, so anon and
-- authenticated are denied entirely. The site reads and writes it with the
-- secret key, after checking that the item is a real line on that card.
alter table public.helper_ticks enable row level security;
