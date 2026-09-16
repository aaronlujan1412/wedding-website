import type { Metadata } from "next";
import { ExternalLink, MapPin } from "lucide-react";
import { TimelineConnector } from "@/components/schedule/TimelineConnector";
import { Seal } from "@/components/honeymoon/Seal";
import { getTripBoard } from "@/lib/honeymoon-queries";
import { blockoutDetail } from "@/components/honeymoon/blockouts";
import {
  arrivesClock,
  departsClock,
  transitIn,
  transitOnDay,
} from "@/components/honeymoon/transit";
import {
  formatNights,
  formatStayDates,
  nightCount,
  staysIn,
} from "@/components/honeymoon/stays";
import {
  kindOf,
  eachDay,
  formatClock,
  formatDuration,
  formatYen,
  itemLength,
  decidedOn,
  parseDay,
  formatCost,
  legsIn,
  sumYen,
  yenAsUsd,
} from "@/components/honeymoon/trip";
import type {
  Rate,
  TripDay,
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

/**
 * The read side of the board.
 *
 * Only the `decided` lane reaches here. The two draft lanes are arguments in
 * progress, and printing an argument is how you end up standing outside a
 * closed museum holding a piece of paper that disagrees with itself.
 */
export default async function ItineraryPage() {
  const board = await getTripBoard();
  const { days, items, docs, rate } = board;
  // The agreed route only. Draft legs are proposals, and this page is the plan.
  const legs = legsIn(board.legs, "decided");
  const decided = items.filter((i) => i.lane === "decided");
  const stays = staysIn(board.stays, "decided");
  const decidedTransit = transitIn(board.transit, "decided");
  const spend =
    sumYen(decided, rate) + sumYen(docs, rate) + sumYen(stays, rate);

  return (
    <main className="mx-auto mt-12 max-w-3xl">
      <header className="mb-16 text-center md:mb-20">
        <p className="font-raleway text-xs uppercase tracking-[0.3em] text-primary">
          {legs.length === 0
            ? "Nothing agreed yet"
            : legs.map((l) => l.name).join(" · ")}
        </p>
        {legs.length > 0 && (
          <h2 className="mt-3 font-garamond text-3xl text-foreground md:text-4xl">
            {formatRange(legs)}
          </h2>
        )}
        {spend > 0 && (
          <p className="mt-2 font-mono text-sm text-muted-foreground tabular-nums slashed-zero">
            {formatYen(spend)} / {yenAsUsd(spend, rate)}
          </p>
        )}
      </header>

      {legs.length === 0 && (
        <p className="rounded-lg border border-dashed border-border px-8 py-16 text-center font-garamond text-lg text-muted-foreground">
          Add a leg on the board and the itinerary writes itself.
        </p>
      )}

      <div className="space-y-20 md:space-y-24">
        {legs.map((leg) => (
          <LegSection
            key={leg.id}
            leg={leg}
            stays={stays.filter(
              (s) =>
                s.check_in_on <= leg.ends_on && s.check_out_on > leg.starts_on,
            )}
            items={decided}
            notes={days}
            board={{ stays: board.stays, items, transit: board.transit }}
            transit={decidedTransit}
            rate={rate}
          />
        ))}
      </div>
    </main>
  );
}

function formatRange(legs: TripLeg[]) {
  const start = legs.reduce(
    (a, l) => (l.starts_on < a ? l.starts_on : a),
    legs[0].starts_on,
  );
  const end = legs.reduce(
    (a, l) => (l.ends_on > a ? l.ends_on : a),
    legs[0].ends_on,
  );
  const opts = { month: "long", day: "numeric" } as const;
  return `${parseDay(start).toLocaleDateString("en-US", opts)} – ${parseDay(
    end,
  ).toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
}

function LegSection({
  rate,
  leg,
  stays,
  items,
  notes,
  board,
  transit,
}: {
  rate: Rate;
  leg: TripLeg;
  stays: TripStay[];
  items: TripItem[];
  notes: TripDay[];
  /** The whole board, for the blockouts that look past their own day. */
  board: { stays: TripStay[]; items: TripItem[]; transit: TripTransit[] };
  /** The agreed route's rides, for the days that are spent moving. */
  transit: TripTransit[];
}) {
  const dates = eachDay(leg.starts_on, leg.ends_on);

  return (
    <section>
      <div className="mb-10 border-b border-border pb-4">
        <p className="font-raleway text-xs uppercase tracking-[0.3em] text-primary">
          {dates.length} {dates.length === 1 ? "day" : "days"}
        </p>
        <h2 className="mt-2 font-garamond text-4xl text-foreground">
          {leg.name}
          {leg.name_ja && (
            <span className="ml-3 font-jp text-xl text-muted-foreground">
              {leg.name_ja}
            </span>
          )}
        </h2>
        {stays.map((stay) => (
          <p
            key={stay.id}
            className="mt-2 font-garamond text-lg text-muted-foreground"
          >
            {stay.name}
            <span className="font-mono text-xs tabular-nums slashed-zero">
              {" "}
              · {formatStayDates(stay)} · {formatNights(nightCount(stay))}
            </span>
          </p>
        ))}
        {leg.note && (
          <p className="mt-2 font-garamond text-lg leading-relaxed text-foreground/90">
            {leg.note}
          </p>
        )}
      </div>

      <div className="space-y-14">
        {dates.map((date) => (
          <DaySection
            key={date}
            date={date}
            note={notes.find((n) => n.on_date === date)}
            items={decidedOn(items, date)}
            rate={rate}
            board={board}
            rides={transitOnDay(transit, date)}
          />
        ))}
      </div>
    </section>
  );
}

function DaySection({
  rate,
  date,
  note,
  items,
  board,
  rides,
}: {
  date: string;
  note?: TripDay;
  items: TripItem[];
  rate: Rate;
  board: { stays: TripStay[]; items: TripItem[]; transit: TripTransit[] };
  rides: ReturnType<typeof transitOnDay>;
}) {
  const day = parseDay(date);
  const spend = sumYen(items, rate);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-garamond text-2xl text-foreground">
          {day.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h3>
        {note?.title && (
          <span className="font-garamond text-xl italic text-muted-foreground">
            {note.title}
          </span>
        )}
        {spend > 0 && (
          <span className="font-mono text-xs text-muted-foreground tabular-nums slashed-zero">
            {formatYen(spend)}
          </span>
        )}
      </div>

      {note?.note && (
        <p className="mb-6 font-garamond text-lg leading-relaxed text-foreground/90">
          {note.note}
        </p>
      )}

      {rides.length > 0 && (
        <ul className="mb-8 space-y-2 border-l-2 border-kind-travel pl-4">
          {rides.map(({ ride, leaves, lands }) => (
            <li key={ride.id}>
              <p className="font-garamond text-xl leading-tight text-foreground">
                {leaves ? (
                  <>
                    {ride.from_place} → {ride.to_place}
                  </>
                ) : (
                  <>Arrives {ride.to_place}</>
                )}
              </p>
              <p className="font-mono text-xs tracking-wide text-muted-foreground tabular-nums slashed-zero">
                {[
                  leaves
                    ? `${departsClock(ride)} – ${arrivesClock(ride)}${lands ? "" : " next day"}`
                    : arrivesClock(ride),
                  ride.service,
                  ride.car && `Car ${ride.car}`,
                  ride.covered_by_pass ? "on the pass" : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      )}

      {items.length === 0 ? (
        <p className="font-garamond text-lg italic text-muted-foreground">
          Nothing planned. Leave it that way.
        </p>
      ) : (
        items.map((item, i) =>
          kindOf(item.kind).blockout ? (
            <BlockoutEntry
              key={item.id}
              item={item}
              board={board}
              last={i === items.length - 1}
            />
          ) : (
            <article
              key={item.id}
              className="grid grid-cols-[3rem_1fr] gap-x-4 md:grid-cols-[4rem_1fr] md:gap-x-8"
            >
              <div className="flex flex-col items-center" aria-hidden="true">
                <span
                  className="z-10 flex h-11 w-11 items-center justify-center rounded-full bg-card text-lg md:h-14 md:w-14 md:text-2xl"
                  style={{ boxShadow: `0 0 0 2px ${kindOf(item.kind).color}` }}
                >
                  {kindOf(item.kind).glyph}
                </span>
                {i !== items.length - 1 && <TimelineConnector />}
              </div>

              <div className="pb-10">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary tabular-nums slashed-zero">
                      {item.start_time
                        ? `${formatClock(item.start_time)} · ${formatDuration(itemLength(item))}`
                        : kindOf(item.kind).label}
                    </p>
                    <h4 className="mt-1.5 font-garamond text-2xl leading-tight text-foreground">
                      {item.title}
                    </h4>
                    {item.title_ja && (
                      <p className="font-jp text-sm text-muted-foreground">
                        {item.title_ja}
                      </p>
                    )}
                  </div>
                  <Seal status={item.booking_status} />
                </div>

                {item.notes && (
                  <p className="mt-3 font-garamond text-lg leading-relaxed text-foreground/90">
                    {item.notes}
                  </p>
                )}

                <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.65rem] tracking-wide text-muted-foreground tabular-nums slashed-zero">
                  {item.cost_amount !== null && <span>{formatCost(item)}</span>}
                  {item.booking_ref && <span>#{item.booking_ref}</span>}
                  {item.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" strokeWidth={1.5} />
                      {item.address}
                    </span>
                  )}
                  {item.map_url && (
                    <a
                      href={item.map_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                    >
                      Map
                      <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                    </a>
                  )}
                </p>
              </div>
            </article>
          ),
        )
      )}
    </div>
  );
}

/**
 * A blockout on the timeline.
 *
 * The medallion goes hollow and the type loses its weight, because this is the
 * part of the day where the itinerary stops telling you what to do. A wander
 * block is the exception worth reading: it prints the ideas still sitting in
 * the pile for that city, which is the one moment that list is actually useful
 * — standing in the city with an afternoon free.
 */
function BlockoutEntry({
  item,
  board,
  last,
}: {
  item: TripItem;
  board: { stays: TripStay[]; items: TripItem[]; transit: TripTransit[] };
  last: boolean;
}) {
  const kind = kindOf(item.kind);
  const detail = blockoutDetail(item, board);

  return (
    <article className="grid grid-cols-[3rem_1fr] gap-x-4 md:grid-cols-[4rem_1fr] md:gap-x-8">
      <div className="flex flex-col items-center" aria-hidden="true">
        <span
          className="z-10 h-11 w-11 rounded-full md:h-14 md:w-14"
          style={{
            backgroundColor: `color-mix(in srgb, ${kind.color} 8%, var(--color-background))`,
            boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${kind.color} 35%, transparent)`,
          }}
        />
        {!last && <TimelineConnector />}
      </div>

      <div className="pb-10">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground tabular-nums slashed-zero">
          {item.start_time
            ? `${formatClock(item.start_time)} · ${formatDuration(itemLength(item))}`
            : formatDuration(itemLength(item))}
          {" · "}
          {kind.label}
        </p>
        <h4 className="mt-1.5 font-garamond text-2xl leading-tight text-foreground/80">
          {item.title}
        </h4>
        {detail.text && (
          <p className="mt-1 font-garamond text-lg text-muted-foreground">
            {detail.text}
          </p>
        )}

        {item.notes && (
          <p className="mt-3 font-garamond text-lg leading-relaxed text-foreground/90">
            {item.notes}
          </p>
        )}

        {detail.ideas.length > 0 && (
          <ul className="mt-4 space-y-1 border-l border-border pl-4">
            {detail.ideas.map((idea) => (
              <li
                key={idea.id}
                className="font-garamond text-base leading-snug text-muted-foreground"
              >
                {idea.must_do && (
                  <span className="mr-1 text-accent" aria-label="Must do">
                    ★
                  </span>
                )}
                {idea.title}
                {idea.title_ja && (
                  <span className="ml-2 font-jp text-sm">{idea.title_ja}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
