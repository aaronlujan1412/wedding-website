-- The Ring, for songs.
--
-- The Ring used to cut the honeymoon's pile of ideas. It now cuts the wedding
-- playlist: 140 songs from the cocoa hour and dinner-and-dancing lists, about
-- 8 hours of music for a party with room for 5. Same tournament, same rules --
-- a bout is an event, every rating is replayed from the log in order, and
-- undo is a delete. See the header of 20260918004242_ring_bouts.sql.
--
-- trip_bouts and the ring columns on trip_items are left exactly as they were.
-- Nothing reads them any more, but they hold decisions somebody made, and
-- dropping them is a separate call from changing what the tab is for.

create table wedding_songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  -- Same three marks the trip cards carried, with the same meanings: cut by a
  -- bout or a finisher, protected by a wish, and whose finisher it was.
  cut_at timestamptz,
  saved_by trip_planner,
  vetoed_by trip_planner,
  created_at timestamptz not null default now(),

  constraint wedding_songs_once unique (title, artist)
);

alter table wedding_songs enable row level security;

-- Not scoped to a trip: there is one wedding. The outcome enum is the trip
-- ring's, because the six verdicts are the same six verdicts.
create table song_bouts (
  id uuid primary key default gen_random_uuid(),
  east_id uuid not null references wedding_songs (id) on delete cascade,
  west_id uuid not null references wedding_songs (id) on delete cascade,
  outcome trip_bout_outcome not null,
  created_at timestamptz not null default now(),

  constraint song_bouts_two_sides check (east_id <> west_id)
);

alter table song_bouts enable row level security;

-- The replay reads the whole log oldest first, and Elo depends on the order.
create index song_bouts_in_order on song_bouts (created_at, id);

-- The roster, as the list arrived: duplicates already removed, A to Z.
insert into wedding_songs (title, artist) values
  ('1, 2, 3, 4', 'Plain White T''s'),
  ('A Thousand Miles', 'Vanessa Carlton'),
  ('Absolutely Smitten', 'dodie'),
  ('Anyone Else', 'Shayne Orok & Ali Orok'),
  ('Baby I''m Yours', 'Arctic Monkeys'),
  ('Be Glad I Love You (Go to Bed)', 'Bug Hunter'),
  ('Beautiful Things', 'Benson Boone'),
  ('Beginning Middle End (Always and Forever Mix)', 'Leah Nobel'),
  ('Belter', 'Gerry Cinnamon'),
  ('Bloom', 'The Paper Kites'),
  ('Blue Eyed Girl', 'The Arcadian Wild'),
  ('Bromance', 'Chester See & Ryan Higa'),
  ('Can''t Keep My Hands off You (feat. Rivers Cuomo)', 'Simple Plan'),
  ('Can''t Stand It', 'Never Shout Never'),
  ('Candlelight', 'Relient K'),
  ('Christmas Is Coming', 'Vince Guaraldi Trio'),
  ('Christmas Time Is Here (Instrumental)', 'Vince Guaraldi Trio'),
  ('Christmas Tree (chill acoustic cover)', 'sterra'),
  ('Coffee Talk', 'Broadside'),
  ('Cotton Eye Joe', 'Rednex'),
  ('Cross My Mind', 'Twin Forks'),
  ('Cupid Shuffle', 'Cupid'),
  ('Dancing Queen', 'ABBA'),
  ('Dandelions', 'Ruth B.'),
  ('Dear Maria, Count Me In', 'All Time Low'),
  ('Devotion and Desire', 'Bayside'),
  ('Don''t Lay Your Head', 'Us The Duo'),
  ('Don''t Stop Believin''', 'Journey'),
  ('Don''t Stop Me Now', 'Queen'),
  ('Everybody x Elizabeth Taylor (Backstreet Boys x Taylor Swift mashup)', 'REYON'),
  ('Everytime We Touch', 'Cascada'),
  ('Fall Into Me', 'Forest Blakk'),
  ('Fallin''', 'Dylan Brady'),
  ('Falling Like the Stars', 'James Arthur'),
  ('Favorite Place', 'Humbear'),
  ('Fearless (Taylor''s Version)', 'Taylor Swift'),
  ('Fine', 'Ian McConnell'),
  ('Flowers in the Window', 'Travis'),
  ('Fly Me to the Moon', 'Going Spaceward & ibrahim'),
  ('Footloose', 'Kenny Loggins'),
  ('For the Dancing and the Dreaming', 'Gerard Butler, Craig Ferguson & Mary Jane Wells'),
  ('Forever and Ever and Always', 'Ryan Mack'),
  ('Forevermore', 'The Maine'),
  ('Gitchee Gitchee Goo (Phineas and Ferb)', 'Geek Music'),
  ('Goodnight Moon', 'Go Radio'),
  ('Grandma''s Feather Bed', 'John Denver'),
  ('Grow as We Go', 'Ben Platt'),
  ('Grow Old With You', 'Brent Morgan'),
  ('Growing Old With You (First Dance Version)', 'Restless Road'),
  ('Hallelujah', 'Jackson Cannon'),
  ('Helpless', 'Phillipa Soo & Original Broadway Cast of Hamilton'),
  ('Hey Stupid, I Love You', 'JP Saxe'),
  ('Hold Me Down', 'The Happy Fits'),
  ('Honey Hold Me', 'Morningsiders'),
  ('I Don''t Mind', 'Defeater'),
  ('I Freaking Love You', 'Rookie'),
  ('I Knew I Loved You', 'Music Travel Love'),
  ('I Love You More', 'Ryan Mack'),
  ('I Love You', 'Spencer Bandy'),
  ('I Think I Fell in Love Today', 'Kelsea Ballerini'),
  ('I Think I Kinda, You Know (Duet)', 'Olivia Rodrigo & Joshua Bassett'),
  ('I Think They Call This Love (Cover)', 'Matthew Ifield'),
  ('I Wouldn''t Mind', 'He Is We'),
  ('I''m Only Me When I''m With You', 'Taylor Swift'),
  ('If You Go Down (I''m Goin'' Down Too)', 'Kelsea Ballerini'),
  ('Jellyfish', 'Slowly Slowly'),
  ('Jet Lag (feat. Natasha Bedingfield)', 'Simple Plan'),
  ('Just Right', 'Tessa Violet'),
  ('Kinda Love You''d See in a Movie', 'Ryan Mack'),
  ('Like No One Does', 'Jake Scott'),
  ('Linus and Lucy', 'Vince Guaraldi Trio'),
  ('Livin'' on a Prayer', 'Bon Jovi'),
  ('Love My Life Away', 'Harry Connick Jr.'),
  ('Love Song', 'Why Don''t We'),
  ('Love Story // Check Yes Juliet (Live)', 'Nicotine Dolls'),
  ('Love You Still (abcdefu romantic version)', 'Tyler Shaw'),
  ('Lover', 'Taylor Swift'),
  ('Mambo No. 5 (A Little Bit of...)', 'Lou Bega'),
  ('Mango Man', 'Brent Holmes'),
  ('Marry You', 'Bruno Mars'),
  ('Merry-Go-Round of Life (Howl''s Moving Castle)', 'Joe Hisaishi'),
  ('Mr. Brightside', 'The Killers'),
  ('Mushaboom', 'Feist'),
  ('Must Have Done Something Right', 'Relient K'),
  ('My Person', 'Spencer Crandall'),
  ('My Shot', 'Lin-Manuel Miranda, Daveed Diggs, Okieriete Onaodowan & Leslie Odom Jr. (Hamilton)'),
  ('My Wish', 'Rascal Flatts'),
  ('Never Stop (Wedding Version)', 'Safetysuit'),
  ('Next to You, Next to Me', 'Shenandoah'),
  ('No Better Reason', 'Michael McCormic Jr.'),
  ('No Matter Where You Are', 'Us The Duo'),
  ('Nothing New', 'Theo Kandel'),
  ('One Summer''s Day (Spirited Away)', 'Joe Hisaishi & London Symphony Orchestra'),
  ('Paper Rings', 'Taylor Swift'),
  ('Paris', 'Taylor Swift'),
  ('Party in the U.S.A.', 'Miley Cyrus'),
  ('Party Rock Anthem (feat. Lauren Bennett & GoonRock)', 'LMFAO'),
  ('Perfect for Me', 'Bradley Marshall'),
  ('Perfect', 'Ed Sheeran'),
  ('Play That Funky Music', 'Wild Cherry'),
  ('Question', 'Old 97''s'),
  ('Rest (with Sasha Alex Sloan)', 'Dean Lewis'),
  ('Rest of My Life', 'Ryan Mack'),
  ('Ring Pop', 'Jax'),
  ('Sanctuary (Opening)', 'Utada Hikaru'),
  ('Scene One - James Dean & Audrey Hepburn', 'Sleeping With Sirens'),
  ('September', 'Earth, Wind & Fire'),
  ('Shake It Off', 'Taylor Swift'),
  ('Shut Up and Dance', 'WALK THE MOON'),
  ('Silver Screen Romance', 'Good Charlotte'),
  ('Simple', 'Orla Gartland'),
  ('Skating', 'Vince Guaraldi Trio'),
  ('Somewhere in Neverland (Acoustic)', 'All Time Low'),
  ('Spend Some Time', 'Tessa Violet'),
  ('Steady', 'PEABOD'),
  ('Stray Italian Greyhound', 'Vienna Teng'),
  ('Stupid for You', 'Waterparks'),
  ('Supermassive Black Hole', 'Muse'),
  ('Sweet Caroline', 'Neil Diamond'),
  ('Sweet Nothing', 'Taylor Swift'),
  ('Teenage Dream (Katy Perry cover)', 'Glee Cast'),
  ('The Book of Love', 'The Magnetic Fields'),
  ('The Good Ones', 'Gabby Barrett'),
  ('The Man Who Loves You the Most', 'Zac Brown Band'),
  ('The Way I Love You', 'Michal Leah'),
  ('There''s No Way', 'Alabama'),
  ('Those Eyes', 'New West'),
  ('Till We Both Say', 'Nicotine Dolls'),
  ('Time in a Bottle', 'Jim Croce'),
  ('Today Was a Fairytale (Taylor''s Version)', 'Taylor Swift'),
  ('Toothpaste Kisses', 'The Maccabees'),
  ('Touching Heaven', 'JOHNNYSWIM'),
  ('Turn It Up', 'The Wrecks'),
  ('Us Someday', 'Thomas Rhett'),
  ('Valentine', 'Reinaeiry'),
  ('Wi$h Li$t (Wedding Piano Version)', 'Paul Hankinson Covers'),
  ('Wi$h Li$t', 'Taylor Swift'),
  ('Wondering Why', 'The Red Clay Strays'),
  ('Yeah! (feat. Lil Jon & Ludacris)', 'Usher'),
  ('You Are in Love (Taylor''s Version)', 'Taylor Swift')
on conflict on constraint wedding_songs_once do nothing;
