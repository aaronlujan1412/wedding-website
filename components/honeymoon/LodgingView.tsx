"use client";

import { useState, useTransition } from "react";
import {
  ArrowUp,
  BedDouble,
  Check,
  ChevronDown,
  Compass,
  ExternalLink,
  MapPin,
  Pencil,
  Phone,
  Plane,
  Plus,
  Send,
  TriangleAlert,
  X,
} from "lucide-react";
import { sendRouteToLane, sendStayToLane } from "@/app/actions/finder";
import { adoptStay } from "@/app/actions/stays";
import { cn } from "@/lib/utils";
import { Checklist } from "./Checklist";
import { ConfirmDialog, type ConfirmRequest } from "./ConfirmDialog";
import { CopyCode, Fact, Missing } from "./Facts";
import { countdown, formatDateIn, utcToZoned } from "./flights";
import {
  anchorsForRoutes,
  coverageNote,
  offRoute,
  planNights,
  routeRank,
  sourceLabel,
  type NightBlock,
  type StayOption,
} from "./lodging";
import { NightsStrip } from "./NightsStrip";
import { RateProvider } from "./RateContext";
import { Seal, StatusLabel } from "./Seal";
import { StayDialog, type StayDraft } from "./StayDialog";
import {
  STAY_TZ,
  USUAL_CHECK_IN,
  USUAL_CHECK_OUT,
  bagsFor,
  cancelDeadline,
  cancelIsClose,
  checkInAt,
  checkOutAt,
  currentStay,
  deskCashYen,
  formatNights,
  formatStayDates,
  isStayAdopted,
  mealLine,
  mealsOf,
  nightCount,
  perNightYen,
  stayAdoptEffect,
  stayChecklistKey,
  staysIn,
  stripNights,
  suggestedForStay,
  tripNights,
} from "./stays";
import {
  LANES,
  PLANNERS,
  daysBetween,
  formatCost,
  formatCostConverted,
  formatYen,
  sumYen,
  yenAsUsd,
} from "./trip";
import { useLiveRefresh } from "./useLiveRefresh";
import { useNow } from "./useNow";
import type {
  ChecklistItem,
  Lane,
  Planner,
  ProposedRoute,
  Rate,
  StayProposal,
  TripFlight,
  TripLeg,
  TripStay,
} from "./types";

const TATTOO_LABEL = { true: "Tattoos allowed", false: "No tattoos" } as const;

/** Lanes a finder proposal can be sent to: somebody's, never Decided. */
const TARGET_LANES: Lane[] = ["savea", "aaron"];

/** How many finder routes the strip draws before it stops being a strip. */
const STRIP_ROUTES = 3;

/**
 * The Lodging tab: the nights across the top, and the same nights as a list.
 *
 * The strip is where you compare — the agreed beds, each planner's ideas and
 * the finder's routes over the same columns — and the list is where you act.
 * Nothing is drawn as a hero and again as a row: a stay opens where it sits,
 * and a stretch with no bed is a block in the list like any other, with the
 * options for it inside it.
 */
export function LodgingView({
  stays,
  legs,
  flights,
  checklist,
  routes,
  rate,
  renderedAt,
}: {
  stays: TripStay[];
  legs: TripLeg[];
  flights: TripFlight[];
  checklist: ChecklistItem[];
  /** The lodging finder's published routes, cheapest first. */
  routes: ProposedRoute[];
  rate: Rate;
  renderedAt: number;
}) {
  const [draft, setDraft] = useState<StayDraft | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [notice, setNotice] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);
  /** Which stays have been opened or closed by hand, over the default. */
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const [busy, startTransition] = useTransition();
  useLiveRefresh(draft !== null || confirm !== null || busy);
  const now = useNow(renderedAt);

  const decided = staysIn(stays, "decided");
  const nights = tripNights(legs, stays, flights);
  const proposed = routes.flatMap((r) => r.stays);
  const columns = stripNights(legs, stays, proposed);
  const blocks = planNights(nights, stays, routes, rate);
  const anchors = anchorsForRoutes(blocks, routes);
  const current = currentStay(stays, now);
  const tonight = utcToZoned(new Date(now).toISOString(), STAY_TZ).date;
  const itemsFor = (stay: TripStay) =>
    checklist.filter((i) => i.list === stayChecklistKey(stay));

  const create = (lane: Lane, from?: string, to?: string) =>
    setDraft({ stay: null, lane, from, to });

  /**
   * Using a suggestion. If Decided has nothing on those nights it just
   * happens; if it would replace or shorten a stay, say which first — that's
   * a booking someone may already have made.
   */
  function requestAdopt(stay: TripStay) {
    const run = () =>
      startTransition(async () => {
        const result = await adoptStay(stay.id);
        setNotice(
          result.error
            ? { tone: "error", text: result.error }
            : {
                tone: "ok",
                text: `${stay.name} is in Decided for ${formatStayDates(stay)}.`,
              },
        );
      });

    const { replaced, shortened } = stayAdoptEffect(stay, stays);
    if (replaced.length === 0 && shortened.length === 0) return run();

    const describe = (s: TripStay) =>
      `${s.name} (${formatStayDates(s)})${s.booking_status === "booked" ? ", which is booked" : ""}`;

    setConfirm({
      title: `Sleep at ${stay.name}?`,
      confirmLabel: "Use it",
      onConfirm: run,
      body: (
        <>
          <p>
            Decided gets {stay.name} for {formatStayDates(stay)}.
          </p>
          {replaced.length > 0 && (
            <p>
              <strong>Replaces</strong> {replaced.map(describe).join(", ")}. Its
              checklist moves across.
            </p>
          )}
          {shortened.length > 0 && (
            <p>
              <strong>Shortens</strong> {shortened.map(describe).join(", ")}.
            </p>
          )}
          {[...replaced, ...shortened].some(
            (s) => s.booking_status === "booked",
          ) && (
            <p className="text-muted-foreground">
              This only changes the plan. Cancel the booking with the hotel
              yourself.
            </p>
          )}
        </>
      ),
    });
  }

  /** A finder row never lands in Decided — it becomes somebody's idea first. */
  function send(
    run: () => Promise<{ error: string | null }>,
    text: string,
  ) {
    startTransition(async () => {
      const { error } = await run();
      setNotice(error ? { tone: "error", text: error } : { tone: "ok", text });
    });
  }

  const open = nights.filter((n) => !n.stay && !n.onPlane).length;
  const spend = sumYen(decided, rate);

  const actions: BlockActions = {
    busy,
    onEdit: (stay) => setDraft({ stay, lane: stay.lane }),
    onAdopt: requestAdopt,
    onAdd: create,
    onSendStay: (proposal, lane, planner) =>
      send(
        () => sendStayToLane(proposal.id, lane, planner),
        `${proposal.place_name} is in ${PLANNERS[planner].label}'s ideas.`,
      ),
    onToggle: (stay, next) =>
      setOpened((was) => ({ ...was, [stay.id]: next })),
  };

  return (
    <RateProvider rate={rate}>
      <main className="mx-auto mt-10 max-w-6xl">
        {notice && (
          <p
            role={notice.tone === "error" ? "alert" : "status"}
            className={cn(
              "mb-6 flex items-center justify-between gap-3 rounded-md border px-3 py-2 font-raleway text-sm",
              notice.tone === "error"
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-primary/30 bg-primary/5 text-primary",
            )}
          >
            {notice.text}
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Dismiss"
              className="rounded-sm opacity-70 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-ring"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </p>
        )}

        {columns.length === 0 ? (
          <EmptyLodging onAdd={() => create("decided")} />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <div>
                <h2 className="font-garamond text-3xl text-foreground">
                  Lodging
                </h2>
                <p className="mt-1 font-garamond text-lg leading-snug text-muted-foreground">
                  <Answer
                    nights={nights.length}
                    open={open}
                    decided={decided}
                    now={now}
                  />
                </p>
              </div>
              <div className="flex items-baseline gap-5">
                {spend > 0 && (
                  <p className="font-mono text-xs text-muted-foreground tabular-nums slashed-zero">
                    {formatYen(spend)} / {yenAsUsd(spend, rate)} on beds
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => create("decided")}
                  className="flex items-center gap-1 rounded-sm font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Plus className="h-3 w-3" strokeWidth={2} />
                  Add a stay
                </button>
              </div>
            </div>

            <NightsStrip
              columns={columns}
              nights={nights}
              legs={legs}
              stays={stays}
              routes={routes.slice(0, STRIP_ROUTES)}
              anchors={anchors}
              tonight={tonight}
              onCreate={create}
            />

            <ol className="mt-10 space-y-8">
              {blocks.map((block) => (
                <Block
                  key={block.check_in_on}
                  block={block}
                  legs={legs}
                  stays={stays}
                  items={block.stay ? itemsFor(block.stay) : []}
                  rate={rate}
                  now={now}
                  // Both sides go undefined on a gap block once nothing is
                  // current — and `undefined === undefined` is true, so every
                  // night with no bed announced itself as the stay you are
                  // about to check into. The block has to have a stay before
                  // the ids are worth comparing.
                  current={
                    block.stay !== null && current?.stay.id === block.stay.id
                  }
                  tonight={current?.tonight === true}
                  expanded={
                    block.stay
                      ? (opened[block.stay.id] ??
                        current?.stay.id === block.stay.id)
                      : false
                  }
                  actions={actions}
                />
              ))}
            </ol>

            <FinderFoot
              routes={routes}
              busy={busy}
              onSendRoute={(route, lane, planner) =>
                send(
                  () => sendRouteToLane(route.id, lane, planner),
                  `${route.stays.length} stays are in ${PLANNERS[planner].label}'s ideas.`,
                )
              }
            />
          </>
        )}

        <StayDialog
          draft={draft}
          onClose={() => setDraft(null)}
          onAdopt={requestAdopt}
        />
        <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
      </main>
    </RateProvider>
  );
}

/**
 * The one line under the tab's name: the nights with no bed, and then whatever
 * is next most wrong — a cancellation about to lapse, or a bed nobody has
 * booked. Never more than two things; the list says the rest.
 */
function Answer({
  nights,
  open,
  decided,
  now,
}: {
  nights: number;
  open: number;
  decided: TripStay[];
  now: number;
}) {
  const closing = decided.find((s) => cancelIsClose(s, now));
  const unbooked = decided.filter(
    (s) => s.booking_status === "idea" || s.booking_status === "to_book",
  );

  if (nights === 0) return <>No agreed route yet, so no nights to fill.</>;

  return (
    <>
      {open === 0 ? (
        <>
          <span className="text-ready">All {nights} nights</span> have a bed
        </>
      ) : (
        <>
          <span className="text-pending">
            {open} of {nights} nights
          </span>{" "}
          still need a bed
        </>
      )}
      {closing ? (
        <>
          , and {closing.name} stops being refundable{" "}
          {countdown(cancelDeadline(closing)!, now)}.
        </>
      ) : unbooked.length > 0 ? (
        <>
          , and {unbooked.map((s) => s.name).join(", ")}{" "}
          {unbooked.length === 1 ? "isn't" : "aren't"} booked yet.
        </>
      ) : (
        "."
      )}
    </>
  );
}

/* ---------------------------------------------------------------- blocks -- */

type BlockActions = {
  busy: boolean;
  onEdit: (stay: TripStay) => void;
  onAdopt: (stay: TripStay) => void;
  onAdd: (lane: Lane, from: string, to: string) => void;
  onSendStay: (proposal: StayProposal, lane: Lane, planner: Planner) => void;
  onToggle: (stay: TripStay, next: boolean) => void;
};

/**
 * One stretch of nights: the bed, the gap or the aeroplane, with the options
 * anyone has for those nights under it.
 */
function Block({
  block,
  legs,
  stays,
  items,
  rate,
  now,
  current,
  tonight,
  expanded,
  actions,
}: {
  block: NightBlock;
  legs: TripLeg[];
  stays: TripStay[];
  items: ChecklistItem[];
  rate: Rate;
  now: number;
  current: boolean;
  tonight: boolean;
  expanded: boolean;
  actions: BlockActions;
}) {
  const done =
    block.kind === "stay" &&
    block.stay !== null &&
    new Date(checkOutAt(block.stay)).getTime() < now;

  // Read off the stay rather than off the flag. `current` should only ever be
  // true for a block that has one, but this used to assert that with a `!`,
  // so the moment it wasn't the whole tab went white instead of quietly
  // dropping one label.
  const mark =
    current && block.stay
      ? tonight
        ? `tonight, night ${daysBetween(block.check_in_on, utcToZoned(new Date(now).toISOString(), STAY_TZ).date) + 1} of ${block.nights}`
        : `next · ${countdown(checkInAt(block.stay), now)}`
      : done
        ? "done"
        : null;

  return (
    <li
      id={block.stay ? `stay-${block.stay.id}` : undefined}
      className={cn(
        "scroll-mt-[calc(var(--spacing-planner-bar)+1.5rem)]",
        done && "opacity-60",
      )}
    >
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-[9rem_1fr]">
        <div className="sm:pt-1">
          <p className="font-mono text-sm text-foreground tabular-nums slashed-zero">
            {formatStayDates(block)}
          </p>
          <p className="font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
            {formatNights(block.nights)}
            {mark && ` · ${mark}`}
          </p>
        </div>

        <div className="min-w-0">
          {block.kind === "stay" && block.stay && (
            <StayCard
              stay={block.stay}
              stays={stays}
              items={items}
              rate={rate}
              now={now}
              current={current}
              tonight={tonight}
              done={done}
              expanded={expanded}
              actions={actions}
            />
          )}
          {block.kind === "gap" && <Gap block={block} legs={legs} />}
          {block.kind === "plane" && (
            <p className="flex items-center gap-2 py-2 font-garamond text-lg text-muted-foreground">
              <Plane className="h-4 w-4 flex-none" strokeWidth={1.5} />
              In the air. No bed needed.
            </p>
          )}

          {block.options.length > 0 && (
            <ul className="mt-3 space-y-2">
              {block.options.map((option) => (
                <Option
                  key={option.id}
                  option={option}
                  block={block}
                  legs={legs}
                  stays={stays}
                  actions={actions}
                />
              ))}
            </ul>
          )}

          {block.kind === "gap" && (
            <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
              {(["savea", "aaron"] as const).map((lane) => (
                <button
                  key={lane}
                  type="button"
                  onClick={() =>
                    actions.onAdd(lane, block.check_in_on, block.check_out_on)
                  }
                  className="flex items-center gap-1 rounded-sm font-raleway text-[0.65rem] font-semibold uppercase tracking-[0.15em] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  style={{ color: LANES[lane].accent }}
                >
                  <Plus className="h-3 w-3" strokeWidth={2} />
                  {PLANNERS[lane === "savea" ? "savea" : "aaron"].label} suggests
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  actions.onAdd("decided", block.check_in_on, block.check_out_on)
                }
                className="flex items-center gap-1 rounded-sm font-raleway text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <BedDouble className="h-3 w-3" strokeWidth={1.75} />
                We booked one
              </button>
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

/** The tab's one loud thing, in the list: nights nothing sleeps in. */
function Gap({ block, legs }: { block: NightBlock; legs: TripLeg[] }) {
  const where = offRouteCities(block, legs);
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-dashed border-pending bg-pending/5 px-5 py-4 font-garamond text-lg text-pending">
      <BedDouble className="h-4 w-4 flex-none" strokeWidth={1.75} />
      No bed yet
      {where && (
        <span className="font-raleway text-xs uppercase tracking-[0.2em]">
          {where}
        </span>
      )}
    </p>
  );
}

function offRouteCities(block: NightBlock, legs: TripLeg[]): string | null {
  const names = legs
    .filter(
      (l) =>
        l.lane === "decided" &&
        l.starts_on < block.check_out_on &&
        l.ends_on >= block.check_in_on,
    )
    .map((l) => l.name);
  return names.length ? [...new Set(names)].join(" then ") : null;
}

/* ------------------------------------------------------------- a stay -- */

function StayCard({
  stay,
  stays,
  items,
  rate,
  now,
  current,
  tonight,
  done,
  expanded,
  actions,
}: {
  stay: TripStay;
  stays: TripStay[];
  items: ChecklistItem[];
  rate: Rate;
  now: number;
  current: boolean;
  tonight: boolean;
  done: boolean;
  expanded: boolean;
  actions: BlockActions;
}) {
  const bags = bagsFor(stay, stays);
  const deadline = cancelDeadline(stay);
  const closing = cancelIsClose(stay, now);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-start gap-3 px-5 pt-4 pb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-garamond text-2xl leading-tight text-foreground">
            {stay.name}
            {stay.name_ja && (
              <span className="ml-2 inline-block font-jp text-base text-muted-foreground">
                {stay.name_ja}
              </span>
            )}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-raleway text-xs text-muted-foreground">
            {stay.city && <span>{stay.city}</span>}
            <StatusLabel
              status={stay.booking_status}
              className="font-raleway text-[0.6rem] font-semibold"
            />
            {stay.confirmation && <CopyCode code={stay.confirmation} size="sm" />}
            {stay.cost_amount !== null && (
              <span
                className="font-mono tabular-nums slashed-zero"
                title={formatCostConverted(stay, rate)}
              >
                {formatCost(stay)}
              </span>
            )}
          </p>
        </div>
        <Seal status={stay.booking_status} size="sm" animate={current} />
      </div>

      {(closing || stay.payment === "at_desk" || bags.outgoing) && (
        <p className="flex flex-wrap gap-x-4 gap-y-1 px-5 pb-3 font-garamond text-sm">
          {closing && deadline && (
            <span className="text-pending">
              <TriangleAlert
                className="mr-1 inline h-3.5 w-3.5 -translate-y-px"
                strokeWidth={1.75}
              />
              Free cancellation ends {countdown(deadline, now)}, on{" "}
              {formatDateIn(deadline, STAY_TZ)}
            </span>
          )}
          {stay.payment === "at_desk" && (
            <span className="text-muted-foreground">
              Pay at the desk
              {deskCashYen(stay) > 0 &&
                `, ${formatYen(deskCashYen(stay))} in cash`}
            </span>
          )}
          {bags.outgoing && (
            <span className="text-muted-foreground">
              Bags go ahead
              {bags.outgoing.to && ` to ${bags.outgoing.to.name}`}
            </span>
          )}
        </p>
      )}

      {expanded && (
        <Details
          stay={stay}
          stays={stays}
          items={items}
          rate={rate}
          now={now}
          current={current}
          tonight={tonight}
          done={done}
          onEdit={() => actions.onEdit(stay)}
        />
      )}

      <div className="flex items-center justify-end gap-5 px-5 pt-1 pb-2">
        <button
          type="button"
          onClick={() => actions.onToggle(stay, !expanded)}
          aria-expanded={expanded}
          className="flex items-center gap-1 rounded-sm font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ChevronDown
            className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")}
            strokeWidth={2}
          />
          {expanded ? "Less" : "Details"}
        </button>
        <button
          type="button"
          onClick={() => actions.onEdit(stay)}
          className="flex items-center gap-1 rounded-sm font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Pencil className="h-3 w-3" strokeWidth={1.5} />
          Edit
        </button>
      </div>
    </div>
  );
}

/** What a hotel needs from you, and what you need from it at the door. */
function Details({
  stay,
  stays,
  items,
  rate,
  now,
  current,
  tonight,
  done,
  onEdit,
}: {
  stay: TripStay;
  stays: TripStay[];
  items: ChecklistItem[];
  rate: Rate;
  now: number;
  current: boolean;
  tonight: boolean;
  done: boolean;
  onEdit: () => void;
}) {
  const checkIn = checkInAt(stay);
  const checkOut = checkOutAt(stay);
  const deadline = cancelDeadline(stay);
  const bags = bagsFor(stay, stays);
  const meals = mealsOf(stay);
  const onsen = [
    stay.onsen_hours && `Open ${stay.onsen_hours}`,
    stay.tattoos_ok !== null && TATTOO_LABEL[`${stay.tattoos_ok}`],
  ].filter(Boolean);

  return (
    <>
      <dl className="grid gap-px border-y border-border bg-border sm:grid-cols-2">
        <Fact label="Check in">
          <Clock iso={checkIn} time={stay.check_in_time} usual={USUAL_CHECK_IN} />
          {!current && !done && (
            <span className="mt-0.5 block font-garamond text-sm text-muted-foreground">
              {countdown(checkIn, now)}
            </span>
          )}
        </Fact>
        <Fact label="Check out">
          <Clock
            iso={checkOut}
            time={stay.check_out_time}
            usual={USUAL_CHECK_OUT}
          />
          {current && tonight && (
            <span className="mt-0.5 block font-garamond text-sm text-muted-foreground">
              {countdown(checkOut, now)}
            </span>
          )}
        </Fact>

        <Fact label="Show the driver" wide>
          {stay.address_ja || stay.address || stay.phone ? (
            <>
              {stay.address_ja && (
                <span className="block font-jp text-2xl leading-snug">
                  {stay.address_ja}
                </span>
              )}
              {stay.address && (
                <span className="mt-1 block font-garamond text-base text-muted-foreground">
                  {stay.address}
                </span>
              )}
              <span className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
                {stay.phone && (
                  <a
                    href={`tel:${stay.phone.replace(/[^\d+]/g, "")}`}
                    className="inline-flex items-center gap-1.5 font-mono text-lg tabular-nums slashed-zero hover:text-primary"
                  >
                    <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {stay.phone}
                  </a>
                )}
                {stay.map_url && (
                  <a
                    href={stay.map_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-primary underline-offset-4 hover:underline"
                  >
                    <MapPin className="h-3 w-3" strokeWidth={1.5} />
                    Map
                  </a>
                )}
              </span>
              {!stay.address_ja && (
                <span className="mt-2 block">
                  <Missing onAdd={onEdit}>Add the address in Japanese</Missing>
                </span>
              )}
            </>
          ) : (
            <Missing onAdd={onEdit}>
              Add the address in Japanese and the phone number
            </Missing>
          )}
        </Fact>

        <Fact label="Confirmation">
          {stay.confirmation ? (
            <CopyCode code={stay.confirmation} />
          ) : (
            <Missing onAdd={onEdit}>Add the confirmation number</Missing>
          )}
        </Fact>

        <Fact label="Paying">
          <Paying stay={stay} rate={rate} onEdit={onEdit} />
        </Fact>

        {deadline && (
          <Fact label="Free cancellation" wide>
            {new Date(deadline).getTime() > now ? (
              <span
                className={cn(
                  "font-garamond text-lg",
                  cancelIsClose(stay, now) && "text-pending",
                )}
              >
                Until {formatDateIn(deadline, STAY_TZ)} ·{" "}
                {countdown(deadline, now)}
              </span>
            ) : (
              <span className="font-garamond text-lg text-muted-foreground">
                Ended {formatDateIn(deadline, STAY_TZ)}. It&apos;s
                non-refundable now.
              </span>
            )}
          </Fact>
        )}

        {stay.getting_there && (
          <Fact label="Getting there" wide>
            <span className="font-garamond text-lg leading-snug">
              {stay.getting_there}
            </span>
          </Fact>
        )}

        {meals.length > 0 && (
          <Fact label="Meals">
            {/* One line each: breakfast and dinner are two separate plans for
                the day, not one run-on sentence about food. */}
            {meals.map((meal) => (
              <span
                key={meal.kind}
                className="block font-garamond text-lg leading-snug"
              >
                {mealLine(meal)}
              </span>
            ))}
          </Fact>
        )}

        {onsen.length > 0 && (
          <Fact label="Onsen">
            <span className="font-garamond text-lg leading-snug">
              {onsen.join(" · ")}
            </span>
          </Fact>
        )}

        {(bags.outgoing || bags.incoming) && (
          <Fact label="Bags" wide>
            <BagsNote bags={bags} />
          </Fact>
        )}

        {stay.notes && (
          <Fact label="Notes" wide>
            <span className="font-garamond text-lg leading-snug whitespace-pre-line">
              {stay.notes}
            </span>
          </Fact>
        )}
      </dl>

      {!done && (
        <div className="flex flex-wrap items-start gap-x-8 gap-y-6 px-5 py-5">
          <Checklist
            className="min-w-[16rem] flex-1"
            title={tonight && current ? "Before you check out" : "Before you check in"}
            list={stayChecklistKey(stay)}
            items={items}
            // Offered on the stay you're about to walk into, not repeated
            // under every bed on the list.
            suggestions={current ? suggestedForStay(stay) : undefined}
          />
          {stay.url && (
            <a
              href={stay.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-primary underline-offset-4 hover:underline"
            >
              The booking <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
            </a>
          )}
        </div>
      )}
    </>
  );
}

function Clock({
  iso,
  time,
  usual,
}: {
  iso: string;
  time: string | null;
  usual: string;
}) {
  return (
    <>
      <span className="font-mono text-xl tabular-nums slashed-zero">
        {time ? time.slice(0, 5) : usual}
      </span>{" "}
      <span className="font-mono text-xs text-muted-foreground">
        {formatDateIn(iso, STAY_TZ)}
        {!time && " · usually"}
      </span>
    </>
  );
}

function Paying({
  stay,
  rate,
  onEdit,
}: {
  stay: TripStay;
  rate: Rate;
  onEdit: () => void;
}) {
  const perNight = perNightYen(stay, rate);
  const cash = deskCashYen(stay);

  if (stay.cost_amount === null && !stay.payment && !stay.desk_cash_yen) {
    return <Missing onAdd={onEdit}>Add the price</Missing>;
  }

  return (
    <>
      {stay.cost_amount !== null && (
        <span className="block">
          <span className="font-mono text-xl tabular-nums slashed-zero">
            {formatCost(stay)}
          </span>{" "}
          <span className="font-mono text-xs text-muted-foreground tabular-nums slashed-zero">
            {formatCostConverted(stay, rate)}
            {perNight !== null &&
              nightCount(stay) > 1 &&
              ` · ${formatYen(perNight)} a night`}
          </span>
        </span>
      )}
      <span className="mt-0.5 block font-garamond text-base text-muted-foreground">
        {[
          stay.payment === "prepaid" && "Paid ahead",
          stay.payment === "at_desk" && "Pay at the desk",
          cash > 0 && `${formatYen(cash)} in cash at check-in`,
        ]
          .filter(Boolean)
          .join(" · ")}
      </span>
    </>
  );
}

function BagsNote({ bags }: { bags: ReturnType<typeof bagsFor> }) {
  return (
    <span className="block space-y-1 font-garamond text-lg leading-snug">
      {bags.incoming && (
        <span className="block">
          Bags are coming from {bags.incoming.name}.
        </span>
      )}
      {bags.outgoing &&
        (bags.outgoing.to ? (
          <span className="block">
            Send the bags to {bags.outgoing.to.name} at check-out.{" "}
            {bags.outgoing.lateBy > 0
              ? "They arrive the day after you do, so pack an overnight bag."
              : "They'll be there before you."}
          </span>
        ) : (
          <span className="block text-pending">
            Bags go ahead, but there&apos;s no next stay to send them to yet.
          </span>
        ))}
    </span>
  );
}

/* --------------------------------------------------------------- options -- */

/**
 * A place somebody put forward for these nights. A planner's suggestion can be
 * used as it stands; the finder's can only become somebody's idea first, which
 * is the rule in Postgres and not just here.
 */
function Option({
  option,
  block,
  legs,
  stays,
  actions,
}: {
  option: StayOption;
  block: NightBlock;
  legs: TripLeg[];
  stays: TripStay[];
  actions: BlockActions;
}) {
  const lane = option.stay?.lane ?? null;
  const meta = lane ? LANES[lane] : null;
  const adopted = option.stay ? isStayAdopted(option.stay, stays) : false;
  const covers = coverageNote(block, option);
  const elsewhere = offRoute(option, legs);
  const said = sourceLabel(option, PLANNERS);

  return (
    <li
      id={option.id}
      className={cn(
        "scroll-mt-[calc(var(--spacing-planner-bar)+1.5rem)] rounded-lg border px-4 py-3",
        !meta && "border-dotted border-border bg-muted/30",
      )}
      style={
        meta ? { backgroundColor: meta.tint, borderColor: meta.accent } : undefined
      }
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-garamond text-lg leading-tight text-foreground">
          {option.name}
        </p>
        {option.nameJa && (
          <span className="inline-block font-jp text-sm text-muted-foreground">
            {option.nameJa}
          </span>
        )}
        {option.stay && (
          <Seal status={option.stay.booking_status} size="sm" />
        )}
        {option.perNightYen !== null && (
          <span className="ml-auto font-mono text-sm text-foreground tabular-nums slashed-zero">
            {formatYen(option.perNightYen)}
            <span className="text-xs text-muted-foreground"> a night</span>
            {option.yen !== null && option.nights > 1 && (
              <span className="text-xs text-muted-foreground">
                {" "}
                · {formatYen(option.yen)}
              </span>
            )}
          </span>
        )}
      </div>

      <p className="mt-1 font-raleway text-xs text-muted-foreground">
        {[said, covers && `${covers}${block.kind === "stay" ? " instead" : ""}`, elsewhere]
          .filter(Boolean)
          .join(" · ")}
      </p>

      {option.notes && (
        <p className="mt-2 line-clamp-2 font-garamond text-sm leading-snug text-foreground/90">
          {option.notes}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {option.stay ? (
          adopted ? (
            <span className="flex items-center gap-1 font-raleway text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-primary">
              <Check className="h-3.5 w-3.5" strokeWidth={2} />
              In Decided
            </span>
          ) : (
            <button
              type="button"
              onClick={() => actions.onAdopt(option.stay!)}
              className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <ArrowUp className="h-3 w-3" strokeWidth={2} />
              Use this one
            </button>
          )
        ) : (
          <SendTo
            busy={actions.busy}
            label="Send to"
            onPick={(lane, planner) =>
              actions.onSendStay(option.proposal!, lane, planner)
            }
          />
        )}

        {option.url && (
          <a
            href={option.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary"
          >
            See it <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
          </a>
        )}
        {option.stay && (
          <button
            type="button"
            onClick={() => actions.onEdit(option.stay!)}
            className="ml-auto flex items-center gap-1 rounded-sm font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Pencil className="h-3 w-3" strokeWidth={1.5} />
            Edit
          </button>
        )}
      </div>
    </li>
  );
}

/** One button per planner: whose idea it becomes is the only choice to make. */
function SendTo({
  busy,
  label,
  onPick,
}: {
  busy: boolean;
  label: string;
  onPick: (lane: Lane, planner: Planner) => void;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      {TARGET_LANES.map((lane) => {
        const planner = LANES[lane].planner;
        if (!planner) return null;
        return (
          <button
            key={lane}
            type="button"
            disabled={busy}
            onClick={() => onPick(lane, planner)}
            style={{ color: LANES[lane].accent }}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 font-raleway text-[0.65rem] font-semibold uppercase tracking-[0.15em] transition-opacity hover:opacity-80 disabled:opacity-50 pointer-coarse:px-3 pointer-coarse:py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Send className="h-3 w-3" strokeWidth={2} />
            {PLANNERS[planner].label}
          </button>
        );
      })}
    </span>
  );
}

/* ---------------------------------------------------------------- finder -- */

/**
 * The machine's side of the tab, in a footnote. Its routes are already drawn
 * on the strip and its places are already options in the list; what's left is
 * taking a whole route at once, and the caveat on its prices.
 */
function FinderFoot({
  routes,
  busy,
  onSendRoute,
}: {
  routes: ProposedRoute[];
  busy: boolean;
  onSendRoute: (route: ProposedRoute, lane: Lane, planner: Planner) => void;
}) {
  if (routes.length === 0) {
    return (
      <p className="mt-14 flex items-center gap-2 border-t border-border pt-5 font-garamond text-sm text-muted-foreground">
        <Compass className="h-3.5 w-3.5 flex-none" strokeWidth={1.5} />
        The lodging finder sweeps every candidate place each night and works out
        which whole-trip routes are actually bookable. It hasn&apos;t published
        anything yet.
      </p>
    );
  }

  return (
    <section aria-labelledby="the-finder" className="mt-14 border-t border-border pt-5">
      <h2
        id="the-finder"
        className="flex items-center gap-2 font-raleway text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground"
      >
        <Compass className="h-3.5 w-3.5" strokeWidth={1.5} />
        Whole routes from the finder
      </h2>

      <ul className="mt-4 space-y-3">
        {routes.map((route, i) => (
          <li
            key={route.id}
            className="flex flex-wrap items-baseline gap-x-4 gap-y-2"
          >
            <p className="min-w-0 flex-1 font-garamond text-base text-foreground">
              <span className="font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                {routeRank(i)}
              </span>{" "}
              {route.label ?? route.stays.map((s) => s.place_name).join(" → ")}
            </p>
            <p className="font-mono text-sm text-foreground tabular-nums slashed-zero">
              {formatYen(route.lodging_yen + route.travel_yen)}
              <span className="text-xs text-muted-foreground">
                {" "}
                · {route.moves} {route.moves === 1 ? "move" : "moves"}
              </span>
            </p>
            <SendTo
              busy={busy}
              label="Send the lot to"
              onPick={(lane, planner) => onSendRoute(route, lane, planner)}
            />
          </li>
        ))}
      </ul>

      <p className="mt-4 max-w-prose font-garamond text-sm text-muted-foreground">
        Prices are each night&apos;s cheapest plan added up — Rakuten only
        prices the first night of a multi-night search — so these compare
        routes, they don&apos;t book them. Sending one makes ordinary
        suggestions in a lane, which still have to be used from this page.
      </p>
    </section>
  );
}

function EmptyLodging({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-8 py-20 text-center">
      <BedDouble
        className="mx-auto h-8 w-8 text-primary"
        strokeWidth={1.25}
        aria-hidden="true"
      />
      <h2 className="mt-4 font-garamond text-3xl text-foreground">
        No beds yet
      </h2>
      <p className="mx-auto mt-2 max-w-md font-garamond text-lg leading-relaxed text-muted-foreground">
        Add a route on the board and every night of the trip lines up here. Then
        add where you&apos;re staying, or each suggest a few places for the
        nights you haven&apos;t agreed on.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 font-raleway text-[0.7rem] uppercase tracking-[0.2em] text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        Add a stay
      </button>
    </div>
  );
}
