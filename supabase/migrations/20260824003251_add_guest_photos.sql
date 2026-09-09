-- Guest-uploaded photos for /photos.
--
-- Google Photos was the original plan, but a link-shared album only lets people
-- *view*. Contributing requires a Google account plus a join flow, which would
-- have silently dropped every guest who doesn't have one. Uploads come through
-- the site instead, gated by the same last-four-of-phone check the RSVP flow
-- already uses, so only people on the guest list can post.

create table guest_photos (
    id uuid primary key default gen_random_uuid(),
    group_id smallint not null references guest_groups(id) on delete cascade,
    storage_path text not null unique,
    -- Captured client-side before upload so the grid can reserve the right
    -- aspect ratio without the server ever decoding the image.
    width integer not null,
    height integer not null,
    caption text,
    -- Set from the host review page. Hidden rows keep their object in the
    -- bucket so a mis-click is reversible; deleting is a separate action.
    hidden boolean not null default false,
    created_at timestamptz not null default now()
);

-- The gallery only ever reads visible photos, newest first.
create index guest_photos_visible_idx
    on guest_photos (created_at desc)
    where not hidden;

-- Same posture as guests / guest_groups / seating_tables: RLS on, no policies
-- at all. Every read and write goes through the secret key server-side, which
-- bypasses RLS. Do NOT add an anon policy to "fix" an empty read here — that
-- symptom means SUPABASE_SECRET_KEY is missing from the environment.
alter table guest_photos enable row level security;

-- Public read so next/image can pull straight from the Supabase CDN. Writes
-- only ever happen server-side with the secret key, and object names are
-- random UUIDs, so "public" means unguessable-but-fetchable, not listable.
insert into storage.buckets (id, name, public)
values ('guest-photos', 'guest-photos', true)
on conflict (id) do nothing;
