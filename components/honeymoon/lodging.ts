import {
  byCheckIn,
  nightCount,
  routeDuring,
  sleepsOn,
  staysIn,
  type Night,
} from "./stays";
import { LANES, addDays, compare, costInYen, daysBetween } from "./trip";
import type {
  Lane,
  Planner,
  ProposedRoute,
  Rate,
  StayProposal,
  TripLeg,
  TripStay,
} from "./types";

/**
 * The Lodging tab's one list: every night of the trip in order, as the stays
 * that cover them and the stretches nothing covers.
 *
 * The tab used to draw the same hotels three times under the strip — the next
 * stay as a hero, every suggestion again under "Still deciding", every decided
 * stay again under "Where you're sleeping" — and that last list stepped from
 * one booking to the next without ever mentioning the nights between them.
 * Here a gap is a block like any other, and the options for it sit inside it.
 */

/* ---------------------------------------------------------------- blocks -- */

export type BlockKind = "stay" | "gap" | "plane";

/**
 * A run of nights with the same answer. Dates are a stay's dates — first night
 * to the morning you leave — so anything that formats a stay formats a block.
 */
export type NightBlock = {
  kind: BlockKind;
  check_in_on: string;
  check_out_on: string;
  nights: number;
  /** The bed, when there is one. */
  stay: TripStay | null;
  /** The suggestions and finder rows for these nights, best fit first. */
  options: StayOption[];
};

/* --------------------------------------------------------------- options -- */

/** Who says so. The same hotel over the same nights can have several. */
export type OptionSource =
  | { kind: "lane"; lane: Lane; planner: Planner | null }
  | { kind: "finder"; rank: number; routeId: string };

/**
 * One place, for one run of nights, however many places suggested it. A
 * planner's suggestion and a finder route landing on the same hotel for the
 * same nights is one line that says both, not two lines to compare.
 */
export type StayOption = {
  /** The anchor the strip's bars link to. */
  id: string;
  name: string;
  nameJa: string | null;
  city: string | null;
  check_in_on: string;
  check_out_on: string;
  nights: number;
  /** Everything in yen, so options from either side compare. */
  yen: number | null;
  perNightYen: number | null;
  url: string | null;
  notes: string | null;
  /** The row in `trip_stays`, when a person suggested it. Only these adopt. */
  stay: TripStay | null;
  /** The finder's row, when the finder proposed it. Only these get sent. */
  proposal: StayProposal | null;
  sources: OptionSource[];
};

function optionKey(name: string, from: string, to: string): string {
  return `${name.trim().toLowerCase()}|${from}|${to}`;
}

function fromStay(stay: TripStay, rate: Rate): StayOption {
  const yen = stay.cost_amount === null ? null : costInYen(stay, rate);
  const nights = nightCount(stay);
  return {
    id: `option-${stay.id}`,
    name: stay.name,
    nameJa: stay.name_ja,
    city: stay.city,
    check_in_on: stay.check_in_on,
    check_out_on: stay.check_out_on,
    nights,
    yen,
    perNightYen: yen === null ? null : Math.round(yen / nights),
    url: stay.url,
    notes: stay.notes,
    stay,
    proposal: null,
    sources: [
      { kind: "lane", lane: stay.lane, planner: LANES[stay.lane].planner },
    ],
  };
}

function fromProposal(
  proposal: StayProposal,
  rank: number,
  routeId: string,
): StayOption {
  const nights = daysBetween(proposal.check_in_on, proposal.check_out_on);
  return {
    id: `finder-${proposal.id}`,
    name: proposal.place_name,
    nameJa: proposal.name_ja ?? proposal.name,
    // The finder searches a place, so the place is the city it knows.
    city: null,
    check_in_on: proposal.check_in_on,
    check_out_on: proposal.check_out_on,
    nights,
    yen: proposal.cost_yen,
    perNightYen:
      proposal.per_night_yen ??
      (proposal.cost_yen === null ? null : Math.round(proposal.cost_yen / nights)),
    url: proposal.url,
    notes: null,
    stay: null,
    proposal,
    sources: [{ kind: "finder", rank, routeId }],
  };
}

/**
 * Every suggestion anyone has made for these nights, merged. A person's
 * suggestion wins the identity — it is the one that can be adopted — and the
 * finder's agreement becomes another source on the same line.
 */
export function stayOptions(
  stays: TripStay[],
  routes: ProposedRoute[],
  rate: Rate,
): StayOption[] {
  const merged = new Map<string, StayOption>();

  const add = (option: StayOption) => {
    const key = optionKey(option.name, option.check_in_on, option.check_out_on);
    const found = merged.get(key);
    if (!found) {
      merged.set(key, option);
      return;
    }
    found.sources.push(...option.sources);
    // Keep whichever side can be acted on, and take what the other knows.
    if (!found.stay && option.stay) {
      merged.set(key, {
        ...option,
        proposal: found.proposal,
        sources: [...found.sources],
      });
      return;
    }
    found.proposal ??= option.proposal;
    found.nameJa ??= option.nameJa;
    found.url ??= option.url;
    found.yen ??= option.yen;
    found.perNightYen ??= option.perNightYen;
  };

  for (const stay of stays.filter((s) => s.lane !== "decided").sort(byCheckIn)) {
    add(fromStay(stay, rate));
  }
  routes.forEach((route, index) => {
    for (const proposal of route.stays) {
      const key = optionKey(
        proposal.place_name,
        proposal.check_in_on,
        proposal.check_out_on,
      );
      // A route agreeing with the bed you already have is not an option, it is
      // a compliment. The strip says "same" across those nights; the list says
      // nothing. Unless a person suggested it too, in which case it is their
      // line and the finder is another voice on it.
      if (!merged.has(key) && agreesWithDecided(proposal, stays)) continue;
      add(fromProposal(proposal, index + 1, route.id));
    }
  });

  return [...merged.values()];
}

/* ----------------------------------------------------------------- plan -- */

/**
 * The nights, blocked up, with each option filed under the stretch it mostly
 * covers. An option sits in exactly one block: a place suggested for four
 * nights that spill past a gap is still one question, and answering it twice
 * is how the old tab ended up drawing everything three times.
 */
export function planNights(
  nights: Night[],
  stays: TripStay[],
  routes: ProposedRoute[],
  rate: Rate,
): NightBlock[] {
  const blocks: NightBlock[] = [];
  for (const night of nights) {
    const kind: BlockKind = night.stay ? "stay" : night.onPlane ? "plane" : "gap";
    const last = blocks.at(-1);
    if (
      last &&
      last.kind === kind &&
      last.stay?.id === (night.stay?.id ?? undefined) &&
      last.check_out_on === night.date
    ) {
      last.check_out_on = addDays(night.date, 1);
      last.nights += 1;
      continue;
    }
    blocks.push({
      kind,
      check_in_on: night.date,
      check_out_on: addDays(night.date, 1),
      nights: 1,
      stay: night.stay,
      options: [],
    });
  }

  for (const option of stayOptions(stays, routes, rate)) {
    const best = blocks.reduce<{ block: NightBlock; nights: number } | null>(
      (winner, block) => {
        const overlap = Math.max(
          0,
          daysBetween(
            max(block.check_in_on, option.check_in_on),
            min(block.check_out_on, option.check_out_on),
          ),
        );
        // A gap wins a tie: an alternative to a booking is worth less than an
        // answer to a night with nothing in it.
        const better =
          !winner ||
          overlap > winner.nights ||
          (overlap === winner.nights &&
            block.kind === "gap" &&
            winner.block.kind !== "gap");
        return overlap > 0 && better ? { block, nights: overlap } : winner;
      },
      null,
    );
    best?.block.options.push(option);
  }

  for (const block of blocks) block.options.sort(byFit(block));
  return blocks;
}

const min = (a: string, b: string) => (a < b ? a : b);
const max = (a: string, b: string) => (a > b ? a : b);

/** Covers the most of the block first, then the cheapest night. */
function byFit(block: NightBlock) {
  const covers = (option: StayOption) =>
    daysBetween(
      max(block.check_in_on, option.check_in_on),
      min(block.check_out_on, option.check_out_on),
    );
  return (a: StayOption, b: StayOption) =>
    covers(b) - covers(a) ||
    (a.perNightYen ?? Infinity) - (b.perNightYen ?? Infinity) ||
    compare(a.name, b.name) ||
    compare(a.id, b.id);
}

/** How much of a block an option is an answer for. */
export function coversOf(block: NightBlock, option: StayOption): number {
  return Math.max(
    0,
    daysBetween(
      max(block.check_in_on, option.check_in_on),
      min(block.check_out_on, option.check_out_on),
    ),
  );
}

/**
 * "in Kyoto, the route says Osaka" — an option somewhere the agreed route
 * isn't. Silent when the option has no city, or when it matches.
 */
export function offRoute(option: StayOption, legs: TripLeg[]): string | null {
  if (!option.city) return null;
  const route = routeDuring(option, legs);
  if (route.length === 0 || route.some((name) => name.includes(option.city!)))
    return null;
  return `in ${option.city}, the route says ${route.join(" then ")}`;
}

/* --------------------------------------------------------------- finder -- */

/**
 * A finder row the Decided plan already agrees with: every night it covers is
 * spent in a place of that name. Those stretches are drawn as "same" on the
 * strip — a route is only worth reading where it differs.
 */
export function agreesWithDecided(
  proposal: StayProposal,
  stays: TripStay[],
): boolean {
  const decided = staysIn(stays, "decided");
  const same = (night: string) => {
    const bed = decided.find((s) => sleepsOn(s, night));
    return (
      bed !== undefined &&
      bed.name.trim().toLowerCase() === proposal.place_name.trim().toLowerCase()
    );
  };
  for (
    let night = proposal.check_in_on;
    night < proposal.check_out_on;
    night = addDays(night, 1)
  ) {
    if (!same(night)) return false;
  }
  return true;
}

/** "cheapest", then the rank. The finder publishes cheapest first. */
export function routeRank(index: number): string {
  return index === 0 ? "cheapest" : `${index + 1}${ordinal(index + 1)}`;
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return "th";
  return ["th", "st", "nd", "rd"][n % 10] ?? "th";
}

/* ----------------------------------------------------------------- words -- */

/**
 * Which part of a block an option answers for. Nothing to say when it covers
 * the lot — the dates are already on the block.
 */
export function coverageNote(
  block: NightBlock,
  option: StayOption,
): string | null {
  const covers = coversOf(block, option);
  if (covers >= block.nights) return null;
  const nights = `${covers} ${covers === 1 ? "night" : "nights"}`;
  if (option.check_out_on >= block.check_out_on) return `the last ${nights}`;
  if (option.check_in_on <= block.check_in_on) return `the first ${nights}`;
  return `${covers} of the ${block.nights} nights`;
}

/** "Aaron", "Savea and Aaron", "Aaron, and the finder's cheapest route". */
export function sourceLabel(
  option: StayOption,
  planners: Record<string, { label: string }>,
): string {
  const people = option.sources
    .filter((s) => s.kind === "lane")
    .map((s) => (s.planner ? planners[s.planner].label : LANES[s.lane].label));
  const ranks = option.sources
    .filter((s) => s.kind === "finder")
    .map((s) => routeRank(s.rank - 1));
  const finder = ranks.length
    ? `the finder's ${join(ranks)} ${ranks.length === 1 ? "route" : "routes"}`
    : null;
  if (people.length === 0) return finder ?? "";
  // The comma is the difference between two people and a person plus a
  // machine that happened to agree with them.
  return finder ? `${join(people)}, and ${finder}` : join(people);
}

function join(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

/** Where each finder row's bar on the strip should link to in the list. */
export function anchorsForRoutes(
  blocks: NightBlock[],
  routes: ProposedRoute[],
): Map<string, string> {
  const byKey = new Map<string, string>();
  for (const block of blocks) {
    for (const option of block.options) {
      byKey.set(
        optionKey(option.name, option.check_in_on, option.check_out_on),
        option.id,
      );
    }
  }
  const out = new Map<string, string>();
  for (const route of routes) {
    for (const proposal of route.stays) {
      const anchor = byKey.get(
        optionKey(proposal.place_name, proposal.check_in_on, proposal.check_out_on),
      );
      if (anchor) out.set(proposal.id, anchor);
    }
  }
  return out;
}
