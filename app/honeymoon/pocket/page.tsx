import type { Metadata } from "next";
import { getFlightsPage, getTripBoard } from "@/lib/honeymoon-queries";
import {
  JOURNEY_LABELS,
  dayShift,
  flightMinutes,
  formatClockIn,
  formatDateIn,
  formatSpan,
  groupJourneys,
  zoneName,
} from "@/components/honeymoon/flights";
import {
  DOC_CATEGORIES,
  KINDS,
  cashYen,
  formatClock,
  formatDuration,
  formatYen,
  itemLength,
  decidedOn,
  formatCost,
  legForDay,
  legsIn,
  parseDay,
  tripDays,
} from "@/components/honeymoon/trip";
import type {
  ChecklistItem,
  Rate,
  TripDay,
  TripDoc,
  TripFlight,
  TripItem,
  TripLeg,
} from "@/components/honeymoon/types";

/** Host-only and always live — never prerender it with build-time rows. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Honeymoon pocket card",
  robots: { index: false, follow: false },
};

/**
 * The offline copy.
 *
 * Roaming data in a Tokyo basement is not a plan, so this is one sheet per day
 * with the times, the addresses, the confirmation numbers and the cash you'll
 * want on you — printed, folded, in a pocket. Only the `decided` lane prints.
 * Print styles hide the site chrome; everything else is deliberately plain.
 */
export default async function PocketPage() {
  const [board, flightsPage] = await Promise.all([
    getTripBoard(),
    getFlightsPage(),
  ]);
  const { days, items, docs, rate } = board;
  // Only the agreed route prints — a proposal on paper is how you end up
  // arguing with yourself at a train station.
  const legs = legsIn(board.legs, "decided");
  const dates = tripDays(legs);

  return (
    <main
      id="pocket"
      className="mx-auto mt-12 max-w-3xl print:mt-0 print:max-w-none"
    >
      <header className="mb-10 text-center print:hidden">
        <p className="font-garamond text-xl italic text-muted-foreground">
          The papers, your flights, then one sheet per day. Print it before you
          go — the wifi in a Tokyo basement is not a plan.
        </p>
      </header>

      {dates.length === 0 && flightsPage.flights.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-8 py-16 text-center font-garamond text-lg text-muted-foreground">
          Nothing to print yet.
        </p>
      ) : (
        <>
          <PapersSheet legs={legs} docs={docs} />
          <FlightsSheet
            flights={flightsPage.flights}
            checklist={flightsPage.checklist}
          />
          {dates.map((date) => (
            <DaySheet
              key={date}
              date={date}
              leg={legForDay(legs, date)}
              rate={rate}
              note={days.find((d) => d.on_date === date)}
              items={decidedOn(items, date)}
              docs={docs.filter((d) => d.starts_at?.slice(0, 10) === date)}
            />
          ))}
        </>
      )}
    </main>
  );
}

const SHEET =
  "mb-8 break-after-page rounded-lg border border-border bg-card px-8 py-7 print:mb-0 print:rounded-none print:border-0 print:bg-transparent print:px-0 print:py-6";

/**
 * Every flight on one sheet: the page you want in hand at a check-in desk with
 * a dead phone. Times in each airport's own zone, the day change spelled out,
 * and the essentials as boxes to tick with a pen.
 */
function FlightsSheet({
  flights,
  checklist,
}: {
  flights: TripFlight[];
  checklist: ChecklistItem[];
}) {
  if (flights.length === 0) return null;

  return (
    <section className={SHEET}>
      <h2 className="font-garamond text-3xl text-foreground">Flights</h2>

      {groupJourneys(flights).map((journey) => {
        const items = checklist.filter((i) => journey.lists.includes(i.list));
        return (
          <div key={journey.id} className="mt-6 break-inside-avoid">
            <h3 className="font-raleway text-[0.65rem] uppercase tracking-[0.25em] text-primary">
              {JOURNEY_LABELS[journey.kind]}
            </h3>
            <ul className="mt-2 space-y-3">
              {journey.flights.map((f, i) => {
                const shift = dayShift(f);
                const layover = i > 0 ? journey.layovers[i - 1] : null;
                return (
                  <li key={f.id}>
                    {layover && (
                      <p className="mb-2 font-garamond text-sm text-muted-foreground italic">
                        {formatSpan(layover.minutes)} in{" "}
                        {journey.flights[i - 1].to_city ??
                          journey.flights[i - 1].to_airport}
                        {layover.changesAirport && ", changing airports"}
                      </p>
                    )}
                    <p className="font-mono text-lg text-foreground tabular-nums slashed-zero">
                      {f.from_airport} → {f.to_airport}
                      <span className="ml-3 font-raleway text-sm">
                        {f.airline} {f.flight_number}
                      </span>
                    </p>
                    <p className="font-mono text-xs text-foreground tabular-nums slashed-zero">
                      {formatDateIn(f.departs_at, f.departs_tz)}{" "}
                      {formatClockIn(f.departs_at, f.departs_tz)}{" "}
                      {zoneName(f.departs_at, f.departs_tz)} →{" "}
                      {formatDateIn(f.arrives_at, f.arrives_tz)}{" "}
                      {formatClockIn(f.arrives_at, f.arrives_tz)}{" "}
                      {zoneName(f.arrives_at, f.arrives_tz)}
                      {shift !== 0 &&
                        ` (${shift > 0 ? "+" : "−"}${Math.abs(shift)} day)`}{" "}
                      · {formatSpan(flightMinutes(f))}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground tabular-nums slashed-zero">
                      {[
                        f.confirmation && `Conf ${f.confirmation}`,
                        f.seat_aaron && `Aaron ${f.seat_aaron}`,
                        f.seat_savea && `Savea ${f.seat_savea}`,
                        f.departure_terminal &&
                          `Leaves ${f.departure_terminal}`,
                        f.baggage,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </li>
                );
              })}
            </ul>
            {items.length > 0 && (
              <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 font-garamond text-sm text-foreground"
                  >
                    <span
                      aria-hidden="true"
                      className="inline-block h-3 w-3 flex-none border border-foreground/60"
                    />
                    {item.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}

function PapersSheet({ legs, docs }: { legs: TripLeg[]; docs: TripDoc[] }) {
  const beds = legs.filter((l) => l.lodging_name);
  if (docs.length === 0 && beds.length === 0) return null;

  return (
    <section className={SHEET}>
      <h2 className="font-garamond text-3xl text-foreground">The papers</h2>
      <p className="mt-1 font-raleway text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
        Numbers you&apos;ll want without a signal
      </p>

      {beds.length > 0 && (
        <div className="mt-6">
          <h3 className="font-raleway text-[0.65rem] uppercase tracking-[0.25em] text-primary">
            Beds
          </h3>
          <ul className="mt-2 space-y-3">
            {beds.map((leg) => (
              <li key={leg.id}>
                <p className="font-garamond text-lg text-foreground">
                  {leg.lodging_name}
                  <span className="ml-2 font-mono text-xs text-muted-foreground tabular-nums slashed-zero">
                    {leg.starts_on} → {leg.ends_on}
                  </span>
                </p>
                {leg.lodging_address && (
                  <p className="font-garamond text-base text-muted-foreground">
                    {leg.lodging_address}
                  </p>
                )}
                {leg.lodging_confirmation && (
                  <p className="font-mono text-xs text-foreground tabular-nums slashed-zero">
                    {leg.lodging_confirmation}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {docs.length > 0 && (
        <div className="mt-6">
          <h3 className="font-raleway text-[0.65rem] uppercase tracking-[0.25em] text-primary">
            Everything else
          </h3>
          <ul className="mt-2 space-y-3">
            {docs.map((doc) => (
              <li key={doc.id}>
                <p className="font-garamond text-lg text-foreground">
                  {doc.title}
                  <span className="ml-2 font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                    {DOC_CATEGORIES[doc.category]}
                  </span>
                </p>
                {doc.detail && (
                  <p className="font-garamond text-base text-muted-foreground">
                    {doc.detail}
                  </p>
                )}
                {doc.confirmation && (
                  <p className="font-mono text-xs text-foreground tabular-nums slashed-zero">
                    {doc.confirmation}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function DaySheet({
  date,
  leg,
  note,
  items,
  docs,
  rate,
}: {
  rate: Rate;
  date: string;
  leg?: TripLeg;
  note?: TripDay;
  items: TripItem[];
  docs: TripDoc[];
}) {
  const day = parseDay(date);
  const cash = cashYen(items, rate);

  return (
    <section className={SHEET}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-3">
        <h2 className="font-garamond text-3xl text-foreground">
          {day.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h2>
        <p className="font-raleway text-[0.65rem] uppercase tracking-[0.25em] text-primary">
          {note?.title || leg?.name}
          {leg?.name_ja && (
            <span className="ml-1.5 font-jp">{leg.name_ja}</span>
          )}
        </p>
      </div>

      {(leg?.lodging_name || cash > 0) && (
        <p className="mt-3 flex flex-wrap gap-x-4 font-mono text-xs text-muted-foreground tabular-nums slashed-zero">
          {leg?.lodging_name && <span>Bed: {leg.lodging_name}</span>}
          {cash > 0 && <span>Cash on you: {formatYen(cash)}</span>}
        </p>
      )}

      {note?.note && (
        <p className="mt-3 font-garamond text-base leading-relaxed text-foreground/90">
          {note.note}
        </p>
      )}

      {docs.length > 0 && (
        <ul className="mt-4 space-y-1 border-l-2 border-kind-transit pl-3">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="font-mono text-xs text-foreground tabular-nums slashed-zero"
            >
              {doc.starts_at && `${doc.starts_at.slice(11, 16)} · `}
              {doc.title}
              {doc.confirmation && ` · ${doc.confirmation}`}
            </li>
          ))}
        </ul>
      )}

      {items.length === 0 ? (
        <p className="mt-6 font-garamond text-base italic text-muted-foreground">
          Nothing planned.
        </p>
      ) : (
        <ol className="mt-5 space-y-4">
          {items.map((item) => (
            <li key={item.id} className="grid grid-cols-[3.5rem_1fr] gap-3">
              <span className="pt-0.5 text-right font-mono text-xs leading-snug text-muted-foreground tabular-nums slashed-zero">
                {item.start_time ? formatClock(item.start_time) : "—"}
              </span>
              <div>
                <p className="font-garamond text-lg leading-tight text-foreground">
                  {item.title}
                  {item.title_ja && (
                    <span className="ml-2 font-jp text-sm text-muted-foreground">
                      {item.title_ja}
                    </span>
                  )}
                </p>
                <p className="font-mono text-[0.65rem] tracking-wide text-muted-foreground tabular-nums slashed-zero">
                  {KINDS[item.kind].label.toLowerCase()} ·{" "}
                  {formatDuration(itemLength(item))}
                  {item.cost_amount !== null && ` · ${formatCost(item)}`}
                  {item.booking_ref && ` · ${item.booking_ref}`}
                </p>
                {item.address && (
                  <p className="font-garamond text-sm leading-snug text-muted-foreground">
                    {item.address}
                  </p>
                )}
                {item.notes && (
                  <p className="font-garamond text-sm leading-snug text-foreground/90">
                    {item.notes}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
