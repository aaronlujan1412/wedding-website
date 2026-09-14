import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTripBoard } from "@/lib/honeymoon-queries";
import {
  DOC_CATEGORIES,
  KINDS,
  cashYen,
  formatClock,
  formatDuration,
  formatYen,
  itemLength,
  decidedOn,
  legForDay,
  parseDay,
  tripDays,
} from "@/components/honeymoon/trip";
import type { TripDay, TripDoc, TripItem, TripLeg } from "@/components/honeymoon/types";

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
  const { legs, days, items, docs } = await getTripBoard();
  const dates = tripDays(legs);

  return (
    <main
      id="pocket"
      className="mx-auto min-h-screen max-w-3xl px-6 pt-40 pb-24 print:max-w-none print:px-0 print:pt-0 print:pb-0"
    >
      <header className="mb-12 print:hidden">
        <p className="font-raleway text-xs uppercase tracking-[0.3em] text-primary">
          For printing
        </p>
        <h1 className="mt-3 font-corinthia text-7xl text-pop md:text-8xl">
          Pocket card
        </h1>
        <p className="mt-3 max-w-xl font-garamond text-xl italic text-muted-foreground">
          One sheet per day. Print it before you go — the wifi in a Tokyo
          basement is not a plan.
        </p>
        <Link
          href="/honeymoon"
          className="mt-6 inline-flex items-center gap-1.5 rounded-sm font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Back to the board
        </Link>
      </header>

      {dates.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-8 py-16 text-center font-garamond text-lg text-muted-foreground">
          Nothing to print yet.
        </p>
      ) : (
        <>
          <PapersSheet legs={legs} docs={docs} />
          {dates.map((date) => (
            <DaySheet
              key={date}
              date={date}
              leg={legForDay(legs, date)}
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
}: {
  date: string;
  leg?: TripLeg;
  note?: TripDay;
  items: TripItem[];
  docs: TripDoc[];
}) {
  const day = parseDay(date);
  const cash = cashYen(items);

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
          {leg?.name_ja && <span className="ml-1.5 font-jp">{leg.name_ja}</span>}
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
                  {item.cost_yen !== null && ` · ${formatYen(item.cost_yen)}`}
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
