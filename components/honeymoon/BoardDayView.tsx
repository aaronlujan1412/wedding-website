"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  BedDouble,
  Check,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DayHeader } from "./DayHeader";
import { ItemCardFace, type CardActions } from "./ItemCard";
import { flightsOnDay } from "./flights";
import { transitOnDay } from "./transit";
import { sleepsOn, staysIn } from "./stays";
import {
  BOOKING_STATUSES,
  LANES,
  LANE_ORDER,
  LIGHT_ORDER,
  formatDuration,
  isAdopted,
  itemsInCell,
  layoutDay,
  legForDay,
  legsIn,
  parseDay,
} from "./trip";
import type {
  Lane,
  TripDay,
  TripFlight,
  TripTransit,
  TripItem,
  TripLeg,
  TripStay,
} from "./types";

/** The strip's first stop: every lane's cards with no day yet. */
export const PILES = "piles";

/**
 * The board on a phone.
 *
 * Twenty day columns crossed with three lanes is a desk layout. On a phone the
 * same board is a book you page through: one day at a time, its three lanes
 * stacked down the page, a strip of every day pinned under the site bar, and a
 * swipe to turn the page. Nothing is dragged — the buttons on each card move
 * it, which is what a thumb is good at.
 */
export function BoardDayView({
  selected,
  onSelect,
  days,
  legs,
  stays,
  items,
  dayNotes,
  flights,
  transit,
  today,
  actions,
  onAdd,
  onEditLeg,
  onCreateLeg,
  onAdoptLeg,
  onAdoptRoute,
  onEditNote,
  onSortByTime,
}: {
  selected: string;
  onSelect: (day: string) => void;
  days: string[];
  legs: TripLeg[];
  stays: TripStay[];
  items: TripItem[];
  dayNotes: TripDay[];
  flights: TripFlight[];
  transit: TripTransit[];
  today: string;
  actions: CardActions;
  onAdd: (lane: Lane, date: string | null) => void;
  onEditLeg: (leg: TripLeg) => void;
  onCreateLeg: (lane: Lane, from: string, to: string) => void;
  onAdoptLeg: (leg: TripLeg) => void;
  onAdoptRoute: (lane: Lane) => void;
  onEditNote: (date: string) => void;
  onSortByTime: (date: string) => void;
}) {
  const order = [PILES, ...days];
  const index = order.indexOf(selected);
  const prev = index > 0 ? order[index - 1] : null;
  const next = index < order.length - 1 ? order[index + 1] : null;

  // Which way the page turned, so the new one slides in from that side.
  const [turn, setTurn] = useState<"forward" | "back">("forward");
  const go = (day: string | null) => {
    if (!day) return;
    setTurn(order.indexOf(day) < index ? "back" : "forward");
    onSelect(day);
  };

  const page = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLOListElement>(null);
  const firstRender = useRef(true);

  // Keep the chosen day centred in the strip, and bring the top of the new
  // page into view if you turned it from further down the old one.
  useEffect(() => {
    const chip = strip.current?.querySelector<HTMLElement>(
      `[data-day="${selected}"]`,
    );
    if (chip && strip.current) {
      strip.current.scrollTo({
        left:
          chip.offsetLeft -
          strip.current.clientWidth / 2 +
          chip.clientWidth / 2,
        behavior: firstRender.current ? "auto" : "smooth",
      });
    }
    if (!firstRender.current && page.current) {
      if (page.current.getBoundingClientRect().top < 0) {
        page.current.scrollIntoView({ block: "start" });
      }
    }
    firstRender.current = false;
  }, [selected]);

  const touch = useRef<{ x: number; y: number; at: number } | null>(null);

  return (
    <div className="lg:hidden">
      <nav
        aria-label="Days"
        className="sticky top-planner-bar z-20 -mx-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur-sm sm:-mx-6 sm:px-6"
      >
        <ol
          ref={strip}
          className="rail-scroll flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <li className="flex-none">
            <button
              type="button"
              data-day={PILES}
              onClick={() => go(PILES)}
              aria-current={selected === PILES ? "page" : undefined}
              className={chip(selected === PILES)}
            >
              <Inbox className="mt-2 h-4 w-4" strokeWidth={1.5} />
              <span className="font-raleway text-[0.55rem] uppercase tracking-[0.12em]">
                Piles
              </span>
              <span className="font-mono text-[0.55rem] tabular-nums">
                {items.filter((i) => i.on_date === null).length}
              </span>
            </button>
          </li>
          {days.map((date, i) => (
            <li key={date} className="flex-none">
              <DayChip
                date={date}
                newMonth={
                  i === 0 ||
                  parseDay(days[i - 1]).getMonth() !== parseDay(date).getMonth()
                }
                items={items.filter((it) => it.on_date === date)}
                active={selected === date}
                isToday={date === today}
                onClick={() => go(date)}
              />
            </li>
          ))}
        </ol>
      </nav>

      <div
        ref={page}
        // Clears the planner bar and the sticky day strip under it.
        className="touch-pan-y touch-pinch-zoom scroll-mt-[calc(var(--spacing-planner-bar)+4.75rem)]"
        // Pointer events rather than touch events, with the browser left to
        // handle vertical scrolling and pinch only: a sideways flick then
        // reaches us instead of being claimed as a pan and cancelled.
        onPointerDown={(e) => {
          if (e.pointerType === "mouse") return;
          const target = e.target as HTMLElement;
          if (target.closest("input, textarea, select, .rail-scroll")) return;
          touch.current = { x: e.clientX, y: e.clientY, at: Date.now() };
        }}
        onPointerCancel={() => {
          touch.current = null;
        }}
        onPointerUp={(e) => {
          const start = touch.current;
          touch.current = null;
          if (!start) return;
          const dx = e.clientX - start.x;
          const dy = e.clientY - start.y;
          // A deliberate sideways flick, not a scroll that wandered.
          if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 2) return;
          if (Date.now() - start.at > 700) return;
          go(dx < 0 ? next : prev);
        }}
      >
        <div
          key={selected}
          className={cn(
            "animate-in fade-in-0 duration-200 motion-reduce:animate-none",
            turn === "forward"
              ? "slide-in-from-right-6"
              : "slide-in-from-left-6",
          )}
        >
          {selected === PILES ? (
            <PilesPage
              items={items}
              legs={legs}
              actions={actions}
              onAdd={onAdd}
              onAdoptRoute={onAdoptRoute}
            />
          ) : (
            <DayPage
              date={selected}
              legs={legs}
              stays={stays}
              items={items}
              note={dayNotes.find((d) => d.on_date === selected)}
              flights={flights}
              transit={transit}
              isToday={selected === today}
              actions={actions}
              onAdd={onAdd}
              onEditLeg={onEditLeg}
              onCreateLeg={onCreateLeg}
              onAdoptLeg={onAdoptLeg}
              onEditNote={onEditNote}
              onSortByTime={onSortByTime}
            />
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <PageTurn day={prev} direction="back" onClick={() => go(prev)} />
          <PageTurn day={next} direction="forward" onClick={() => go(next)} />
        </div>
      </div>
    </div>
  );
}

function chip(active: boolean, isToday = false) {
  return cn(
    "flex h-16 w-12 flex-col items-center justify-start rounded-lg border transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-paper text-foreground",
    isToday && !active && "ring-1 ring-primary",
  );
}

function DayChip({
  date,
  newMonth,
  items,
  active,
  isToday,
  onClick,
}: {
  date: string;
  newMonth: boolean;
  items: TripItem[];
  active: boolean;
  isToday: boolean;
  onClick: () => void;
}) {
  const day = parseDay(date);
  const decided = items.filter((i) => i.lane === "decided");
  // Ready first, then still to book, then plain plans.
  const lights = decided
    .map((i) => BOOKING_STATUSES[i.booking_status].light)
    .sort((a, b) => LIGHT_ORDER[a] - LIGHT_ORDER[b])
    .slice(0, 5);
  const ideas = (["savea", "aaron"] as const).filter((lane) =>
    items.some((i) => i.lane === lane),
  );

  return (
    <button
      type="button"
      data-day={date}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={day.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })}
      className={chip(active, isToday)}
    >
      <span
        className={cn(
          "mt-1 h-2.5 font-raleway text-[0.5rem] uppercase leading-none tracking-[0.12em]",
          active ? "text-primary-foreground/80" : "text-primary",
        )}
      >
        {newMonth && day.toLocaleDateString("en-US", { month: "short" })}
      </span>
      <span
        className={cn(
          "font-raleway text-[0.55rem] uppercase leading-tight",
          active ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
      >
        {day.toLocaleDateString("en-US", { weekday: "narrow" })}
      </span>
      <span className="font-mono text-sm leading-none tabular-nums slashed-zero">
        {day.getDate()}
      </span>
      {/* Decided cards as pips — green booked, amber to book, grey a plan —
          then a dot for each of you with an idea on this day. On the chosen
          day the chip itself is green, so booked turns white instead. */}
      <span className="mt-1 flex h-1 items-center gap-px" aria-hidden="true">
        {lights.map((light, i) => (
          <span
            key={i}
            className={cn(
              "h-1 w-1 rounded-full",
              light === "pending"
                ? "bg-caution"
                : light === "ready"
                  ? active
                    ? "bg-primary-foreground"
                    : "bg-ready"
                  : active
                    ? "bg-primary-foreground/40"
                    : "bg-border",
            )}
          />
        ))}
      </span>
      <span
        className="mt-0.5 flex h-1.5 items-center gap-0.5"
        aria-hidden="true"
      >
        {ideas.map((lane) => (
          <span
            key={lane}
            className="h-1.5 w-1.5 rounded-full ring-1 ring-background"
            style={{ backgroundColor: LANES[lane].accent }}
          />
        ))}
      </span>
    </button>
  );
}

function DayPage({
  date,
  legs,
  stays,
  items,
  note,
  flights,
  transit,
  isToday,
  actions,
  onAdd,
  onEditLeg,
  onCreateLeg,
  onAdoptLeg,
  onEditNote,
  onSortByTime,
}: {
  date: string;
  legs: TripLeg[];
  stays: TripStay[];
  items: TripItem[];
  note?: TripDay;
  flights: TripFlight[];
  transit: TripTransit[];
  isToday: boolean;
  actions: CardActions;
  onAdd: (lane: Lane, date: string | null) => void;
  onEditLeg: (leg: TripLeg) => void;
  onCreateLeg: (lane: Lane, from: string, to: string) => void;
  onAdoptLeg: (leg: TripLeg) => void;
  onEditNote: (date: string) => void;
  onSortByTime: (date: string) => void;
}) {
  return (
    <article className="pt-5">
      <DayHeader
        variant="page"
        date={date}
        note={note}
        legs={legs}
        laneItems={itemsInCell(items, "decided", date)}
        flights={flightsOnDay(flights, date)}
        transit={transitOnDay(transit, date)}
        isToday={isToday}
        onEditNote={onEditNote}
        onSortByTime={onSortByTime}
      />

      <div className="mt-5 space-y-3">
        {LANE_ORDER.map((lane) => {
          const meta = LANES[lane];
          const cards = itemsInCell(items, lane, date);
          return (
            <section
              key={lane}
              aria-label={meta.label}
              className="rounded-xl border border-border/70 px-3 py-3"
              style={{ backgroundColor: meta.tint }}
            >
              <div className="flex min-h-9 items-center gap-2">
                <h3
                  className="flex-none font-raleway text-[0.65rem] font-semibold uppercase tracking-[0.2em]"
                  style={{ color: meta.accent }}
                >
                  {meta.label}
                </h3>
                <LegChip
                  lane={lane}
                  date={date}
                  legs={legs}
                  stays={stays}
                  onEdit={onEditLeg}
                  onCreate={onCreateLeg}
                  onAdopt={onAdoptLeg}
                />
              </div>

              {cards.length > 0 && (
                <ol className="mt-2">
                  {lane === "decided"
                    ? layoutDay(cards).map((row) =>
                        row.kind === "gap" ? (
                          <li
                            key={row.key}
                            className="flex items-center gap-2 py-1.5 pl-1 font-mono text-[0.65rem] text-muted-foreground tabular-nums slashed-zero"
                          >
                            <span className="h-px w-4 bg-border" />
                            {formatDuration(row.minutes)} open
                          </li>
                        ) : (
                          <li key={row.item.id} className="pb-2">
                            <ItemCardFace item={row.item} actions={actions} />
                          </li>
                        ),
                      )
                    : cards.map((item) => (
                        <li key={item.id} className="pb-2">
                          <ItemCardFace item={item} actions={actions} />
                        </li>
                      ))}
                </ol>
              )}

              <AddButton
                className={cards.length ? "mt-0" : "mt-2"}
                onClick={() => onAdd(lane, date)}
              >
                {lane === "decided" ? "Add to Decided" : "Add an idea"}
              </AddButton>
            </section>
          );
        })}
      </div>
    </article>
  );
}

/**
 * Where this lane has you today. The board's leg bands, reduced to the one
 * day on screen: tap to edit, the arrow to agree to it, or "Where?" to start a
 * leg on this day.
 */
function LegChip({
  lane,
  date,
  legs,
  stays,
  onEdit,
  onCreate,
  onAdopt,
}: {
  lane: Lane;
  date: string;
  legs: TripLeg[];
  stays: TripStay[];
  onEdit: (leg: TripLeg) => void;
  onCreate: (lane: Lane, from: string, to: string) => void;
  onAdopt: (leg: TripLeg) => void;
}) {
  const meta = LANES[lane];
  const leg = legForDay(legsIn(legs, lane), date);
  const bed = staysIn(stays, lane).find((s) => sleepsOn(s, date));

  if (!leg) {
    return (
      <button
        type="button"
        onClick={() => onCreate(lane, date, date)}
        className="ml-auto flex h-9 items-center gap-1 rounded-md border border-dashed border-border px-3 font-raleway text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
      >
        <Plus className="h-3 w-3" strokeWidth={2} />
        Where?
      </button>
    );
  }

  const adopted = isAdopted(leg, legs);

  return (
    <div className="ml-auto flex min-w-0 items-center gap-1.5">
      <button
        type="button"
        onClick={() => onEdit(leg)}
        className="flex h-9 min-w-0 items-center gap-1.5 rounded-md border bg-background/70 px-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
        style={{ borderColor: meta.accent }}
      >
        <span className="truncate font-raleway text-xs font-semibold text-foreground">
          {leg.name}
        </span>
        {bed && (
          <span className="flex min-w-0 items-center gap-0.5 font-garamond text-xs text-muted-foreground">
            <BedDouble className="h-3 w-3 flex-none" strokeWidth={1.5} />
            <span className="truncate">{bed.name}</span>
          </span>
        )}
      </button>
      {lane !== "decided" &&
        (adopted ? (
          <span
            title="Decided already has this leg"
            className="flex h-9 w-9 flex-none items-center justify-center text-primary"
          >
            <Check className="h-4 w-4" strokeWidth={2} />
            <span className="sr-only">Agreed</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onAdopt(leg)}
            aria-label={`Use ${leg.name} in Decided`}
            className="flex h-9 w-9 flex-none items-center justify-center rounded-md border border-primary/60 text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2} />
          </button>
        ))}
    </div>
  );
}

function PilesPage({
  items,
  legs,
  actions,
  onAdd,
  onAdoptRoute,
}: {
  items: TripItem[];
  legs: TripLeg[];
  actions: CardActions;
  onAdd: (lane: Lane, date: string | null) => void;
  onAdoptRoute: (lane: Lane) => void;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const matches = (item: TripItem) =>
    !needle ||
    `${item.title} ${item.title_ja ?? ""} ${item.city ?? ""} ${item.notes ?? ""}`
      .toLowerCase()
      .includes(needle);

  return (
    <article className="pt-5">
      <p className="font-raleway text-[0.65rem] uppercase tracking-[0.25em] text-primary">
        No day yet
      </p>
      <h2 className="font-garamond text-3xl leading-tight text-foreground">
        The piles
      </h2>
      <p className="mt-1 font-garamond text-base leading-snug text-muted-foreground">
        Ideas that haven&apos;t landed anywhere. The arrow on a card gives it
        the first day; open it to pick any day.
      </p>

      <label className="relative mt-4 block">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={1.75}
        />
        <span className="sr-only">Search the piles</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the piles"
          className="h-11 w-full rounded-lg border border-input bg-background pr-3 pl-9 font-raleway text-base text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </label>

      <div className="mt-4 space-y-3">
        {LANE_ORDER.map((lane) => {
          const meta = LANES[lane];
          const all = itemsInCell(items, lane, null);
          const cards = all.filter(matches);
          return (
            <section
              key={lane}
              aria-label={meta.pile}
              className="rounded-xl border border-border/70 px-3 py-3"
              style={{ backgroundColor: meta.tint }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3
                  className="font-raleway text-[0.65rem] font-semibold uppercase tracking-[0.2em]"
                  style={{ color: meta.accent }}
                >
                  {meta.pile}
                </h3>
                <span className="font-mono text-[0.65rem] text-muted-foreground tabular-nums">
                  {all.length}
                </span>
              </div>
              {lane !== "decided" && legsIn(legs, lane).length > 0 && (
                <button
                  type="button"
                  onClick={() => onAdoptRoute(lane)}
                  className="mt-1 flex h-9 items-center font-raleway text-[0.65rem] uppercase tracking-[0.2em] underline underline-offset-4"
                  style={{ color: meta.accent }}
                >
                  Use this whole route
                </button>
              )}

              {cards.length > 0 ? (
                <ol className="mt-2">
                  {cards.map((item) => (
                    <li key={item.id} className="pb-2">
                      <ItemCardFace item={item} actions={actions} />
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 font-garamond text-sm text-muted-foreground italic">
                  {all.length === 0
                    ? "Nothing loose."
                    : "Nothing matches that."}
                </p>
              )}

              <AddButton className="mt-2" onClick={() => onAdd(lane, null)}>
                Add an idea
              </AddButton>
            </section>
          );
        })}
      </div>
    </article>
  );
}

function AddButton({
  onClick,
  className,
  children,
}: {
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-background/40 font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground active:bg-background focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
        className,
      )}
    >
      <Plus className="h-3.5 w-3.5" strokeWidth={2} />
      {children}
    </button>
  );
}

function PageTurn({
  day,
  direction,
  onClick,
}: {
  day: string | null;
  direction: "back" | "forward";
  onClick: () => void;
}) {
  if (!day) return <span />;
  const label =
    day === PILES
      ? "Piles"
      : parseDay(day).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-12 items-center gap-2 rounded-lg border border-border bg-card px-3 font-raleway text-xs text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        direction === "forward" && "justify-end text-right",
      )}
    >
      {direction === "back" && (
        <ChevronLeft
          className="h-4 w-4 text-muted-foreground"
          strokeWidth={1.75}
        />
      )}
      <span>
        <span className="block font-raleway text-[0.55rem] uppercase tracking-[0.2em] text-muted-foreground">
          {direction === "back" ? "Before" : "Next"}
        </span>
        {label}
      </span>
      {direction === "forward" && (
        <ChevronRight
          className="h-4 w-4 text-muted-foreground"
          strokeWidth={1.75}
        />
      )}
    </button>
  );
}
