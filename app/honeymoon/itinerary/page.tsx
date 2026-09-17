import type { Metadata } from "next";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { getItineraryPage } from "@/lib/honeymoon-queries";
import { PrintButton } from "@/components/honeymoon/PrintButton";
import { StatusLabel } from "@/components/honeymoon/Seal";
import { airport } from "@/components/honeymoon/airports";
import { blockoutDetail } from "@/components/honeymoon/blockouts";
import {
  beAtAirportBy,
  dateLine,
  dayShift,
  flightMinutes,
  formatClockIn,
  formatDateIn,
  formatSpan,
  zoneName,
} from "@/components/honeymoon/flights";
import {
  bedGaps,
  blocksOf,
  planDays,
  type DayChecklist,
  type Entry,
  type PlanDay,
} from "@/components/honeymoon/itinerary";
import { tripSpend } from "@/components/honeymoon/spend";
import {
  STAY_TZ,
  USUAL_CHECK_IN,
  USUAL_CHECK_OUT,
  deskCashYen,
  formatNights,
  formatStayDates,
  nightCount,
  staysIn,
} from "@/components/honeymoon/stays";
import {
  MODES,
  arrivesClock,
  departsClock,
  rideMinutes,
} from "@/components/honeymoon/transit";
import {
  BOOKING_STATUSES,
  DOC_CATEGORIES,
  addDays,
  eachDay,
  formatClock,
  formatCost,
  formatDuration,
  formatLegDates,
  formatYen,
  itemLength,
  kindOf,
  legsIn,
  parseDay,
  todayISO,
  yenAsUsd,
} from "@/components/honeymoon/trip";
import type {
  TripDoc,
  TripItem,
  TripLeg,
  TripStay,
  TripTransit,
} from "@/components/honeymoon/types";

/** Host-only and always live — never prerender it with build-time rows. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Honeymoon itinerary",
  robots: { index: false, follow: false },
};

type Board = { stays: TripStay[]; items: TripItem[]; transit: TripTransit[] };

/**
 * The plan, on screen and on paper.
 *
 * This page and the pocket print used to be two drawings of the same days,
 * each from half the facts: this one had the cards and rides, Pocket had the
 * bed and the cash, and neither had the flights. Now it's one page. Printing it
 * is what makes the pocket copy — the papers first, then a sheet for each day
 * with something on it.
 *
 * Only the `decided` lane reaches here. The two draft lanes are arguments in
 * progress, and printing an argument is how you end up standing outside a
 * closed museum holding a piece of paper that disagrees with itself.
 */
export default async function ItineraryPage() {
  const data = await getItineraryPage();
  const days = planDays(data);
  const blocks = blocksOf(days);
  const legs = legsIn(data.legs, "decided");
  const spend = tripSpend(data, data.rate);
  const today = todayISO();
  const board: Board = {
    stays: data.stays,
    items: data.items,
    transit: data.transit,
  };

  const planned = days.filter((d) => d.planned).length;
  const noBed = bedGaps(days).reduce((sum, gap) => sum + gap.nights, 0);

  return (
    <main
      id="itinerary"
      className="mx-auto mt-10 flex max-w-3xl flex-col print:mt-0 print:max-w-none"
    >
      <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-5">
        <div className="min-w-0">
          <h2 className="font-garamond text-4xl leading-none text-foreground">
            Itinerary
          </h2>
          {days.length > 0 && (
            <p className="mt-2 font-garamond text-xl text-muted-foreground">
              {planned === days.length ? (
                "Every day has a plan"
              ) : (
                <>
                  <span className="text-foreground">
                    {planned} of {days.length} days
                  </span>{" "}
                  {planned === 1 ? "has" : "have"} a plan
                </>
              )}
              {noBed > 0 && (
                <>
                  , and{" "}
                  <span className="text-pending">
                    {formatNights(noBed)} {noBed === 1 ? "has" : "have"} no
                    bed
                  </span>
                </>
              )}
              .
            </p>
          )}
          {(legs.length > 0 || spend > 0) && (
            <p className="mt-1.5 font-mono text-xs text-muted-foreground tabular-nums slashed-zero">
              {[
                legs.map((l) => l.name).join(" → "),
                spend > 0 &&
                  `${formatYen(spend)} ≈ ${yenAsUsd(spend, data.rate)}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {days.some((d) => d.date === today) && (
            <a
              href={`#day-${today}`}
              className="rounded-md border border-primary bg-primary px-3 py-1.5 font-raleway text-sm text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:py-2.5"
            >
              Today
            </a>
          )}
          {days.length > 0 && <PrintButton />}
        </div>
      </header>

      {days.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-8 py-16 text-center font-garamond text-lg text-muted-foreground">
          Give the trip its dates on the Board and the itinerary writes itself.
        </p>
      ) : (
        <>
          <div className="order-1 space-y-3 print:order-2 print:space-y-0">
            {blocks.map((block) => {
              const first = block.kind === "day" ? block.day : block.days[0];
              return (
                <section
                  key={first.date}
                  className={cn(
                    block.kind === "day" && "print:break-before-page",
                  )}
                >
                  {first.startsLeg && first.leg && (
                    <LegHeading
                      leg={first.leg}
                      bed={first.bed}
                      first={block === blocks[0]}
                    />
                  )}
                  {block.kind === "day" ? (
                    <DaySheet day={block.day} today={today} board={board} />
                  ) : (
                    <QuietDays days={block.days} today={today} />
                  )}
                </section>
              );
            })}
          </div>

          <Papers
            stays={staysIn(data.stays, "decided")}
            docs={data.docs}
            days={days}
          />
        </>
      )}
    </main>
  );
}

/* ---------------------------------------------------------------- a leg -- */

function LegHeading({
  leg,
  bed,
  first,
}: {
  leg: TripLeg;
  bed: TripStay | null;
  first: boolean;
}) {
  const count = eachDay(leg.starts_on, leg.ends_on).length;
  return (
    <div
      className={cn(
        "mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 print:mt-0",
        first ? "mt-2" : "mt-14",
      )}
    >
      <h3 className="font-garamond text-3xl leading-tight text-foreground">
        {leg.name}
      </h3>
      {leg.name_ja && (
        <span className="font-jp text-lg text-muted-foreground">
          {leg.name_ja}
        </span>
      )}
      <span className="font-mono text-xs text-muted-foreground tabular-nums slashed-zero">
        {formatLegDates(leg)} · {count} {count === 1 ? "day" : "days"}
        {bed && ` · ${bed.name}`}
      </span>
      {leg.note && (
        <p className="basis-full font-garamond text-lg leading-relaxed text-foreground/90">
          {leg.note}
        </p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- a day -- */

const SHEET =
  "rounded-lg border border-border bg-card px-4 py-5 sm:px-7 sm:py-6 print:rounded-none print:border-0 print:bg-transparent print:px-0 print:py-4";

function DaySheet({
  day,
  today,
  board,
}: {
  day: PlanDay;
  today: string;
  board: Board;
}) {
  const date = parseDay(day.date);
  const isToday = day.date === today;

  return (
    <article
      id={`day-${day.date}`}
      className={cn(
        SHEET,
        "scroll-mt-[calc(var(--spacing-planner-bar)+1rem)]",
        isToday && "border-primary shadow-[inset_3px_0_0_var(--color-primary)]",
      )}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-3">
        <h4 className="font-garamond text-2xl leading-tight text-foreground sm:text-3xl">
          {date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h4>
        <p className="flex flex-wrap items-baseline gap-x-2 font-raleway text-sm text-primary">
          {isToday && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground print:hidden">
              Today
            </span>
          )}
          {day.note?.title && (
            <span className="font-garamond text-lg text-muted-foreground italic">
              {day.note.title}
            </span>
          )}
          {/* On screen the leg's heading already says where you are. A sheet
              of paper is on its own, so it says it again. */}
          {day.leg && (
            <span className="hidden print:inline">
              {day.leg.name}
              {day.leg.name_ja && (
                <span className="ml-1 font-jp">{day.leg.name_ja}</span>
              )}
            </span>
          )}
        </p>
      </header>

      <Carry day={day} />

      {day.note?.note && (
        <p className="mt-3 font-garamond text-lg leading-relaxed text-foreground/90">
          {day.note.note}
        </p>
      )}

      {day.warnings.map((warning) => (
        <p
          key={warning}
          className="mt-3 flex items-start gap-2 font-raleway text-sm leading-snug text-warn"
        >
          <TriangleAlert
            className="mt-0.5 h-3.5 w-3.5 flex-none"
            strokeWidth={2}
          />
          {warning}
        </p>
      ))}

      {day.entries.length > 0 && (
        <ol className="mt-4 space-y-0.5">
          {day.entries.map((entry) => (
            <EntryRow key={entry.key} entry={entry} board={board} />
          ))}
        </ol>
      )}

      {day.checklists.map((list) => (
        <Checklist key={list.key} list={list} />
      ))}
    </article>
  );
}

/** What to carry in your head for the day: where you sleep, and the cash. */
function Carry({ day }: { day: PlanDay }) {
  const { bed, checkIn, checkOut } = day;
  const moving = checkOut && checkOut.id !== bed?.id;
  const unbooked = bed && BOOKING_STATUSES[bed.booking_status].light !== "ready";

  const facts: React.ReactNode[] = [];
  if (moving) {
    facts.push(
      <Fact key="out" label="Check out">
        {checkOut.name} by{" "}
        {(checkOut.check_out_time ?? USUAL_CHECK_OUT).slice(0, 5)}
      </Fact>,
    );
  }
  if (bed) {
    facts.push(
      <Fact key="bed" label={checkIn?.id === bed.id ? "Check in" : "Bed"}>
        {bed.name}
        {checkIn?.id === bed.id &&
          `, from ${(bed.check_in_time ?? USUAL_CHECK_IN).slice(0, 5)}`}
        {unbooked && <span className="text-pending"> · not booked</span>}
      </Fact>,
    );
  } else if (day.onPlane) {
    facts.push(
      <Fact key="bed" label="Tonight">
        On the plane
      </Fact>,
    );
  } else if (day.needsBed) {
    facts.push(
      <Fact key="bed" label="Bed">
        <span className="text-pending">None booked yet</span>
      </Fact>,
    );
  }
  if (day.cash > 0) {
    facts.push(
      <Fact key="cash" label="Cash">
        <span className="font-mono tabular-nums slashed-zero">
          {formatYen(day.cash)}
        </span>
      </Fact>,
    );
  }

  if (facts.length === 0) return null;
  return (
    <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">{facts}</dl>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="font-raleway text-muted-foreground">{label}</dt>
      <dd className="font-raleway text-foreground">{children}</dd>
    </div>
  );
}

/* ------------------------------------------------------------- the rows -- */

function EntryRow({ entry, board }: { entry: Entry; board: Board }) {
  switch (entry.kind) {
    case "item":
      return <ItemRow item={entry.item} board={board} />;
    case "flight":
      return <FlightRow entry={entry} />;
    case "ride":
      return <RideRow entry={entry} />;
    case "doc":
      return <DocRow doc={entry.doc} />;
    case "checkin":
      return (
        <Row
          time={formatClockIn(
            new Date(entry.at).toISOString(),
            entry.flight.departs_tz,
          )}
          zone={awayZone(new Date(entry.at).toISOString(), entry.flight.departs_tz)}
          tab={{ backgroundColor: "var(--color-kind-travel)" }}
        >
          <Title>Online check-in opens</Title>
          <Meta>
            {entry.flight.airline} {entry.flight.flight_number} to{" "}
            {entry.flight.to_airport}
          </Meta>
          {entry.flight.checkin_url && (
            <a
              href={entry.flight.checkin_url}
              target="_blank"
              rel="noreferrer"
              className="font-raleway text-xs text-primary underline-offset-4 hover:underline print:hidden"
            >
              Check in with {entry.flight.airline}
            </a>
          )}
        </Row>
      );
    case "gap":
      return (
        <Row time="" tab={null}>
          <Title className="text-pending">
            {entry.from} → {entry.to}
          </Title>
          <Meta>
            No ride booked
            <Link
              href="/honeymoon/transit"
              className="ml-2 font-raleway text-primary underline-offset-4 hover:underline print:hidden"
            >
              Add it on Transit
            </Link>
          </Meta>
        </Row>
      );
  }
}

/**
 * One line of the day: a clock, a 3px tab in the card's kind colour — the same
 * tab the Board draws — and what happens.
 */
function Row({
  time,
  zone,
  tab,
  flag,
  children,
}: {
  time: string;
  /**
   * Said under the clock when it isn't Japan's. Going home, a 17:00 Haneda
   * departure is followed by a 13:00 Seattle one, and without the zone the
   * column reads backwards.
   */
  zone?: string;
  /** Null draws the dashed amber rule of something not booked. */
  tab: React.CSSProperties | null;
  flag?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="grid break-inside-avoid grid-cols-[3.25rem_3px_minmax(0,1fr)] gap-x-3 py-1.5">
      <span className="pt-1 text-right font-mono text-sm leading-tight text-foreground tabular-nums slashed-zero">
        {time || (
          <span aria-hidden="true" className="text-muted-foreground">
            ·
          </span>
        )}
        {time && zone && (
          <span className="block text-[0.6rem] text-muted-foreground">
            {zone}
          </span>
        )}
      </span>
      {tab ? (
        <span aria-hidden="true" className="rounded-full" style={tab} />
      ) : (
        <span
          aria-hidden="true"
          className="border-l-2 border-dashed border-caution"
        />
      )}
      {/* The flag sits beside the title at a desk and under it on a phone,
          where it would otherwise squeeze a hotel name onto three lines. */}
      <div className="flex min-w-0 flex-col sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">{children}</div>
        {flag && <div className="flex-none sm:pt-1.5">{flag}</div>}
      </div>
    </li>
  );
}

function Title({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "font-garamond text-lg leading-snug text-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

function Meta({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs leading-relaxed text-muted-foreground tabular-nums slashed-zero">
      {children}
    </p>
  );
}

function Small({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-garamond text-base leading-snug text-muted-foreground">
      {children}
    </p>
  );
}

function ItemRow({ item, board }: { item: TripItem; board: Board }) {
  const kind = kindOf(item.kind);
  const detail = kind.blockout ? blockoutDetail(item, board) : null;

  return (
    <Row
      time={item.start_time ? formatClock(item.start_time) : ""}
      tab={
        kind.blockout
          ? {
              backgroundImage: `repeating-linear-gradient(to bottom, ${kind.color} 0 3px, transparent 3px 6px)`,
            }
          : { backgroundColor: kind.color }
      }
      flag={
        kind.blockout ? null : (
          <StatusLabel
            status={item.booking_status}
            className="font-mono text-[0.6rem] tracking-[0.1em]"
          />
        )
      }
    >
      <Title className={cn(kind.blockout && "text-foreground/75 italic")}>
        {item.must_do && (
          <span className="mr-1 text-accent" aria-label="Must do">
            ★
          </span>
        )}
        {item.title}
        {item.title_ja && (
          <span className="ml-2 inline-block font-jp text-sm text-muted-foreground not-italic">
            {item.title_ja}
          </span>
        )}
      </Title>
      <Meta>
        {[
          kind.label.toLowerCase(),
          formatDuration(itemLength(item)),
          item.cost_amount !== null && formatCost(item),
          item.booking_ref && `#${item.booking_ref}`,
        ]
          .filter(Boolean)
          .join(" · ")}
      </Meta>
      {detail?.text && <Small>{detail.text}</Small>}
      {/* The one moment a wander block's list is useful: standing in the city
          with an afternoon free, holding this. */}
      {detail && detail.ideas.length > 0 && (
        <ul className="mt-1 border-l border-border pl-3 font-garamond text-base leading-snug text-muted-foreground">
          {detail.ideas.map((idea) => (
            <li key={idea.id}>
              {idea.must_do && <span className="mr-1 text-accent">★</span>}
              {idea.title}
              {idea.title_ja && (
                <span className="ml-2 font-jp text-sm">{idea.title_ja}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {item.address && <Small>{item.address}</Small>}
      {item.notes && (
        <p className="font-garamond text-base leading-snug text-foreground/90">
          {item.notes}
        </p>
      )}
    </Row>
  );
}

function FlightRow({ entry }: { entry: Extract<Entry, { kind: "flight" }> }) {
  const { flight: f, leaves, lands, startsJourney, showConfirmation } = entry;
  const shift = dayShift(f);
  const arrives = `${formatClockIn(f.arrives_at, f.arrives_tz)} ${zoneName(f.arrives_at, f.arrives_tz)}`;

  const title = leaves
    ? `${f.from_airport} → ${f.to_airport}`
    : `Land at ${airport(f.to_airport)?.name ?? f.to_airport}`;

  return (
    <Row
      time={formatClockIn(
        leaves ? f.departs_at : f.arrives_at,
        leaves ? f.departs_tz : f.arrives_tz,
      )}
      zone={
        leaves
          ? awayZone(f.departs_at, f.departs_tz)
          : awayZone(f.arrives_at, f.arrives_tz)
      }
      tab={{ backgroundColor: "var(--color-kind-travel)" }}
    >
      <Title>{title}</Title>
      <Meta>
        {leaves
          ? [
              `${f.airline} ${f.flight_number}`,
              `${formatClockIn(f.departs_at, f.departs_tz)} ${zoneName(f.departs_at, f.departs_tz)} → ${arrives}${
                lands
                  ? ""
                  : ` ${formatDateIn(f.arrives_at, f.arrives_tz)}${shift > 0 ? ` (+${shift} day)` : ""}`
              }`,
              formatSpan(flightMinutes(f)),
            ].join(" · ")
          : [
              `${f.airline} ${f.flight_number} from ${f.from_airport}`,
              `${formatSpan(flightMinutes(f))} in the air`,
            ].join(" · ")}
      </Meta>
      {leaves && (
        <Meta>
          {[
            showConfirmation && f.confirmation && `Conf ${f.confirmation}`,
            f.seat_aaron && `Aaron ${f.seat_aaron}`,
            f.seat_savea && `Savea ${f.seat_savea}`,
            f.departure_terminal && terminal(f.departure_terminal),
            f.departure_gate && `Gate ${f.departure_gate}`,
            f.baggage,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Meta>
      )}
      {lands && !leaves && f.arrival_terminal && (
        <Meta>Arrives at {terminal(f.arrival_terminal)}</Meta>
      )}
      {startsJourney && (
        <Small>
          Be at {airport(f.from_airport)?.name ?? f.from_airport} by{" "}
          {formatClockIn(beAtAirportBy(f), f.departs_tz)}
        </Small>
      )}
      {leaves && dateLine(f) && (
        <p className="font-raleway text-xs text-dateline">
          Crosses the date line
        </p>
      )}
    </Row>
  );
}

/** The zone's name, unless it's Japan's — every other clock on the page is. */
function awayZone(iso: string, tz: string): string | undefined {
  return tz === STAY_TZ ? undefined : zoneName(iso, tz);
}

/** "1" reads as Terminal 1; "Tom Bradley" already names itself. */
function terminal(value: string): string {
  return /^[a-z0-9]{1,2}$/i.test(value.trim()) ? `Terminal ${value.trim()}` : value;
}

function RideRow({ entry }: { entry: Extract<Entry, { kind: "ride" }> }) {
  const { ride, leaves, lands } = entry;
  const name = ride.service || ride.operator || MODES[ride.mode].label;

  return (
    <Row
      time={leaves ? departsClock(ride) : arrivesClock(ride)}
      tab={{ backgroundColor: "var(--color-kind-travel)" }}
      flag={
        ride.reserved ? (
          <span className="font-mono text-[0.6rem] tracking-[0.1em] text-ready uppercase">
            Seat reserved
          </span>
        ) : null
      }
    >
      <Title>
        {leaves ? `${ride.from_place} → ${ride.to_place}` : `Arrive ${ride.to_place}`}
        {(ride.from_place_ja || ride.to_place_ja) && (
          <span className="ml-2 inline-block font-jp text-sm text-muted-foreground">
            {[ride.from_place_ja, ride.to_place_ja].filter(Boolean).join(" → ")}
          </span>
        )}
      </Title>
      <Meta>
        {[
          name,
          leaves
            ? `${departsClock(ride)} → ${arrivesClock(ride)}${lands ? "" : " next day"}`
            : `left ${departsClock(ride)} the day before`,
          formatSpan(rideMinutes(ride)),
        ].join(" · ")}
      </Meta>
      {/* The line you read on the platform with no signal. */}
      {leaves && (
        <Meta>
          {[
            ride.departs_platform && `Platform ${ride.departs_platform}`,
            ride.car && `Car ${ride.car}`,
            ride.seat_aaron && `Aaron ${ride.seat_aaron}`,
            ride.seat_savea && `Savea ${ride.seat_savea}`,
            ride.covered_by_pass && "on the pass",
            ride.confirmation && `#${ride.confirmation}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Meta>
      )}
    </Row>
  );
}

function DocRow({ doc }: { doc: TripDoc }) {
  return (
    <Row
      time={doc.starts_at?.slice(11, 16) ?? ""}
      tab={{ backgroundColor: "var(--color-kind-travel)" }}
    >
      <Title>{doc.title}</Title>
      <Meta>
        {[DOC_CATEGORIES[doc.category], doc.confirmation]
          .filter(Boolean)
          .join(" · ")}
      </Meta>
      {doc.detail && <Small>{doc.detail}</Small>}
    </Row>
  );
}

/** Boxes to tick — with a finger on screen at the Flights tab, with a pen here. */
function Checklist({ list }: { list: DayChecklist }) {
  const done = list.items.filter((i) => i.done).length;
  return (
    <div className="mt-4 break-inside-avoid border-t border-border pt-3">
      <p className="flex items-baseline justify-between gap-3 font-raleway text-sm text-muted-foreground">
        <span>{list.title}</span>
        <span className="font-mono text-xs tabular-nums slashed-zero">
          {done} of {list.items.length}
        </span>
      </p>
      <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {list.items.map((item) => (
          <li
            key={item.id}
            className={cn(
              "flex items-center gap-2 font-garamond text-base leading-snug",
              item.done
                ? "text-muted-foreground line-through"
                : "text-foreground",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "h-3.5 w-3.5 flex-none rounded-[3px] border",
                item.done
                  ? "border-primary bg-primary"
                  : "border-foreground/40 bg-background",
              )}
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------- quiet stretches -- */

const COUNT_WORDS = [
  "No",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
];

function counted(n: number, noun: string) {
  return `${COUNT_WORDS[n] ?? n} ${noun}${n === 1 ? "" : "s"}`;
}

function shortDay(iso: string) {
  return parseDay(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Days with nothing on them, run together into a line. The old page gave each
 * one a heading and "Nothing planned. Leave it that way." — fifteen times — and
 * the one thing worth saying about a free stretch in Osaka, that there's nowhere
 * to sleep in it, was never said at all.
 */
function QuietDays({ days, today }: { days: PlanDay[]; today: string }) {
  const first = days[0];
  const last = days.at(-1)!;
  const where = first.leg ? ` in ${first.leg.name}` : "";
  const free =
    days.length === 1
      ? `A free day${where}.`
      : `${counted(days.length, "free day")}${where}.`;
  const holdsToday = days.some((d) => d.date === today);

  return (
    <div
      id={`day-${first.date}`}
      className={cn(
        "relative flex scroll-mt-[calc(var(--spacing-planner-bar)+1rem)] flex-wrap items-baseline gap-x-4 gap-y-0.5 rounded-lg border border-dashed px-5 py-3 break-inside-avoid sm:px-7 print:rounded-none print:border-x-0 print:px-0",
        first.needsBed
          ? "border-caution/70 bg-caution/5"
          : "border-border",
        holdsToday && "border-primary border-solid",
      )}
    >
      {/* So "Today" can land inside a stretch that starts before it. */}
      {days.slice(1).map((d) => (
        <span key={d.date} id={`day-${d.date}`} className="absolute top-0" />
      ))}
      <p className="font-garamond text-lg text-foreground">
        {days.length === 1
          ? shortDay(first.date)
          : `${shortDay(first.date)} – ${shortDay(last.date)}`}
        {holdsToday && (
          <span className="ml-2 rounded-full bg-primary px-2 py-0.5 align-middle font-raleway text-xs text-primary-foreground print:hidden">
            Today
          </span>
        )}
      </p>
      <p
        className={cn(
          "font-garamond text-base",
          first.needsBed ? "text-pending" : "text-muted-foreground italic",
        )}
      >
        {first.needsBed ? (
          <>
            {free.slice(0, -1)}, and no bed booked for{" "}
            {days.length === 1 ? "the night" : "these nights"}.
          </>
        ) : first.bed ? (
          <>
            {free} Bed: {first.bed.name}
            {BOOKING_STATUSES[first.bed.booking_status].light !== "ready" && (
              <span className="text-pending not-italic">, not booked yet</span>
            )}
            .
          </>
        ) : (
          free
        )}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------ the papers -- */

/**
 * The numbers you want without a signal: every bed with the address to show a
 * driver, and the passes, the eSIM, the bags sent ahead. First sheet on paper,
 * last section on screen, where the days matter more.
 *
 * A night with no bed is listed with the beds. The old printout skipped it,
 * and listed a hotel still waiting to be booked as if it were a bed.
 */
function Papers({
  stays,
  docs,
  days,
}: {
  stays: TripStay[];
  docs: TripDoc[];
  days: PlanDay[];
}) {
  if (stays.length === 0 && docs.length === 0) return null;

  const rows = [
    ...stays.map((stay) => ({ on: stay.check_in_on, stay, gap: null })),
    ...bedGaps(days).map((gap) => ({ on: gap.from, stay: null, gap })),
  ].sort((a, b) => (a.on < b.on ? -1 : a.on > b.on ? 1 : 0));

  return (
    <section
      id="papers"
      className={cn(
        SHEET,
        "order-2 mt-16 print:order-1 print:mt-0 print:break-after-page",
      )}
    >
      <h3 className="font-garamond text-3xl text-foreground">The papers</h3>
      <p className="mt-0.5 font-garamond text-lg text-muted-foreground italic">
        Numbers you&apos;ll want without a signal.
      </p>

      {rows.length > 0 && (
        <div className="mt-6">
          <h4 className="font-raleway text-sm text-primary">Beds</h4>
          <ul className="mt-2 space-y-4">
            {rows.map(({ stay, gap }) =>
              gap ? (
                <li
                  key={`gap-${gap.from}`}
                  className="font-garamond text-lg text-pending"
                >
                  No bed booked
                  <span className="ml-2 font-mono text-xs tabular-nums slashed-zero">
                    {formatStayDates({
                      check_in_on: gap.from,
                      check_out_on: addDays(gap.from, gap.nights),
                    })}{" "}
                    · {formatNights(gap.nights)}
                  </span>
                </li>
              ) : (
                stay && <BedPaper key={stay.id} stay={stay} />
              ),
            )}
          </ul>
        </div>
      )}

      {docs.length > 0 && (
        <div className="mt-6">
          <h4 className="font-raleway text-sm text-primary">Everything else</h4>
          <ul className="mt-2 space-y-3">
            {docs.map((doc) => (
              <li key={doc.id} className="break-inside-avoid">
                <p className="font-garamond text-lg text-foreground">
                  {doc.title}
                  <span className="ml-2 font-raleway text-xs text-muted-foreground">
                    {DOC_CATEGORIES[doc.category]}
                  </span>
                </p>
                {doc.detail && <Small>{doc.detail}</Small>}
                {doc.confirmation && <Meta>{doc.confirmation}</Meta>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function BedPaper({ stay }: { stay: TripStay }) {
  const unbooked = BOOKING_STATUSES[stay.booking_status].light !== "ready";
  return (
    <li className="break-inside-avoid">
      <p className="font-garamond text-lg text-foreground">
        {stay.name}
        {stay.name_ja && (
          <span className="ml-2 font-jp text-sm">{stay.name_ja}</span>
        )}
        <span className="ml-2 font-mono text-xs text-muted-foreground tabular-nums slashed-zero">
          {formatStayDates(stay)} · {formatNights(nightCount(stay))}
        </span>
        {unbooked && (
          <span className="ml-2 font-raleway text-sm text-pending">
            not booked yet
          </span>
        )}
      </p>
      {/* The Japanese address is the one to show a driver, so it leads and
          prints larger. */}
      {stay.address_ja && (
        <p className="font-jp text-base text-foreground">{stay.address_ja}</p>
      )}
      {stay.address && <Small>{stay.address}</Small>}
      <Meta>
        {[
          stay.phone && `Tel ${stay.phone}`,
          stay.confirmation && `Conf ${stay.confirmation}`,
          `In ${(stay.check_in_time ?? USUAL_CHECK_IN).slice(0, 5)}`,
          `Out ${(stay.check_out_time ?? USUAL_CHECK_OUT).slice(0, 5)}`,
          deskCashYen(stay) > 0 &&
            `${formatYen(deskCashYen(stay))} at the desk`,
        ]
          .filter(Boolean)
          .join(" · ")}
      </Meta>
      {stay.getting_there && <Small>{stay.getting_there}</Small>}
    </li>
  );
}
