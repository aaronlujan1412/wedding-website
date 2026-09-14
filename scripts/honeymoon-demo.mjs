#!/usr/bin/env node
/**
 * Snapshots, seeds, restores or empties the honeymoon board.
 *
 * NOTHING here is destructive by default, and that is deliberate: an earlier
 * version of this script wiped every trip table on startup before it even read
 * its arguments, and running it to preview a demo destroyed real planning data.
 * The project has no PITR and no stored backups, so there was nothing to
 * restore from. Hence the rules below.
 *
 *   --status              what's in there now (the default; touches nothing)
 *   --production          required for any destructive op on a non-local db
 *   --snapshot            dump every trip table to supabase/.backups/
 *   --restore <file>      put a snapshot back (replaces current contents)
 *   --seed                write the sample Japan trip
 *   --wipe                empty every trip table
 *
 * --seed and --wipe refuse to run while the board has anything in it. Pass
 * --force to override, and a snapshot is always written first either way.
 *
 *   node --env-file=.env.local scripts/honeymoon-demo.mjs --status
 *   node --env-file=.env.local scripts/honeymoon-demo.mjs --seed --force
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { assertSafeTarget, target } from "./db-target.mjs";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

/** Legs first on the way in; it does not matter, but it reads in trip order. */
const TABLES = [
  "trip_legs",
  "trip_days",
  "trip_items",
  "trip_docs",
  "trip_flights",
  "trip_checklist_items",
];
/** PostgREST refuses an unfiltered delete; "key is not null" matches every
 *  row and, unlike a sentinel value, does not care what type the key is. */
const KEYS = {
  trip_days: "on_date",
  trip_legs: "id",
  trip_items: "id",
  trip_docs: "id",
  trip_flights: "id",
  trip_checklist_items: "id",
};
const BACKUP_DIR = "supabase/.backups";

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const force = has("--force");

async function counts() {
  const out = {};
  for (const table of TABLES) {
    const { count } = await db
      .from(table)
      .select("*", { count: "exact", head: true });
    out[table] = count ?? 0;
  }
  return out;
}

function total(c) {
  return Object.values(c).reduce((a, b) => a + b, 0);
}

/** Always run before anything destructive. Cheap, and the only safety net. */
async function snapshot(label = "snapshot") {
  const data = {};
  for (const table of TABLES) {
    const { data: rows, error } = await db.from(table).select();
    if (error) throw error;
    data[table] = rows ?? [];
  }

  await mkdir(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = `${BACKUP_DIR}/${label}-${stamp}.json`;
  await writeFile(file, JSON.stringify(data, null, 2));
  console.log(`Snapshot written to ${file} (${total(await counts())} rows)`);
  return file;
}

async function wipe() {
  for (const table of TABLES) {
    const { error } = await db
      .from(table)
      .delete()
      .not(KEYS[table], "is", null);
    if (error) throw error;
  }
}

/** Refuses to throw away work unless you say so out loud. */
async function guard(action) {
  assertSafeTarget(action, { production: has("--production") });

  const current = await counts();
  if (total(current) === 0) return;

  if (!force) {
    console.error(`Refusing to ${action}: the board is not empty.`);
    for (const [table, n] of Object.entries(current)) {
      if (n > 0) console.error(`  ${table.padEnd(12)} ${n}`);
    }
    console.error(
      "\nSnapshot it first, then pass --force if you really mean it:",
    );
    console.error(
      "  node --env-file=.env.local scripts/honeymoon-demo.mjs --snapshot",
    );
    process.exit(1);
  }

  await snapshot(`before-${action}`);
}

async function restore(file) {
  if (!file) {
    console.error(
      "--restore needs a file: --restore supabase/.backups/<name>.json",
    );
    process.exit(1);
  }

  const data = JSON.parse(await readFile(file, "utf8"));
  await guard("restore");
  await wipe();

  for (const table of TABLES) {
    const rows = data[table] ?? [];
    if (rows.length === 0) continue;
    const { error } = await db.from(table).insert(rows);
    if (error) throw error;
    console.log(`  ${table.padEnd(12)} ${rows.length} restored`);
  }
  console.log(`Restored from ${file}.`);
}

if (has("--snapshot")) {
  await snapshot();
  process.exit(0);
}

if (has("--restore")) {
  await restore(args[args.indexOf("--restore") + 1]);
  process.exit(0);
}

if (has("--wipe")) {
  await guard("wipe");
  await wipe();
  console.log("Honeymoon board emptied.");
  process.exit(0);
}

if (!has("--seed")) {
  const current = await counts();
  const { url, isLocal } = target();
  console.log(`Honeymoon board on ${url}${isLocal ? "" : "  (PRODUCTION)"}:`);
  for (const [table, n] of Object.entries(current)) {
    console.log(`  ${table.padEnd(12)} ${n}`);
  }
  console.log(
    "\nNothing changed. Pass --seed, --wipe, --snapshot or --restore <file>.",
  );
  process.exit(0);
}

await guard("seed");
await wipe();

const decidedLegs = [
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

// The two draft routes disagree on purpose, so the leg bands have something to
// show: Savea wants an extra night in Tokyo and a proper onsen stop; Aaron
// wants three nights based in Akihabara and skips Hakone.
const saveaLegs = [
  {
    name: "Tokyo",
    name_ja: "東京",
    starts_on: "2026-12-05",
    ends_on: "2026-12-11",
    lodging_name: "Hotel Ryumeikan",
  },
  {
    name: "Hakone",
    name_ja: "箱根",
    starts_on: "2026-12-12",
    ends_on: "2026-12-14",
    lodging_name: "Gora Kadan",
  },
  {
    name: "Kyoto",
    name_ja: "京都",
    starts_on: "2026-12-15",
    ends_on: "2026-12-22",
    lodging_name: "Ryokan Yachiyo",
  },
];
const aaronLegs = [
  {
    name: "Tokyo",
    name_ja: "東京",
    starts_on: "2026-12-05",
    ends_on: "2026-12-08",
    lodging_name: "Hotel Ryumeikan",
  },
  {
    name: "Akihabara",
    name_ja: "秋葉原",
    starts_on: "2026-12-09",
    ends_on: "2026-12-11",
    lodging_name: "Remm Akihabara",
  },
  {
    name: "Kyoto",
    name_ja: "京都",
    starts_on: "2026-12-12",
    ends_on: "2026-12-18",
  },
  {
    name: "Osaka",
    name_ja: "大阪",
    starts_on: "2026-12-19",
    ends_on: "2026-12-22",
  },
];

const LEG_DEFAULTS = {
  name_ja: null,
  lodging_name: null,
  lodging_check_in: null,
  lodging_confirmation: null,
};
const legs = [
  ...decidedLegs.map((l) => ({ ...LEG_DEFAULTS, ...l, lane: "decided" })),
  ...saveaLegs.map((l, i) => ({
    ...LEG_DEFAULTS,
    ...l,
    lane: "savea",
    position: i + 1,
  })),
  ...aaronLegs.map((l, i) => ({
    ...LEG_DEFAULTS,
    ...l,
    lane: "aaron",
    position: i + 1,
  })),
];
{
  const { error } = await db.from("trip_legs").insert(legs);
  if (error) throw error;
}

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
    cost_amount: 3800,
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
    cost_amount: 3000,
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
    cost_amount: 45000,
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
    cost_amount: 1000,
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
    cost_amount: 0,
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
    cost_amount: 9000,
    city: "Tokyo",
    added_by: "aaron",
  },
  {
    title: "Indigo dyeing workshop",
    // Booked through a US site, so the price is dollars (in cents).
    title_ja: "藍染体験",
    kind: "workshop",
    position: 1,
    duration_min: 180,
    cost_amount: 5500,
    cost_currency: "USD",
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
    cost_amount: 6000,
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
  cost_amount: null,
  cost_currency: "JPY",
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

const docs = [
  {
    category: "rail",
    title: "JR Pass · 14 day, green car",
    detail: "Activate at Haneda on arrival. Exchange order is in the folder.",
    confirmation: "JRP-993201",
    cost_amount: 80000,
    position: 1,
  },
  {
    category: "luggage",
    title: "Takuhaibin · Tokyo → Kyoto",
    detail:
      "Ship the big case ahead the morning of the 12th so the shinkansen is a daypack only.",
    cost_amount: 2500,
    position: 1,
  },
  {
    category: "connectivity",
    title: "Ubigi eSIM · 20GB",
    detail: "Install before leaving — it needs wifi to activate.",
    position: 1,
  },
];
{
  const { error } = await db
    .from("trip_docs")
    .insert(
      docs.map((d) => ({ cost_amount: null, cost_currency: "JPY", ...d })),
    );
  if (error) throw error;
}
// Flights: there via Los Angeles, home via Seattle. Times are written with the
// airport's own UTC offset, the way a confirmation email means them.
const FLIGHT_DEFAULTS = {
  from_city: null,
  to_city: null,
  cabin: null,
  aircraft: null,
  confirmation: null,
  seat_aaron: null,
  seat_savea: null,
  departure_terminal: null,
  departure_gate: null,
  arrival_terminal: null,
  baggage: null,
  meal: null,
  checkin_url: null,
  status_url: null,
  notes: null,
  cost_amount: null,
  cost_currency: "USD",
};
const flights = [
  {
    airline: "Delta",
    flight_number: "DL1422",
    from_airport: "SLC",
    departs_at: "2026-12-04T08:00:00-07:00",
    departs_tz: "America/Denver",
    to_airport: "LAX",
    arrives_at: "2026-12-04T09:10:00-08:00",
    arrives_tz: "America/Los_Angeles",
    cabin: "economy",
    confirmation: "GKQ4TZ",
    seat_aaron: "14A",
    seat_savea: "14B",
    departure_terminal: "Terminal 1",
    baggage: "2 checked each, 23kg",
  },
  {
    airline: "Delta",
    flight_number: "DL7",
    from_airport: "LAX",
    departs_at: "2026-12-04T11:05:00-08:00",
    departs_tz: "America/Los_Angeles",
    to_airport: "HND",
    arrives_at: "2026-12-05T16:40:00+09:00",
    arrives_tz: "Asia/Tokyo",
    cabin: "premium",
    aircraft: "A350-900",
    confirmation: "GKQ4TZ",
    seat_aaron: "22A",
    seat_savea: "22B",
    departure_terminal: "Tom Bradley",
    arrival_terminal: "Terminal 3",
    baggage: "2 checked each, 23kg",
    meal: "Lunch and a snack before landing",
    // The whole round trip, quoted in dollars — stored in cents.
    cost_amount: 219400,
  },
  {
    airline: "Delta",
    flight_number: "DL166",
    from_airport: "HND",
    departs_at: "2026-12-26T17:00:00+09:00",
    departs_tz: "Asia/Tokyo",
    to_airport: "SEA",
    arrives_at: "2026-12-26T09:50:00-08:00",
    arrives_tz: "America/Los_Angeles",
    cabin: "premium",
    confirmation: "GKQ4TZ",
    seat_aaron: "21A",
    seat_savea: "21B",
    departure_terminal: "Terminal 3",
  },
  {
    airline: "Delta",
    flight_number: "DL2291",
    from_airport: "SEA",
    departs_at: "2026-12-26T13:00:00-08:00",
    departs_tz: "America/Los_Angeles",
    to_airport: "SLC",
    arrives_at: "2026-12-26T16:05:00-07:00",
    arrives_tz: "America/Denver",
    cabin: "economy",
    confirmation: "GKQ4TZ",
  },
].map((f) => ({ ...FLIGHT_DEFAULTS, ...f }));

const { data: savedFlights, error: flightError } = await db
  .from("trip_flights")
  .insert(flights)
  .select("id, flight_number");
if (flightError) throw flightError;

const firstOut = savedFlights.find((f) => f.flight_number === "DL1422");
const firstHome = savedFlights.find((f) => f.flight_number === "DL166");
const { error: listError } = await db.from("trip_checklist_items").insert(
  [
    ["flight:" + firstOut.id, "Passports (both)", "savea", true],
    [
      "flight:" + firstOut.id,
      "Visit Japan Web QR codes, screenshotted",
      "aaron",
      false,
    ],
    ["flight:" + firstOut.id, "JR Pass exchange orders", "savea", false],
    ["flight:" + firstOut.id, "eSIM installed before leaving", null, false],
    ["flight:" + firstHome.id, "Passports (both)", "savea", false],
    ["flight:" + firstHome.id, "Tax-free receipts for customs", "aaron", false],
  ].map(([list, label, owner, done], i) => ({
    list,
    label,
    owner,
    done,
    position: i + 1,
  })),
);
if (listError) throw listError;

console.log("Honeymoon board seeded with the sample Japan trip.");
