-- Item kinds, rebuilt around what is actually on the board, plus blockouts.
--
-- The old enum had one working value. 109 of 112 cards were 'sight', because
-- the form defaulted to 'sight' and "sight" is a plausible answer for almost
-- anything -- so nobody ever opened the dropdown. The fix is not a longer list
-- of the same shape: it is a default that is visibly NOT an answer. 'unsorted'
-- is that default, and it renders with no colour at all.
--
-- 'transit' and 'lodging' leave the enum entirely. Where you sleep is a
-- trip_stays row on the lodging tab, and how you get between cities is getting
-- its own tab; neither is a card you drag around a day.
--
-- Three of the values are blockouts -- rest, wander, travel -- which claim time
-- without being an activity. They are in this enum rather than a parallel
-- column so that one dropdown turns "we'll rest here" into "actually, the
-- aquarium" without a delete and a re-add. Everything that has to behave
-- differently keys off the blockout flag in the KINDS map, not off the schema.

create type trip_item_kind_new as enum (
  'unsorted',
  -- things to do
  'shrine', 'food', 'workshop', 'shop', 'outdoors',
  'culture', 'event', 'play', 'animals', 'onsen',
  -- blocked out
  'rest', 'wander', 'travel'
);

-- Everything lands in 'unsorted' and the reclassification below is the single
-- source of truth for where each card ends up. Carrying three of the old values
-- across would mean two mappings to keep in agreement for no benefit.
alter table trip_items alter column kind drop default;

alter table trip_items
  alter column kind type trip_item_kind_new
  using 'unsorted'::trip_item_kind_new;

alter table trip_items alter column kind set default 'unsorted';

drop type trip_item_kind;
alter type trip_item_kind_new rename to trip_item_kind;

/* ------------------------------------------------ reclassify what exists -- */

-- Matched on title because that is the only stable handle the board's own rows
-- have -- ids are per-environment. A title that is not listed stays 'unsorted',
-- which is the safe outcome rather than a wrong one. Duplicate titles (Karaoke,
-- Mame-Shiba Cafe, Square Enix Cafe) are deliberately caught twice: both copies
-- are the same kind of thing.

update trip_items set kind = 'shrine' where title = any(array[
  '7 1000yr cedar shrine', '108 temple bells', 'Dawn Prayer Service',
  'First Shrine Visit', 'IT Security Shrine', 'Kitaguchi Hongu Fuji Sengen shrine',
  'Meiji Shrine', 'Oldest Fuji Shrine', 'Senso-ji', 'Sensoji Temple', 'Shrine',
  'Shrine Hike', 'Spice Shop/Shrine', 'Village Shrine/1000yr cedar',
  'Your Name Staircase', 'Super cool looking tori gate in water',
  'Saiho-ji (Moss Temple)'
]);

update trip_items set kind = 'food' where title = any(array[
  'Bullet Train Sushi', 'Izakaya', 'KFC and strawberry shortcake!',
  'Market Breakfast', 'New Year Breakfast', 'New Year''s Soba',
  'Osechi and ozoni breakfast', 'Strawberry Dessert Buffet', 'Sushi Omakaze',
  'Sweets + Tea Ceremony', 'Maid Cafe', 'Square Enix Cafe', 'Golden Gai',
  'Buncha cool looking alleys', 'Lunch + Sunset'
]);

update trip_items set kind = 'workshop' where title = any(array[
  'Bamboo Crafting (Alt)', 'Bamboo Crafting Workshop', 'Calligraphy Workshop',
  'Ceramic Repair', 'Chopstick making', 'Chopstick Making', 'Kintsugi Workshop',
  'Lattice Joinery', 'Nail-free joinery', 'Silk Weaving', 'Soba Making Workshop',
  'Various Craft Workshops', 'Ninja Training',
  'Samurai Armor Rental (Photo op in Shoji lake)'
]);

update trip_items set kind = 'shop' where title = any(array[
  'Anime shopping', 'Board Game Store', 'FF Merch', 'Fun shopping center',
  'Fun Tech Silly Shopping', 'Hanafuda/Nintendo Card Decks',
  'Jimbocho (Book town)', 'Kikusue Cutlery', 'Knife Making/Woodworking tools',
  'Lucky Bags!!', 'nihonbashi-nishikawaniho - Custom Pillow',
  'Nintendo/Capcom/Pokemon/Jump Shop', 'Radio Center/Akizuki/Sengoku',
  'Retro Games', 'Takeshita St.', 'Bonsai Village'
]);

update trip_items set kind = 'outdoors' where title = any(array[
  '1000 yen note view hike', 'Cedar Avenue Snowshoe', 'Cool Fuji view hike',
  'Cool pagoda and Fuji', 'Kamakura Trails', 'Mitake Hike',
  'Mt. Takao + Diamond Fuji', 'New Years Day Sunrise Hike - "Hatsuhinode"',
  'First Sunrise', 'Watch The Sunrise', 'Lava Ice Cave',
  'Zao Snow Monsters, Yamagata', 'Black Eggs of Owakudani, Hakone', 'Kamakura'
]);

update trip_items set kind = 'culture' where title = any(array[
  'Black Castle', 'Imperial Palace', 'Open Air Architecture Museum',
  'Old Merchant Street', 'Super Traditional Village', 'Shoji Small Village',
  'Nintendo Museum', 'JJK Shibuya Incident walk'
]);

-- Date-locked by the world rather than by us: Kohaku is the 31st, fukubukuro
-- is the 1st and 2nd, Seijin no Hi is the second Monday.
update trip_items set kind = 'event' where title = any(array[
  'Alt Christmas Market', 'Christmas Advent Tokyo', 'Christmas Illuminations',
  'Tokyo Christmas Market', 'Tokyo Midtown Christmas', 'Coming of Age Day',
  'NHK Broadcast (New Year''s)', 'See the Imperial Family', 'SUMO Day 1'
]);

update trip_items set kind = 'play' where title = any(array[
  'Arcade', 'Retro Arcade', 'Karaoke', 'Tokyo Disneyland',
  'Tokyo DisneySea/DisneyLand', 'Tokyo Go Carting'
]);

update trip_items set kind = 'animals' where title = any(array[
  'Nagasaki Penguin Aquarium', 'Sumida Aquarium', 'Sunshine Aquarium',
  'Mame-Shiba Cafe', 'Snow Monkeys'
]);

-- Onsen towns and the ryokan ideas. These are not trip_stays rows: a stay needs
-- real check-in and check-out dates, and these are undated wishes. One becomes
-- a stay on the lodging tab the day it gets booked.
update trip_items set kind = 'onsen' where title = any(array[
  'Onsen Village (Potential snow monkey)', 'Snow Village', 'Ryokan Options',
  'Wooden Ryokan', 'Tsugizakura Inn'
]);

update trip_items set kind = 'travel' where title = any(array[
  'Express train to Shinjuku'
]);

/* ------------------------------------------------------ blockout linking -- */

-- A rest blockout normally infers its stay from the night it sits on, so this
-- is only the override for a day that has more than one. Null is the common
-- case, not a missing value.
alter table trip_items
  add column linked_stay_id uuid references trip_stays (id) on delete set null;

-- The transit tab does not exist yet, so this carries no foreign key. The
-- constraint arrives with the table; the column is here now so wiring a travel
-- blockout to a train later is an update rather than a second migration.
alter table trip_items add column linked_transit_id uuid;

comment on column trip_items.linked_stay_id is
  'Rest blockout override. Null means infer the stay covering that night.';
comment on column trip_items.linked_transit_id is
  'Travel blockout target on the transit tab. No FK until that table exists.';

create index trip_items_linked_stay_idx
  on trip_items (linked_stay_id) where linked_stay_id is not null;
