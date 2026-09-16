"use client";

import { useState, useTransition } from "react";
import {
  ArrowUp,
  BedDouble,
  Check,
  ExternalLink,
  MapPin,
  Pencil,
  Phone,
  Plus,
  TriangleAlert,
  X,
} from "lucide-react";
import { adoptStay } from "@/app/actions/stays";
import { cn } from "@/lib/utils";
import { Checklist } from "./Checklist";
import { ConfirmDialog, type ConfirmRequest } from "./ConfirmDialog";
import { CopyCode, Fact, Missing } from "./Facts";
import { countdown, formatDateIn, utcToZoned } from "./flights";
import { NightsStrip } from "./NightsStrip";
import { RateProvider } from "./RateContext";
import { Seal } from "./Seal";
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
  groupSuggestions,
  isStayAdopted,
  nightCount,
  perNightYen,
  routeDuring,
  stayAdoptEffect,
  stayChecklistKey,
  staysIn,
  stripNights,
  suggestedForStay,
  tripNights,
  type StayQuestion,
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
  Rate,
  TripFlight,
  TripLeg,
  TripStay,
} from "./types";

const TATTOO_LABEL = { true: "Tattoos allowed", false: "No tattoos" } as const;

/**
 * The Lodging tab.
 *
 * Months out it's for deciding: every night of the trip in one strip, with
 * each of you able to put a few places side by side for nights you haven't
 * agreed on — often before you've even agreed on the city. On the road it
 * answers the evening's question first: where are we sleeping, and what do we
 * show the taxi driver.
 */
export function LodgingView({
  stays,
  legs,
  flights,
  checklist,
  rate,
  renderedAt,
}: {
  stays: TripStay[];
  legs: TripLeg[];
  flights: TripFlight[];
  checklist: ChecklistItem[];
  rate: Rate;
  renderedAt: number;
}) {
  const [draft, setDraft] = useState<StayDraft | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [notice, setNotice] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);
  const [, startTransition] = useTransition();
  useLiveRefresh(draft !== null || confirm !== null);
  const now = useNow(renderedAt);

  const decided = staysIn(stays, "decided");
  const nights = tripNights(legs, stays, flights);
  const columns = stripNights(legs, stays);
  const questions = groupSuggestions(stays);
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

  const open = nights.filter((n) => !n.stay && !n.onPlane).length;
  const spend = sumYen(decided, rate);

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
            <section aria-labelledby="every-night">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <div>
                  <p className="font-raleway text-[0.65rem] uppercase tracking-[0.25em] text-primary">
                    Every night of the trip
                  </p>
                  <h2
                    id="every-night"
                    className="mt-1 font-garamond text-2xl text-foreground sm:text-3xl"
                  >
                    {nights.length === 0 ? (
                      "No agreed route yet"
                    ) : open === 0 ? (
                      <>
                        <span className="text-ready">
                          All {nights.length} nights
                        </span>{" "}
                        have a bed
                      </>
                    ) : (
                      <>
                        <span className="text-pending">
                          {open} of {nights.length} nights
                        </span>{" "}
                        still need a bed
                      </>
                    )}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => create("decided")}
                  className="flex items-center gap-1 rounded-sm font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Plus className="h-3 w-3" strokeWidth={2} />
                  Add a stay
                </button>
              </div>
              <NightsStrip
                columns={columns}
                nights={nights}
                legs={legs}
                stays={stays}
                tonight={tonight}
                onCreate={create}
              />
              <p className="mt-2 font-garamond text-sm text-muted-foreground italic">
                Nights run from the first day of the Decided route to the night
                before you fly home. A night on a flight doesn&apos;t need a
                bed.
              </p>
            </section>

            {current && (
              <CurrentStay
                stay={current.stay}
                tonight={current.tonight}
                stays={stays}
                items={itemsFor(current.stay)}
                rate={rate}
                now={now}
                onEdit={() =>
                  setDraft({ stay: current.stay, lane: current.stay.lane })
                }
              />
            )}

            {questions.length > 0 && (
              <section aria-labelledby="still-deciding" className="mt-16">
                <div className="border-b border-border pb-3">
                  <p className="font-raleway text-[0.65rem] uppercase tracking-[0.25em] text-primary">
                    Options from both of you
                  </p>
                  <h2
                    id="still-deciding"
                    className="mt-1 font-garamond text-3xl text-foreground"
                  >
                    Still deciding
                  </h2>
                </div>
                <div className="mt-6 space-y-12">
                  {questions.map((question) => (
                    <Question
                      key={question.from}
                      question={question}
                      stays={stays}
                      legs={legs}
                      rate={rate}
                      onEdit={(stay) => setDraft({ stay, lane: stay.lane })}
                      onAdopt={requestAdopt}
                      onAdd={(lane) => create(lane, question.from, question.to)}
                    />
                  ))}
                </div>
              </section>
            )}

            <section aria-labelledby="the-beds" className="mt-16">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-border pb-3">
                <div>
                  <p className="font-raleway text-[0.65rem] uppercase tracking-[0.25em] text-primary">
                    Decided
                  </p>
                  <h2
                    id="the-beds"
                    className="mt-1 font-garamond text-3xl text-foreground"
                  >
                    Where you&apos;re sleeping
                  </h2>
                </div>
                {spend > 0 && (
                  <p className="font-mono text-xs text-muted-foreground tabular-nums slashed-zero">
                    {formatYen(spend)} / {yenAsUsd(spend, rate)} on beds
                  </p>
                )}
              </div>

              {decided.length === 0 ? (
                <p className="mt-6 rounded-lg border border-dashed border-border px-6 py-10 text-center font-garamond text-lg text-muted-foreground">
                  Nothing agreed yet. Use one of the options above, or{" "}
                  <button
                    type="button"
                    onClick={() => create("decided")}
                    className="text-primary underline underline-offset-4"
                  >
                    add a stay you&apos;ve booked
                  </button>
                  .
                </p>
              ) : (
                <ol className="mt-6 space-y-10">
                  {decided.map((stay) => (
                    <StayRow
                      key={stay.id}
                      stay={stay}
                      stays={stays}
                      items={itemsFor(stay)}
                      isCurrent={current?.stay.id === stay.id}
                      rate={rate}
                      now={now}
                      onEdit={() => setDraft({ stay, lane: stay.lane })}
                    />
                  ))}
                </ol>
              )}
            </section>
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

/* ------------------------------------------------------------ this stay -- */

function CurrentStay({
  stay,
  tonight,
  stays,
  items,
  rate,
  now,
  onEdit,
}: {
  stay: TripStay;
  tonight: boolean;
  stays: TripStay[];
  items: ChecklistItem[];
  rate: Rate;
  now: number;
  onEdit: () => void;
}) {
  const nights = nightCount(stay);
  const checkIn = checkInAt(stay);
  const checkOut = checkOutAt(stay);
  const night = tonight
    ? daysBetween(
        stay.check_in_on,
        utcToZoned(new Date(now).toISOString(), STAY_TZ).date,
      ) + 1
    : 0;
  const deadline = cancelDeadline(stay);
  const bags = bagsFor(stay, stays);
  const meals = [
    stay.breakfast_time && `Breakfast ${stay.breakfast_time.slice(0, 5)}`,
    stay.dinner_time && `Dinner ${stay.dinner_time.slice(0, 5)}`,
    stay.onsen_hours && `Onsen ${stay.onsen_hours}`,
    stay.tattoos_ok !== null && TATTOO_LABEL[`${stay.tattoos_ok}`],
  ].filter(Boolean);

  return (
    <section
      aria-labelledby="current-stay"
      className="mt-14 rounded-lg border border-border bg-card"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-border px-5 py-3 sm:px-8">
        <p
          id="current-stay"
          className="font-raleway text-[0.65rem] uppercase tracking-[0.25em] text-primary"
        >
          {tonight
            ? "Tonight"
            : `Next stay · check in ${countdown(checkIn, now)}`}
        </p>
        <p className="font-mono text-[0.65rem] text-muted-foreground tabular-nums slashed-zero">
          {tonight
            ? `Night ${night} of ${nights}`
            : `${formatStayDates(stay)} · ${formatNights(nights)}`}
        </p>
      </div>

      {cancelIsClose(stay, now) && deadline && (
        <p className="flex items-center gap-2 border-b border-pending/30 bg-pending/5 px-5 py-2.5 font-raleway text-sm text-pending sm:px-8">
          <TriangleAlert className="h-4 w-4 flex-none" strokeWidth={1.75} />
          Free cancellation ends {countdown(deadline, now)}, on{" "}
          {formatDateIn(deadline, STAY_TZ)}.
        </p>
      )}

      <div className="flex items-start gap-4 px-5 pt-7 pb-6 sm:px-8">
        <div className="min-w-0 flex-1">
          <h3 className="font-garamond text-4xl leading-tight text-foreground">
            {stay.name}
          </h3>
          {stay.name_ja && (
            <p className="mt-1 font-jp text-xl text-muted-foreground">
              {stay.name_ja}
            </p>
          )}
          <p className="mt-2 flex flex-wrap items-center gap-x-3 font-raleway text-sm text-muted-foreground">
            {stay.city && <span>{stay.city}</span>}
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1 rounded-sm font-raleway text-[0.65rem] uppercase tracking-[0.2em] hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Pencil className="h-3 w-3" strokeWidth={1.5} />
              Edit
            </button>
          </p>
        </div>
        <Seal status={stay.booking_status} animate />
      </div>

      <dl className="grid gap-px border-y border-border bg-border sm:grid-cols-2">
        <Fact label="Check in">
          <Clock
            iso={checkIn}
            time={stay.check_in_time}
            usual={USUAL_CHECK_IN}
          />
          {!tonight && (
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
          {tonight && (
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
          <Fact label="Meals and onsen" wide>
            <span className="font-garamond text-lg leading-snug">
              {meals.join(" · ")}
            </span>
          </Fact>
        )}

        {(bags.outgoing || bags.incoming) && (
          <Fact label="Bags" wide>
            <BagsNote bags={bags} />
          </Fact>
        )}
      </dl>

      <div className="flex flex-wrap items-start gap-x-8 gap-y-6 px-5 py-6 sm:px-8">
        <Checklist
          className="min-w-[16rem] flex-1"
          title={tonight ? "Before you check out" : "Before you check in"}
          list={stayChecklistKey(stay)}
          items={items}
          suggestions={suggestedForStay(stay)}
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
    </section>
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

/* -------------------------------------------------------- still deciding -- */

function Question({
  question,
  stays,
  legs,
  rate,
  onEdit,
  onAdopt,
  onAdd,
}: {
  question: StayQuestion;
  stays: TripStay[];
  legs: TripLeg[];
  rate: Rate;
  onEdit: (stay: TripStay) => void;
  onAdopt: (stay: TripStay) => void;
  onAdd: (lane: Lane) => void;
}) {
  const range = { check_in_on: question.from, check_out_on: question.to };
  const agreed = staysIn(stays, "decided").filter(
    (d) => d.check_in_on < question.to && d.check_out_on > question.from,
  );
  const route = routeDuring(range, legs);

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h3 className="font-mono text-xl text-foreground tabular-nums slashed-zero">
          {formatStayDates(range)}
        </h3>
        <p className="font-raleway text-xs text-muted-foreground">
          {formatNights(daysBetween(question.from, question.to))}
          {route.length > 0 && ` · route says ${route.join(" then ")}`}
        </p>
        <p
          className={cn(
            "font-raleway text-xs",
            agreed.length ? "text-primary" : "text-pending",
          )}
        >
          {agreed.length
            ? `Decided has ${agreed.map((a) => a.name).join(" and ")}`
            : "No bed agreed yet"}
        </p>
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {question.stays.map((stay) => (
          <Option
            key={stay.id}
            stay={stay}
            question={question}
            adopted={isStayAdopted(stay, stays)}
            rate={rate}
            onEdit={() => onEdit(stay)}
            onAdopt={() => onAdopt(stay)}
          />
        ))}
        <li className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-6">
          <span className="font-raleway text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
            Another option
          </span>
          <span className="flex gap-4">
            {(["savea", "aaron"] as const).map((lane) => (
              <button
                key={lane}
                type="button"
                onClick={() => onAdd(lane)}
                className="flex items-center gap-1 rounded-sm font-raleway text-xs font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                style={{ color: LANES[lane].accent }}
              >
                <Plus className="h-3 w-3" strokeWidth={2} />
                {PLANNERS[lane].label}&apos;s
              </button>
            ))}
          </span>
        </li>
      </ul>
    </div>
  );
}

function Option({
  stay,
  question,
  adopted,
  rate,
  onEdit,
  onAdopt,
}: {
  stay: TripStay;
  question: StayQuestion;
  adopted: boolean;
  rate: Rate;
  onEdit: () => void;
  onAdopt: () => void;
}) {
  const meta = LANES[stay.lane];
  const planner = meta.planner ? PLANNERS[meta.planner].label : "";
  const perNight = perNightYen(stay, rate);
  const partial =
    stay.check_in_on !== question.from || stay.check_out_on !== question.to;

  return (
    <li
      id={`option-${stay.id}`}
      className="relative flex scroll-mt-[calc(var(--spacing-planner-bar)+1.5rem)] flex-col rounded-lg border p-4"
      style={{ backgroundColor: meta.tint, borderColor: meta.accent }}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p
            className="font-raleway text-[0.6rem] font-semibold uppercase tracking-[0.2em]"
            style={{ color: meta.accent }}
          >
            {planner}&apos;s option
          </p>
          <p className="mt-1 font-garamond text-2xl leading-tight text-foreground">
            {stay.name}
          </p>
          {stay.name_ja && (
            <p className="font-jp text-sm text-muted-foreground">
              {stay.name_ja}
            </p>
          )}
        </div>
        <Seal status={stay.booking_status} size="sm" />
      </div>

      <p className="mt-2 font-raleway text-xs text-muted-foreground">
        {[
          stay.city,
          partial && formatStayDates(stay),
          partial && formatNights(nightCount(stay)),
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>

      {stay.cost_amount !== null && (
        <p className="mt-3 font-mono tabular-nums slashed-zero">
          <span className="text-lg text-foreground">
            {perNight !== null && formatYen(perNight)}
          </span>
          <span className="text-xs text-muted-foreground"> a night</span>
          <span className="block text-[0.65rem] text-muted-foreground">
            {formatCost(stay)} total · {formatCostConverted(stay, rate)}
          </span>
        </p>
      )}

      {(stay.cancel_by || stay.payment || stay.dinner_time) && (
        <p className="mt-2 font-garamond text-sm text-muted-foreground">
          {[
            stay.cancel_by &&
              `Free cancellation until ${formatDateIn(cancelDeadline(stay)!, STAY_TZ)}`,
            stay.payment === "at_desk" && "Pay at the desk",
            stay.dinner_time && "Dinner served",
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      {stay.notes && (
        <p className="mt-2 line-clamp-3 font-garamond text-sm leading-snug text-foreground/90">
          {stay.notes}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4">
        {adopted ? (
          <span className="flex items-center gap-1 font-raleway text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-primary">
            <Check className="h-3.5 w-3.5" strokeWidth={2} />
            In Decided
          </span>
        ) : (
          <button
            type="button"
            onClick={onAdopt}
            className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ArrowUp className="h-3 w-3" strokeWidth={2} />
            Use this one
          </button>
        )}
        {stay.url && (
          <a
            href={stay.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary"
          >
            See it <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
          </a>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="ml-auto flex items-center gap-1 rounded-sm font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Pencil className="h-3 w-3" strokeWidth={1.5} />
          Edit
        </button>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------ the beds -- */

function StayRow({
  stay,
  stays,
  items,
  isCurrent,
  rate,
  now,
  onEdit,
}: {
  stay: TripStay;
  stays: TripStay[];
  items: ChecklistItem[];
  isCurrent: boolean;
  rate: Rate;
  now: number;
  onEdit: () => void;
}) {
  const done = new Date(checkOutAt(stay)).getTime() < now;
  const bags = bagsFor(stay, stays);
  const closing = cancelIsClose(stay, now);

  return (
    <li
      id={`stay-${stay.id}`}
      className={cn("scroll-mt-[calc(var(--spacing-planner-bar)+1.5rem)]", done && "opacity-60")}
    >
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-[9rem_1fr]">
        <div>
          <p className="font-mono text-sm text-foreground tabular-nums slashed-zero">
            {formatStayDates(stay)}
          </p>
          <p className="font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
            {formatNights(nightCount(stay))}
            {done && " · done"}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-garamond text-2xl leading-tight text-foreground">
                {stay.name}
                {stay.name_ja && (
                  <span className="ml-2 font-jp text-base text-muted-foreground">
                    {stay.name_ja}
                  </span>
                )}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-raleway text-xs text-muted-foreground">
                {stay.city && <span>{stay.city}</span>}
                <span className="font-mono tabular-nums slashed-zero">
                  in {stay.check_in_time?.slice(0, 5) ?? USUAL_CHECK_IN} · out{" "}
                  {stay.check_out_time?.slice(0, 5) ?? USUAL_CHECK_OUT}
                </span>
                {stay.cost_amount !== null && (
                  <span
                    className="font-mono tabular-nums slashed-zero"
                    title={formatCostConverted(stay, rate)}
                  >
                    {formatCost(stay)}
                  </span>
                )}
                {stay.confirmation && (
                  <CopyCode code={stay.confirmation} size="sm" />
                )}
              </p>
            </div>
            <Seal status={stay.booking_status} size="sm" />
          </div>

          {(stay.cancel_by || stay.payment === "at_desk" || bags.outgoing) && (
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-garamond text-sm">
              {stay.cancel_by && (
                <span
                  className={closing ? "text-pending" : "text-muted-foreground"}
                >
                  {closing && (
                    <TriangleAlert
                      className="mr-1 inline h-3.5 w-3.5 -translate-y-px"
                      strokeWidth={1.75}
                    />
                  )}
                  Free cancellation until{" "}
                  {formatDateIn(cancelDeadline(stay)!, STAY_TZ)}
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

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1 rounded-sm font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Pencil className="h-3 w-3" strokeWidth={1.5} />
              Details
            </button>
          </div>
        </div>
      </div>

      {!done && (
        <div className="mt-3 sm:ml-[calc(9rem+1.5rem)]">
          {isCurrent ? (
            <p className="font-garamond text-sm text-muted-foreground italic">
              This stay&apos;s checklist is up top.
            </p>
          ) : (
            // The usual suggestions are offered once, on the stay up top,
            // rather than repeated under every bed on the list.
            <Checklist
              title="Before you check in"
              list={stayChecklistKey(stay)}
              items={items}
            />
          )}
        </div>
      )}
    </li>
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
