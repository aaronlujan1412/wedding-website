import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { TimelineConnector } from "@/components/schedule/TimelineConnector";
import { Seal } from "@/components/honeymoon/Seal";
import { getTripBoard } from "@/lib/honeymoon-queries";
import {
  KINDS,
  eachDay,
  formatClock,
  formatDuration,
  formatYen,
  itemLength,
  itemsIn,
  parseDay,
  sumYen,
  yenToUsd,
} from "@/components/honeymoon/trip";
import type { TripDay, TripItem, TripLeg } from "@/components/honeymoon/types";

/** Host-only and always live — never prerender it with build-time rows. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Honeymoon itinerary",
  robots: { index: false, follow: false },
};

/**
 * The read side of the board.
 *
 * Same data, no drag handles, no warnings — the trip as you'd want to look at
 * it on the couch, in the same timeline language as the wedding schedule page.
 */
export default async function ItineraryPage() {
  const { legs, days, items, docs } = await getTripBoard();
  const spend = sumYen(items) + sumYen(docs);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 pt-40 pb-24">
      <header className="mb-16 text-center md:mb-24">
        <p className="font-raleway text-xs uppercase tracking-[0.3em] text-primary">
          {legs.length === 0
            ? "Nothing planned yet"
            : legs.map((l) => l.name).join(" · ")}
        </p>
        <h1 className="mt-3 font-corinthia text-7xl text-pop md:text-8xl">
          Our Honeymoon
        </h1>
        {legs.length > 0 && (
          <p className="mx-auto mt-4 max-w-xl font-garamond text-xl italic text-muted-foreground md:text-2xl">
            {formatRange(legs)}
            {spend > 0 && ` · ${formatYen(spend)} / ${yenToUsd(spend)}`}
          </p>
        )}
        <Link
          href="/honeymoon"
          className="mt-6 inline-flex items-center gap-1.5 rounded-sm font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Back to the board
        </Link>
      </header>

      {legs.length === 0 && (
        <p className="rounded-lg border border-dashed border-border px-8 py-16 text-center font-garamond text-lg text-muted-foreground">
          Add a leg on the board and the itinerary writes itself.
        </p>
      )}

      <div className="space-y-20 md:space-y-24">
        {legs.map((leg) => (
          <LegSection key={leg.id} leg={leg} items={items} notes={days} />
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
  const end = legs.reduce((a, l) => (l.ends_on > a ? l.ends_on : a), legs[0].ends_on);
  const opts = { month: "long", day: "numeric" } as const;
  return `${parseDay(start).toLocaleDateString("en-US", opts)} – ${parseDay(
    end,
  ).toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
}

function LegSection({
  leg,
  items,
  notes,
}: {
  leg: TripLeg;
  items: TripItem[];
  notes: TripDay[];
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
        {leg.lodging_name && (
          <p className="mt-2 font-garamond text-lg text-muted-foreground">
            {leg.lodging_name}
            {leg.lodging_check_in && (
              <span className="font-mono text-xs tabular-nums slashed-zero">
                {" "}
                · in {leg.lodging_check_in}
              </span>
            )}
          </p>
        )}
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
            items={itemsIn(items, date)}
          />
        ))}
      </div>
    </section>
  );
}

function DaySection({
  date,
  note,
  items,
}: {
  date: string;
  note?: TripDay;
  items: TripItem[];
}) {
  const day = parseDay(date);
  const spend = sumYen(items);

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

      {items.length === 0 ? (
        <p className="font-garamond text-lg italic text-muted-foreground">
          Nothing planned. Leave it that way.
        </p>
      ) : (
        items.map((item, i) => (
          <article
            key={item.id}
            className="grid grid-cols-[3rem_1fr] gap-x-4 md:grid-cols-[4rem_1fr] md:gap-x-8"
          >
            <div className="flex flex-col items-center" aria-hidden="true">
              <span
                className="z-10 flex h-11 w-11 items-center justify-center rounded-full bg-card text-lg md:h-14 md:w-14 md:text-2xl"
                style={{ boxShadow: `0 0 0 2px ${KINDS[item.kind].color}` }}
              >
                {KINDS[item.kind].glyph}
              </span>
              {i !== items.length - 1 && <TimelineConnector />}
            </div>

            <div className="pb-10">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary tabular-nums slashed-zero">
                    {item.start_time
                      ? `${formatClock(item.start_time)} · ${formatDuration(itemLength(item))}`
                      : KINDS[item.kind].label}
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
                {item.cost_yen !== null && <span>{formatYen(item.cost_yen)}</span>}
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
        ))
      )}
    </div>
  );
}
