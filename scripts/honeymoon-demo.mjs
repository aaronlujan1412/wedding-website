#!/usr/bin/env node
/**
 * Fills the honeymoon board with a sample Japan trip, or empties it.
 *
 * The board has no bulk-delete in the UI — deleting a leg only sweeps its
 * cards back into the maybe pile — so this is how you start over. It is also
 * the fastest way to see what a full board looks like before committing to
 * planning a real one.
 *
 *   node --env-file=.env.local scripts/honeymoon-demo.mjs        # wipe, then seed
 *   node --env-file=.env.local scripts/honeymoon-demo.mjs --wipe # wipe only
 *
 * Writes to the linked Supabase project with the secret key, so it hits the
 * same rows the site reads. Destructive by design: it clears every trip table
 * first, every time.
 */

import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

const NO_UUID = "00000000-0000-0000-0000-000000000000";

/** Children first — trip_items points at dates, not at legs, but keep it tidy. */
async function wipe() {
  await db.from("trip_items").delete().neq("id", NO_UUID);
  await db.from("trip_docs").delete().neq("id", NO_UUID);
  await db.from("trip_days").delete().neq("on_date", "1900-01-01");
  await db.from("trip_legs").delete().neq("id", NO_UUID);
}

await wipe();

if (process.argv.includes("--wipe")) {
  console.log("Honeymoon board emptied.");
  process.exit(0);
}

const legs = [
  {
    name: "Tokyo",
    name_ja: "東京",
    starts_on: "2026-12-05",
    ends_on: "2026-12-10",
    position: 1,
    lodging_name: "Hotel Ryumeikan",
    lodging_check_in: "15:00",
    lodging_confirmation: "RMK-88413",
  },
  {
    name: "Hakone",
    name_ja: "箱根",
    starts_on: "2026-12-11",
    ends_on: "2026-12-12",
    position: 2,
    lodging_name: "Gora Kadan",
    lodging_check_in: "15:00",
  },
  {
    name: "Kyoto",
    name_ja: "京都",
    starts_on: "2026-12-13",
    ends_on: "2026-12-18",
    position: 3,
    lodging_name: "Ryokan Yachiyo",
    lodging_check_in: "15:00",
  },
  {
    name: "Osaka",
    name_ja: "大阪",
    starts_on: "2026-12-19",
    ends_on: "2026-12-22",
    position: 4,
  },
  {
    name: "Tokyo again",
    name_ja: "東京",
    starts_on: "2026-12-23",
    ends_on: "2026-12-26",
    position: 5,
  },
];
// Wipe first so this is re-runnable.
for (const t of ["trip_items", "trip_docs", "trip_days", "trip_legs"]) {
  await db
    .from(t)
    .delete()
    .neq(
      t === "trip_days" ? "on_date" : "id",
      t === "trip_days" ? "1900-01-01" : "00000000-0000-0000-0000-000000000000",
    );
}
await db.from("trip_legs").insert(legs);

const items = [
  // Dec 5 — arrival, pinned and ticketed
  {
    title: "SLC → HND",
    title_ja: "羽田空港",
    kind: "transit",
    on_date: "2026-12-05",
    position: 1,
    start_time: "14:20",
    duration_min: 90,
    pinned: true,
    booking_status: "in_hand",
    booking_ref: "DL167",
    added_by: "aaron",
    city: "Tokyo",
  },
  {
    title: "Check in, then collapse",
    kind: "lodging",
    on_date: "2026-12-05",
    position: 2,
    start_time: "17:00",
    duration_min: 60,
    booking_status: "booked",
    added_by: "aaron",
    city: "Tokyo",
  },
  // Dec 6 — a timed morning, a long open afternoon, a booked dinner
  {
    title: "teamLab Borderless",
    title_ja: "チームラボボーダレス",
    kind: "sight",
    on_date: "2026-12-06",
    position: 1,
    start_time: "10:00",
    duration_min: 150,
    booking_status: "booked",
    cost_yen: 3800,
    city: "Tokyo",
    added_by: "savea",
    must_do: true,
  },
  {
    title: "Tsukiji outer market",
    title_ja: "築地場外市場",
    kind: "food",
    on_date: "2026-12-06",
    position: 2,
    cost_yen: 3000,
    city: "Tokyo",
    added_by: "aaron",
  },
  {
    title: "Kaiseki at Ryugin",
    kind: "food",
    on_date: "2026-12-06",
    position: 3,
    start_time: "19:00",
    duration_min: 150,
    booking_status: "to_book",
    booking_opens_on: "2026-09-01",
    cost_yen: 45000,
    city: "Tokyo",
    added_by: "savea",
  },
  // Dec 8 — a Tuesday; Ghibli is shut Tuesdays, and tickets drop Nov 10
  {
    title: "Ghibli Museum",
    title_ja: "三鷹の森ジブリ美術館",
    kind: "sight",
    on_date: "2026-12-08",
    position: 1,
    start_time: "10:00",
    duration_min: 120,
    booking_status: "to_book",
    booking_opens_on: "2026-11-10",
    closed_days: [2],
    cost_yen: 1000,
    city: "Tokyo",
    added_by: "savea",
    must_do: true,
  },
  // Dec 9 — a march
  ...[
    "Meiji Jingu",
    "Harajuku",
    "Shibuya Sky",
    "Golden Gai",
    "Shinjuku ramen crawl",
    "Karaoke until 2am",
  ].map((t, i) => ({
    title: t,
    kind: i > 3 ? "food" : "sight",
    on_date: "2026-12-09",
    position: i + 1,
    duration_min: 120,
    city: "Tokyo",
    added_by: i % 2 ? "savea" : "aaron",
  })),
  // Dec 13 — two cities, no train
  {
    title: "Fushimi Inari at dawn",
    title_ja: "伏見稲荷大社",
    kind: "sight",
    on_date: "2026-12-13",
    position: 1,
    start_time: "06:30",
    duration_min: 150,
    cost_yen: 0,
    city: "Kyoto",
    added_by: "aaron",
    notes: "Go before the tour buses. It's the whole point.",
  },
  {
    title: "Dotonbori at night",
    title_ja: "道頓堀",
    kind: "food",
    on_date: "2026-12-13",
    position: 2,
    start_time: "19:00",
    duration_min: 120,
    city: "Osaka",
    added_by: "savea",
  },
  // Dec 24 — Christmas Eve
  {
    title: "Something absurdly romantic",
    kind: "food",
    on_date: "2026-12-24",
    position: 1,
    start_time: "19:00",
    duration_min: 180,
    booking_status: "idea",
    city: "Tokyo",
    added_by: "savea",
    must_do: true,
  },
  // The pile
  // Draft lanes: the same day proposed two different ways.
  {
    title: "Nezu Museum garden",
    title_ja: "根津美術館",
    kind: "sight",
    lane: "savea",
    on_date: "2026-12-07",
    position: 1,
    start_time: "11:00",
    duration_min: 120,
    city: "Tokyo",
    added_by: "savea",
  },
  {
    title: "Vintage shopping in Shimokita",
    kind: "shop",
    lane: "savea",
    on_date: "2026-12-07",
    position: 2,
    duration_min: 180,
    city: "Tokyo",
    added_by: "savea",
  },
  {
    title: "Tsukiji knife shopping, round two",
    kind: "shop",
    lane: "aaron",
    on_date: "2026-12-07",
    position: 1,
    start_time: "10:00",
    duration_min: 120,
    city: "Tokyo",
    added_by: "aaron",
  },
  {
    title: "Yakitori under the tracks",
    title_ja: "有楽町",
    kind: "food",
    lane: "aaron",
    on_date: "2026-12-07",
    position: 2,
    start_time: "18:30",
    duration_min: 120,
    cost_yen: 9000,
    city: "Tokyo",
    added_by: "aaron",
  },
  {
    title: "Indigo dyeing workshop",
    title_ja: "藍染体験",
    kind: "workshop",
    position: 1,
    duration_min: 180,
    cost_yen: 8000,
    added_by: "savea",
    lane: "savea",
    url: "https://example.com",
  },
  {
    title: "Soba making class",
    title_ja: "そば打ち体験",
    kind: "workshop",
    position: 2,
    duration_min: 120,
    cost_yen: 6000,
    added_by: "aaron",
    lane: "aaron",
  },
  {
    title: "Knife shopping on Kappabashi",
    title_ja: "合羽橋道具街",
    kind: "shop",
    position: 3,
    duration_min: 90,
    city: "Tokyo",
    added_by: "aaron",
    lane: "aaron",
    must_do: true,
  },
  {
    title: "A whole day doing nothing",
    kind: "rest",
    position: 4,
    duration_min: 480,
    added_by: "savea",
    lane: "savea",
  },
  {
    title: "Onsen, no phones",
    kind: "rest",
    position: 5,
    duration_min: 180,
    added_by: "aaron",
    lane: "aaron",
  },
];
// PostgREST unions the columns of a batch insert and sends an explicit NULL
// for any a given row omits — it does not fall back to the column default. So
// every NOT NULL column with a default has to be spelled out here.
const DEFAULTS = {
  closed_days: [],
  pinned: false,
  must_do: false,
  booking_status: "idea",
  kind: "sight",
  added_by: "aaron",
  lane: "decided",
};
const { error } = await db
  .from("trip_items")
  .insert(items.map((i) => ({ ...DEFAULTS, ...i })));
if (error) throw error;

await db.from("trip_days").insert([
  {
    on_date: "2026-12-05",
    title: "Arrival",
    note: "Jet lag day. Nothing before noon and no guilt about it.",
  },
  { on_date: "2026-12-09", title: "The ambitious one" },
]);

await db.from("trip_docs").insert([
  {
    category: "flight",
    title: "SLC → HND · Delta 167",
    detail: "Seats 22A/22B. Bags checked through.",
    confirmation: "GKQ4TZ",
    starts_at: "2026-12-04T11:05:00-07:00",
    cost_yen: 340000,
    position: 1,
  },
  {
    category: "rail",
    title: "JR Pass · 14 day, green car",
    detail: "Activate at Haneda on arrival. Exchange order is in the folder.",
    confirmation: "JRP-993201",
    cost_yen: 80000,
    position: 1,
  },
  {
    category: "luggage",
    title: "Takuhaibin · Tokyo → Kyoto",
    detail:
      "Ship the big case ahead the morning of the 12th so the shinkansen is a daypack only.",
    cost_yen: 2500,
    position: 1,
  },
  {
    category: "connectivity",
    title: "Ubigi eSIM · 20GB",
    detail: "Install before leaving — it needs wifi to activate.",
    position: 1,
  },
]);
console.log("Honeymoon board seeded with the sample Japan trip.");
