"use client";

import { Fragment, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { MapPinned, Plus, X } from "lucide-react";
import {
  adoptLeg,
  adoptRoute,
  copyItem,
  deleteItem,
  moveItem,
  restoreItem,
  sortDayByTime,
} from "@/app/actions/honeymoon";
import { cn } from "@/lib/utils";
import { BoardDayView, PILES } from "./BoardDayView";
import { DayHeader } from "./DayHeader";
import { DayNoteDialog } from "./DayNoteDialog";
import { DayRibbon, RIBBON_PREFIX } from "./DayRibbon";
import { ItemCardFace, type CardActions } from "./ItemCard";
import { ItemDialog, type ItemDraft } from "./ItemDialog";
import { LaneCell } from "./LaneCell";
import { IdeaPanel } from "./IdeaPanel";
import { LegBand } from "./LegBand";
import { LegDialog, type LegDraft } from "./LegDialog";
import { TripBar } from "./TripBar";
import { TripDialog, type TripDraft } from "./TripDialog";
import { ConfirmDialog, type ConfirmRequest } from "./ConfirmDialog";
import { BoardProvider } from "./BoardContext";
import { flightsOnDay } from "./flights";
import { payableRides, transitIn, transitOnDay } from "./transit";
import { staysIn } from "./stays";
import { useLiveRefresh } from "./useLiveRefresh";
import { TripDocsPanel } from "./TripDocsPanel";
import {
  BOARD_VIEWS,
  LANES,
  VIEW_ORDER,
  PLANNERS,
  adoptEffect,
  cellId,
  describeRate,
  eachDay,
  formatLegDates,
  formatYen,
  itemsIn,
  itemsInCell,
  legForDay,
  legsIn,
  nudgeTarget,
  parseCell,
  parseDay,
  positionBetween,
  sumYen,
  todayISO,
  tripDays,
  yenAsUsd,
  isBoardView,
} from "./trip";
import type { BoardView } from "./trip";
import type { Lane, TripBoard, TripItem, TripLeg } from "./types";

const COLUMN = "19rem";

export function HoneymoonBoard({ board }: { board: TripBoard }) {
  const { trip, legs, days: dayNotes, docs, stays, rate } = board;

  // Local mirror, so a drag lands instantly instead of waiting on the round
  // trip. When the server action revalidates and new rows arrive, adopt them
  // during render — React's documented way to reset state on a prop change,
  // and it avoids the cascading re-render an effect would cause.
  const [items, setItems] = useState(board.items);
  const [seededFrom, setSeededFrom] = useState(board.items);
  if (seededFrom !== board.items) {
    setSeededFrom(board.items);
    setItems(board.items);
  }

  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ItemDraft | null>(null);
  const [noteDate, setNoteDate] = useState<string | null>(null);
  const [legDraft, setLegDraft] = useState<LegDraft | null>(null);
  const [tripDraft, setTripDraft] = useState<TripDraft | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [notice, setNoticeState] = useState<{
    tone: "ok" | "error";
    text: string;
    /** On a phone, a "Go" button to the day the card just moved to. */
    goTo?: string;
    /** Puts back whatever the last action removed. */
    undo?: () => void;
  } | null>(null);
  // On a phone the notice is a toast over the page, so a success clears itself.
  // Errors stay until dismissed.
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function setNotice(next: typeof notice) {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNoticeState(next);
    if (next?.tone === "ok") {
      // An undo needs long enough to notice it, read it and reach it.
      noticeTimer.current = setTimeout(
        () => setNoticeState(null),
        next.undo ? 12000 : 5000,
      );
    }
  }

  // The phone board shows one day at a time, kept in the URL so a refresh or
  // the back button lands on the same page.
  const searchParams = useSearchParams();
  const [mobileDay, setMobileDay] = useState(
    () => searchParams.get("day") ?? "",
  );
  const [activeLegId, setActiveLegId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // The view lives in the URL so it survives a refresh and can be bookmarked —
  // there is no login here, so "Aaron's view" is a link, not an account.
  const [view, setViewState] = useState<BoardView>(() =>
    isBoardView(searchParams.get("view"))
      ? (searchParams.get("view") as BoardView)
      : "decided",
  );
  function setView(next: BoardView) {
    setViewState(next);
    setPileLane(BOARD_VIEWS[next].lanes[0]);
    window.history.replaceState(null, "", `?view=${next}`);
  }
  const [pileLane, setPileLane] = useState<Lane>("decided");
  const [pileOpen, setPileOpen] = useState(true);
  const [, startTransition] = useTransition();

  // Paused while anything is in progress, so a refresh never yanks work.
  useLiveRefresh(
    activeId !== null ||
      draft !== null ||
      noteDate !== null ||
      legDraft !== null ||
      tripDraft !== null ||
      confirm !== null,
  );

  const today = todayISO();
  // The trip's own dates, so a day nobody has assigned a city to is an ordinary
  // empty column. Falling back to the legs keeps a board with no trip readable.
  const allDays = useMemo(
    () => (trip ? eachDay(trip.starts_on, trip.ends_on) : tripDays(legs)),
    [trip, legs],
  );
  const dayShown =
    mobileDay === PILES || allDays.includes(mobileDay)
      ? mobileDay
      : allDays.includes(today)
        ? today
        : (allDays[0] ?? PILES);
  function showDay(day: string) {
    setMobileDay(day);
    window.history.replaceState(null, "", `?day=${day}`);
  }
  const dayLookup = useMemo(() => new Set(allDays), [allDays]);

  // Columns span every day any lane's route covers, so a proposed extra night
  // has somewhere to sit. The leg filter only offers the agreed route's legs.
  const decidedLegs = legsIn(legs, "decided");
  const activeLeg = decidedLegs.find((l) => l.id === activeLegId) ?? null;
  const visibleDays = activeLeg
    ? eachDay(activeLeg.starts_on, activeLeg.ends_on)
    : allDays;

  const decided = items.filter((i) => i.lane === "decided");
  // The header names the agreed day, so only the agreed route's rides belong
  // in it. A suggested night bus lives on the Transit tab until it's adopted.
  const decidedTransit = transitIn(board.transit, "decided");
  const suggested = items.filter(
    (i) => i.lane !== "decided" && i.on_date !== null,
  );
  // Flights and agreed stays count toward the trip total like any other cost.
  const spend =
    sumYen(decided, rate) +
    sumYen(docs, rate) +
    sumYen(board.flights, rate) +
    // Rides the rail pass covers cost nothing on the day — the pass itself is
    // a trip_docs row and its price is counted there instead.
    sumYen(payableRides(decidedTransit), rate) +
    sumYen(staysIn(stays, "decided"), rate);

  /**
   * Adopting a leg into Decided. If nothing in Decided is on those dates it just
   * happens; if something would be replaced or shortened, say what first —
   * that's the other person's plan about to be overwritten.
   */
  function requestAdoptLeg(leg: TripLeg) {
    const run = () =>
      startTransition(async () => {
        const result = await adoptLeg(leg.id);
        setNotice(
          result.error
            ? { tone: "error", text: result.error }
            : {
                tone: "ok",
                text: `${leg.name} (${formatLegDates(leg)}) is in Decided.`,
              },
        );
      });

    const { replaced, shortened } = adoptEffect(leg, legs);
    if (replaced.length === 0 && shortened.length === 0) return run();

    setConfirm({
      title: `Use ${leg.name} in Decided?`,
      confirmLabel: "Use it",
      onConfirm: run,
      body: (
        <>
          <p>
            Decided gets {leg.name} for {formatLegDates(leg)}.
          </p>
          {replaced.length > 0 && (
            <p>
              <strong>Replaces</strong>{" "}
              {replaced
                .map((l) => `${l.name} (${formatLegDates(l)})`)
                .join(", ")}
              .
            </p>
          )}
          {shortened.length > 0 && (
            <p>
              <strong>Shortens</strong>{" "}
              {shortened
                .map((l) => `${l.name} (${formatLegDates(l)})`)
                .join(", ")}
              .
            </p>
          )}
          <p className="text-muted-foreground">Cards stay on their days.</p>
        </>
      ),
    });
  }

  function requestAdoptRoute(lane: Lane) {
    const who = PLANNERS[LANES[lane].planner ?? "aaron"].label;
    const run = () =>
      startTransition(async () => {
        const result = await adoptRoute(lane);
        setNotice(
          result.error
            ? { tone: "error", text: result.error }
            : { tone: "ok", text: `Decided now follows ${who}'s route.` },
        );
      });

    if (decidedLegs.length === 0) return run();

    // A route can be shorter than what Decided covers now. Days nobody's route
    // reaches any more leave the board, and cards on them go back to their
    // piles — the database does that sweep, so say it here first.
    const after = tripDays([
      ...legs.filter((l) => l.lane !== "decided"),
      ...legsIn(legs, lane),
    ]);
    const lostDays = allDays.filter((d) => !after.includes(d));
    const strandedCards = items.filter(
      (i) => i.on_date !== null && lostDays.includes(i.on_date),
    ).length;

    setConfirm({
      title: `Use ${who}'s whole route?`,
      confirmLabel: `Use ${who}'s route`,
      onConfirm: run,
      body: (
        <>
          <p>
            <strong>Replaces all {decidedLegs.length} Decided legs</strong>:{" "}
            {decidedLegs
              .map((l) => `${l.name} (${formatLegDates(l)})`)
              .join(", ")}
            .
          </p>
          {lostDays.length > 0 && (
            <p>
              <strong>
                {formatLegDates({
                  starts_on: lostDays[0],
                  ends_on: lostDays[lostDays.length - 1],
                })}{" "}
                {lostDays.length === 1 ? "drops" : "drop"} off the board
              </strong>
              {strandedCards > 0 &&
                ` — ${strandedCards} ${strandedCards === 1 ? "card" : "cards"} on ${
                  lostDays.length === 1 ? "it goes" : "them go"
                } back to ${strandedCards === 1 ? "its pile" : "their piles"}`}
              .
            </p>
          )}
          <p className="text-muted-foreground">
            {who}&apos;s own lane is left as it is
            {lostDays.length === 0 && ", and cards stay on their days"}.
          </p>
        </>
      ),
    });
  }

  const sensors = useSensors(
    // A small threshold so a tap still reaches the buttons on the card.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  /** Which cell an arbitrary drop target belongs to. */
  function resolveCell(id: string): { lane: Lane; date: string | null } | null {
    if (id.startsWith(RIBBON_PREFIX)) {
      // A ribbon chip names a day, not a lane — keep the card in its own row.
      const date = id.slice(RIBBON_PREFIX.length);
      const dragged = items.find((i) => i.id === activeId);
      return dragged && dayLookup.has(date)
        ? { lane: dragged.lane, date }
        : null;
    }

    const cell = parseCell(id);
    if (cell) return cell;

    const item = items.find((i) => i.id === id);
    return item ? { lane: item.lane, date: item.on_date } : null;
  }

  /**
   * Where the dragged card would land: which cell, and the fractional position
   * between whichever two neighbours it is hovering between.
   */
  function computeDrop(event: DragOverEvent | DragEndEvent) {
    const { active, over } = event;
    if (!over) return null;

    const activeItem = items.find((i) => i.id === active.id);
    if (!activeItem) return null;

    const target = resolveCell(String(over.id));
    if (!target) return null;

    const container = cellId(target.lane, target.date);
    const siblings = itemsIn(items, container).filter(
      (i) => i.id !== activeItem.id,
    );
    const overItem = items.find((i) => i.id === String(over.id));

    let position: number;
    if (overItem && overItem.id !== activeItem.id) {
      const dragged = active.rect.current.translated;
      const below = dragged
        ? dragged.top + dragged.height / 2 >
          over.rect.top + over.rect.height / 2
        : false;
      const index = siblings.findIndex((i) => i.id === overItem.id);
      const at = below ? index + 1 : index;
      position = positionBetween(
        siblings[at - 1]?.position,
        siblings[at]?.position,
      );
    } else {
      // Dropped on the cell itself (or a ribbon chip) — append.
      position = positionBetween(siblings.at(-1)?.position, undefined);
    }

    return {
      id: activeItem.id,
      lane: target.lane,
      onDate: target.date,
      position,
    };
  }

  type Drop = NonNullable<ReturnType<typeof computeDrop>>;
  const lastDrop = useRef<Drop | null>(null);

  function applyLocally(drop: Drop) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === drop.id
          ? {
              ...i,
              lane: drop.lane,
              on_date: drop.onDate,
              position: drop.position,
            }
          : i,
      ),
    );
  }

  function persist(drop: Drop) {
    applyLocally(drop);
    startTransition(async () => {
      await moveItem(drop.id, drop.lane, drop.onDate, drop.position);
    });
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    lastDrop.current = null;
  }

  function handleDragOver(event: DragOverEvent) {
    const drop = computeDrop(event);
    if (!drop) return;

    const current = items.find((i) => i.id === drop.id);
    if (
      current?.lane === drop.lane &&
      current.on_date === drop.onDate &&
      current.position === drop.position
    ) {
      return;
    }

    lastDrop.current = drop;
    applyLocally(drop);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const drop = computeDrop(event) ?? lastDrop.current;
    lastDrop.current = null;
    if (drop) persist(drop);
  }

  /** Append a card to the end of a cell, wherever it is coming from. */
  function sendTo(item: TripItem, lane: Lane, onDate: string | null) {
    const siblings = itemsIn(items, cellId(lane, onDate)).filter(
      (i) => i.id !== item.id,
    );
    persist({
      id: item.id,
      lane,
      onDate,
      position: positionBetween(siblings.at(-1)?.position, undefined),
    });
  }

  /**
   * The arrow buttons on every card. Dragging across a twenty-day grid on a
   * phone is miserable, so shifting a card one day at a time is the real move
   * control — and the first nudge left off day one drops it back in the pile.
   */
  const actions: CardActions = {
    onEdit: (item) => setDraft({ item, lane: item.lane, onDate: item.on_date }),
    // Optimistic: the card goes now and the toast holds the way back. Waiting
    // on a round trip to clear one card out of a pile of ninety is the kind of
    // lag that makes you stop tidying.
    onDelete: (item) => {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      startTransition(async () => {
        const result = await deleteItem(item.id);
        if (result.error) {
          setItems((prev) => [...prev, item]);
          setNotice({ tone: "error", text: result.error });
          return;
        }
        setNotice({
          tone: "ok",
          text: `Deleted ${item.title}.`,
          undo: () =>
            startTransition(async () => {
              const back = await restoreItem(item);
              setNotice(
                back.error
                  ? { tone: "error", text: back.error }
                  : { tone: "ok", text: `${item.title} is back.` },
              );
            }),
        });
      });
    },
    onNudge: (item, delta) => {
      const target = nudgeTarget(item, delta, allDays);
      if (target === undefined) return;
      sendTo(item, item.lane, target);
      // The phone board shows one day, so a nudge sends the card out of view.
      // Say where it went, with a way to follow it.
      setNotice({
        tone: "ok",
        text: `${item.title} → ${
          target
            ? parseDay(target).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })
            : "the pile"
        }`,
        goTo: target ?? PILES,
      });
    },
    onMoveLane: (item, lane) => sendTo(item, lane, item.on_date),
    onCopy: (item, lane) =>
      startTransition(async () => {
        const result = await copyItem(item.id, lane);
        setNotice(
          result.error
            ? { tone: "error", text: result.error }
            : {
                tone: "ok",
                text: `Copied ${item.title} to ${LANES[lane].label}.`,
              },
        );
      }),
  };

  const dragging = activeId ? items.find((i) => i.id === activeId) : null;
  const viewMeta = BOARD_VIEWS[view];
  const shownLanes = viewMeta.lanes;
  // One lane needs no more than a tinted edge; two need room for a turned name.
  const laneColumn = shownLanes.length > 1 ? "2.75rem" : "1.5rem";
  const gridColumns = `${laneColumn} repeat(${visibleDays.length}, ${COLUMN})`;

  /**
   * Rows are placed explicitly and sized to their contents. Leaving them
   * implicit let a tall grid item spread its excess height evenly across every
   * row it spanned, which is where the empty half-band above a lane's cards
   * came from — the pile spanned both of its lane's rows and half its overflow
   * landed in the leg band.
   */
  const gridRows = `auto ${shownLanes.map(() => "min-content min-content").join(" ")}`;

  /**
   * Whose day the header is describing.
   *
   * It used to read Decided no matter which view you were in, so Aaron's view
   * warned that a day was a twelve-hour march when the march was on a row he
   * could not see. With one lane on screen the header is that lane's. In
   * Compare neither draft owns the day, so it falls back to Decided — what is
   * already agreed is the baseline you are weighing the two against.
   */
  const headerLane: Lane = shownLanes.length === 1 ? shownLanes[0] : "decided";

  /**
   * The columns where the agreed route changes. Everything between two of them
   * is the same place, so only these need naming — the trip bar has the route
   * in full, and "Tokyo" down six day headers said it a third time.
   */
  const marksChange = useMemo(() => {
    const route = legsIn(legs, "decided");
    const at = new Map<string, boolean>();
    let previous: string | null = null;
    for (const [i, date] of visibleDays.entries()) {
      const id = legForDay(route, date)?.id ?? null;
      at.set(date, i === 0 || id !== previous);
      previous = id;
    }
    return at;
  }, [legs, visibleDays]);
  const bandRow = (laneIndex: number) => 2 + laneIndex * 2;
  const cellRow = (laneIndex: number) => 3 + laneIndex * 2;

  return (
    <BoardProvider
      rate={rate}
      stays={stays}
      items={items}
      transit={board.transit}
    >
      <main className="mx-auto mt-6 max-w-[110rem]">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-2 max-lg:mb-4">
          <p className="font-garamond text-xl italic text-muted-foreground max-lg:text-lg max-lg:leading-snug">
            <span className="max-lg:hidden">
              Argue in your own row. Agree by dragging it up.
            </span>
            <span className="lg:hidden">
              Argue in your own lane. Agree with the arrow.
            </span>
          </p>
          <div className="text-right">
            <dl className="flex flex-wrap justify-end gap-x-5 gap-y-1 font-mono text-xs text-muted-foreground tabular-nums slashed-zero">
              <Stat label="days" value={allDays.length} />
              <Stat
                label="decided"
                value={decided.filter((i) => i.on_date).length}
              />
              <Stat label="suggested" value={suggested.length} />
              {spend > 0 && (
                <Stat
                  label={yenAsUsd(spend, rate)}
                  value={formatYen(spend)}
                  raw
                />
              )}
            </dl>
            <p
              className="mt-1 font-mono text-[0.65rem] text-muted-foreground tabular-nums slashed-zero"
              title="Costs are stored in the currency you typed them in and converted at this rate for totals."
            >
              {describeRate(rate)}
            </p>
          </div>
        </div>

        {/* Legs */}
        {/* The trip, and the shape of it: its dates, its legs, and where
            you're sleeping on each one. */}
        {trip && (
          <div className="max-lg:hidden">
            <TripBar
              trip={trip}
              trips={board.trips}
              legs={legs}
              stays={stays}
              activeLegId={activeLegId}
              onLeg={setActiveLegId}
              onEditTrip={() => setTripDraft({ trip })}
              onNewTrip={() => setTripDraft({ trip: null })}
              onEditLeg={(leg) => setLegDraft({ leg, lane: leg.lane })}
              onCreateLeg={(lane, from, to) =>
                setLegDraft({ leg: null, lane, from, to })
              }
            />
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 max-lg:hidden">
          {/* Whose board this is right now. Three working views — one row and
              the pile you're pulling from — and Compare, where you're choosing
              between two drafts rather than adding to either. */}
          <div
            role="radiogroup"
            aria-label="View"
            className="ml-auto flex gap-1 rounded-full border border-border p-0.5"
          >
            {VIEW_ORDER.map((v) => {
              const on = v === view;
              const meta = BOARD_VIEWS[v];
              const accent =
                meta.lanes.length === 1
                  ? LANES[meta.lanes[0]].accent
                  : undefined;
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  title={meta.blurb}
                  onClick={() => setView(v)}
                  style={
                    on
                      ? {
                          color: accent ?? "var(--color-primary)",
                          backgroundColor:
                            meta.lanes.length === 1
                              ? LANES[meta.lanes[0]].tint
                              : "var(--color-secondary)",
                        }
                      : undefined
                  }
                  className={cn(
                    "rounded-full px-3 py-1 font-raleway text-[0.65rem] tracking-[0.15em] uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    !on && "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {notice && (
          <p
            role={notice.tone === "error" ? "alert" : "status"}
            className={cn(
              "mt-3 flex items-center justify-between gap-3 rounded-md border px-3 py-2 font-raleway text-sm",
              // A toast above the tab bar on a phone, where the top of the
              // page is usually scrolled away.
              "max-lg:fixed max-lg:inset-x-4 max-lg:bottom-[calc(4.5rem_+_env(safe-area-inset-bottom))] max-lg:z-40 max-lg:mt-0 max-lg:py-3 max-lg:shadow-lg sm:max-lg:bottom-6",
              notice.tone === "error"
                ? "border-destructive/40 bg-destructive/10 text-destructive max-lg:bg-card"
                : "border-primary/30 bg-primary/5 text-primary max-lg:bg-card",
            )}
          >
            <span className="min-w-0 flex-1">{notice.text}</span>
            {notice.goTo && notice.goTo !== dayShown && (
              <button
                type="button"
                onClick={() => {
                  showDay(notice.goTo!);
                  setNotice(null);
                }}
                className="font-raleway text-[0.65rem] font-semibold uppercase tracking-[0.2em] underline underline-offset-4 lg:hidden"
              >
                Go
              </button>
            )}
            {notice.undo && (
              <button
                type="button"
                onClick={() => {
                  notice.undo?.();
                }}
                className="rounded-sm font-raleway text-[0.65rem] font-semibold tracking-[0.2em] uppercase underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
              >
                Undo
              </button>
            )}
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

        {!trip ? (
          <NoTrip onMake={() => setTripDraft({ trip: null })} />
        ) : (
          <>
            <BoardDayView
              selected={dayShown}
              onSelect={showDay}
              days={allDays}
              legs={legs}
              stays={stays}
              items={items}
              dayNotes={dayNotes}
              flights={board.flights}
              transit={decidedTransit}
              today={today}
              actions={actions}
              onAdd={(l, d) => setDraft({ item: null, lane: l, onDate: d })}
              onEditLeg={(leg) => setLegDraft({ leg, lane: leg.lane })}
              onCreateLeg={(l, from, to) =>
                setLegDraft({ leg: null, lane: l, from, to })
              }
              onAdoptLeg={requestAdoptLeg}
              onAdoptRoute={requestAdoptRoute}
              onEditNote={setNoteDate}
              onSortByTime={(d) =>
                startTransition(async () => {
                  await sortDayByTime(d, "decided");
                })
              }
            />
            <div className="max-lg:hidden">
              <DndContext
                // A fixed id: dnd-kit otherwise numbers its aria ids from a counter
                // that keeps climbing on the server across requests, so the HTML and
                // the client disagree and hydration complains.
                id="honeymoon-board"
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setActiveId(null)}
              >
                <div className="mt-4">
                  <DayRibbon
                    days={allDays}
                    legs={decidedLegs}
                    items={decided}
                    activeLegId={activeLegId}
                    today={today}
                  />
                </div>

                {/* One grid, three rows. Horizontal scroll moves all three lanes
              together, which is the point — a day's three cells must always
              line up. */}
                <div className="mt-4 flex items-start gap-3">
                  {viewMeta.pile && (
                    <IdeaPanel
                      lane={pileLane}
                      onLane={setPileLane}
                      items={items}
                      query={query}
                      onQuery={setQuery}
                      actions={actions}
                      onAdd={(l) =>
                        setDraft({ item: null, lane: l, onDate: null })
                      }
                      onAdoptRoute={requestAdoptRoute}
                      legCount={legsIn(legs, pileLane).length}
                      open={pileOpen}
                      onOpen={setPileOpen}
                    />
                  )}
                  <div className="rail-scroll max-h-[78vh] min-w-0 flex-1 overflow-auto rounded-lg border border-border">
                    <div
                      className="grid"
                      style={{
                        gridTemplateColumns: gridColumns,
                        gridTemplateRows: gridRows,
                      }}
                    >
                      <div
                        style={{ gridRow: 1, gridColumn: 1 }}
                        className="sticky top-0 left-0 z-40 border-r-2 border-b border-border bg-background"
                      />
                      {visibleDays.map((date, column) => (
                        <DayHeader
                          key={date}
                          style={{ gridRow: 1, gridColumn: column + 2 }}
                          date={date}
                          note={dayNotes.find((d) => d.on_date === date)}
                          legs={legs}
                          laneItems={itemsInCell(items, headerLane, date)}
                          marksChange={marksChange.get(date) ?? true}
                          statsLane={
                            shownLanes.includes(headerLane)
                              ? undefined
                              : LANES[headerLane].label.toLowerCase()
                          }
                          flights={flightsOnDay(board.flights, date)}
                          transit={transitOnDay(decidedTransit, date)}
                          isToday={date === today}
                          onEditNote={setNoteDate}
                          onSortByTime={(d) =>
                            startTransition(async () => {
                              await sortDayByTime(d, "decided");
                            })
                          }
                        />
                      ))}

                      {shownLanes.map((lane, laneIndex) => (
                        <Fragment key={lane}>
                          {/* Just the name now. The pile it used to hold is
                            beside the board, so this column no longer decides
                            how tall the lane is. */}
                          <button
                            type="button"
                            onClick={() => {
                              setPileLane(lane);
                              setPileOpen(true);
                            }}
                            title={`${LANES[lane].label} — open this pile`}
                            style={{
                              gridRow: `${bandRow(laneIndex)} / span 2`,
                              gridColumn: 1,
                              backgroundColor: LANES[lane].tint,
                              color: LANES[lane].accent,
                            }}
                            className="sticky left-0 z-20 flex items-center justify-center border-r-2 border-b border-border font-raleway text-[0.6rem] tracking-[0.25em] uppercase transition-colors hover:brightness-95 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                          >
                            {/* A tinted spine, not a label. With one lane on
                                screen the view switcher has already named it,
                                and in Compare the tint plus the turned name is
                                enough to tell two rows apart. Clicking it opens
                                that lane's pile. */}
                            {shownLanes.length > 1 && (
                              <span className="[writing-mode:vertical-rl] rotate-180">
                                {LANES[lane].label}
                              </span>
                            )}
                          </button>
                          {/* Decided's route is the trip bar up top now, so
                              drawing it again here was the redundancy. A draft
                              lane still gets its band: that IS the proposal,
                              and in Compare two of them side by side is the
                              whole point of the view. */}
                          {lane !== "decided" && (
                            <LegBand
                              lane={lane}
                              legs={legs}
                              stays={stays}
                              days={visibleDays}
                              row={bandRow(laneIndex)}
                              onEdit={(leg) =>
                                setLegDraft({ leg, lane: leg.lane })
                              }
                              onCreate={(l, from, to) =>
                                setLegDraft({ leg: null, lane: l, from, to })
                              }
                              onAdopt={requestAdoptLeg}
                            />
                          )}
                          {visibleDays.map((date, column) => (
                            <LaneCell
                              key={date}
                              style={{
                                gridRow: cellRow(laneIndex),
                                gridColumn: column + 2,
                              }}
                              lane={lane}
                              date={date}
                              items={itemsInCell(items, lane, date)}
                              isToday={date === today}
                              actions={actions}
                              onAdd={(l, d) =>
                                setDraft({ item: null, lane: l, onDate: d })
                              }
                            />
                          ))}
                        </Fragment>
                      ))}
                    </div>
                  </div>
                </div>

                <DragOverlay>
                  {dragging ? (
                    <div className="w-[15rem]">
                      <ItemCardFace item={dragging} overlay />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </>
        )}

        <TripDocsPanel docs={docs} />

        <ItemDialog
          draft={draft}
          days={allDays}
          onClose={() => setDraft(null)}
        />
        <DayNoteDialog
          date={noteDate}
          existing={dayNotes.find((d) => d.on_date === noteDate)}
          onClose={() => setNoteDate(null)}
        />
        <LegDialog
          draft={legDraft}
          onClose={() => setLegDraft(null)}
          onAdopt={requestAdoptLeg}
        />
        <TripDialog draft={tripDraft} onClose={() => setTripDraft(null)} />
        <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
      </main>
    </BoardProvider>
  );
}

function Stat({
  label,
  value,
  raw = false,
}: {
  label: string;
  value: number | string;
  raw?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dd className="text-foreground">{value}</dd>
      <dt className={cn(raw ? "" : "uppercase tracking-wider")}>{label}</dt>
    </div>
  );
}
function NoTrip({ onMake }: { onMake: () => void }) {
  return (
    <div className="mt-16 rounded-lg border border-dashed border-border px-8 py-20 text-center">
      <MapPinned
        className="mx-auto h-8 w-8 text-primary"
        strokeWidth={1.25}
        aria-hidden="true"
      />
      <h2 className="mt-4 font-garamond text-3xl text-foreground">
        Start with the dates you&apos;re away
      </h2>
      <p className="mx-auto mt-2 max-w-md font-garamond text-lg leading-relaxed text-muted-foreground">
        That&apos;s all it takes. The board draws a column for every day of it,
        and you can start dropping ideas onto them before you&apos;ve worked out
        which city you&apos;ll be in.
      </p>
      <button
        type="button"
        onClick={onMake}
        className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 font-raleway text-[0.7rem] tracking-[0.2em] text-primary-foreground uppercase transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        Make a trip
      </button>
    </div>
  );
}
