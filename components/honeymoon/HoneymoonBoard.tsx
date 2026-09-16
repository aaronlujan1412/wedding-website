"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { ArrowUp, MapPinned, Plus, X } from "lucide-react";
import {
  adoptLeg,
  adoptRoute,
  copyItem,
  deleteItem,
  moveItem,
  restoreItem,
  scheduleItem,
  setItemDuration,
  sortDayByTime,
} from "@/app/actions/honeymoon";
import { cn } from "@/lib/utils";
import { BoardDayView, PILES } from "./BoardDayView";
import { DayHeader } from "./DayHeader";
import { DayNoteDialog } from "./DayNoteDialog";
import { DecidedSpineCell } from "./DecidedSpine";
import { ItemCardFace, type CardActions } from "./ItemCard";
import { ItemDialog, type ItemDraft } from "./ItemDialog";
import { LaneCell } from "./LaneCell";
import { IdeaPanel } from "./IdeaPanel";
import {
  HoursBlockFace,
  HoursCell,
  HoursLines,
  HoursRuler,
  ShelfChipFace,
  SometimeShelf,
  type Slot,
} from "./HoursView";
import {
  HALF_HOUR_REM,
  SNAP,
  anchorsOnDay,
  hoursId,
  hoursRange,
  isBoardLayout,
  isHoursId,
  marksOnDay,
  minuteAt,
  parseHoursId,
  parseShelfId,
  positionForTime,
  slotProblems,
  toTime,
  type Anchor,
  type BoardLayout,
  type Mark,
} from "./hours";
import { sunOn, type Sun } from "./sun";
import { LegBand } from "./LegBand";
import { LegDialog, type LegDraft } from "./LegDialog";
import { DAY_DROP_PREFIX } from "./RouteStrip";
import { TripBar } from "./TripBar";
import { TripSummary } from "./TripSummary";
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
  containerOf,
  eachDay,
  formatLegDates,
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
  isBoardView,
  itemLength,
  itemStart,
  minutesOf,
} from "./trip";
import type { BoardView } from "./trip";
import type { Lane, TripBoard, TripItem, TripLeg } from "./types";

const COLUMN = "19rem";
/** A day in Compare by the hour: two tracks, each wide enough for a title. */
const SPLIT_COLUMN = "24rem";
const RULER = "3rem";

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
    writeBoardParams(next, layout);
  }
  // List or Hours, in the URL beside the view for the same reason.
  const [layout, setLayoutState] = useState<BoardLayout>(() => {
    const value = searchParams.get("layout");
    return isBoardLayout(value) ? value : "list";
  });
  function setLayout(next: BoardLayout) {
    setLayoutState(next);
    writeBoardParams(view, next);
  }
  // Every day's Sometime shelf shares one grid row, so they open together.
  const [shelvesOpen, setShelvesOpen] = useState(false);
  // Where the card being dragged would land on the hours, while it's over them.
  const [slot, setSlot] = useState<Slot | null>(null);
  // The shape under the pointer is the shape that was picked up.
  const [dragFace, setDragFace] = useState<"card" | "chip" | "block">("card");
  // The pile opens on the view's own lane. It used to start on Decided no
  // matter what, so a bookmarked ?view=aaron opened on the wrong pile.
  const [pileLane, setPileLane] = useState<Lane>(
    () => BOARD_VIEWS[view].lanes[0],
  );
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
  const visibleDays = useMemo(
    () =>
      activeLeg ? eachDay(activeLeg.starts_on, activeLeg.ends_on) : allDays,
    [activeLeg, allDays],
  );

  // The board's scroller, so the route strip can mark which days are on
  // screen, and a click on a strip day can bring that column into view.
  const scroller = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState<{
    first: number;
    last: number;
  } | null>(null);
  const firstShown = allDays.indexOf(visibleDays[0]);
  const shownCount = visibleDays.length;

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let frame = 0;
    // Measured in a frame callback rather than in the effect body: the columns
    // are rem-sized and the lane column comes and goes with the view, so the
    // DOM is the only honest source for where a column starts.
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const range = columnsOnScreen(el);
        if (!range) return;
        const next = {
          first: firstShown + Math.min(range.first, shownCount - 1),
          last: firstShown + Math.min(range.last, shownCount - 1),
        };
        setOnScreen((prev) =>
          prev?.first === next.first && prev.last === next.last ? prev : next,
        );
      });
    };
    // A ResizeObserver reports once on observe, which is the initial measure.
    // Watching the grid too catches a column count change that leaves the
    // scroller's own box the same size.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [firstShown, shownCount, view, layout]);

  // A strip click outside the leg the board is scoped to has to widen the
  // board first; the scroll then waits for those columns to exist.
  const pendingJump = useRef<string | null>(null);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (pendingJump.current) {
      scrollBoardTo(el, pendingJump.current);
      pendingJump.current = null;
    } else {
      // Scoping to a leg starts at its first day, not wherever the scroll
      // position happened to clamp to.
      el.scrollLeft = 0;
    }
  }, [activeLegId]);

  function showOnBoard(date: string) {
    if (
      activeLeg &&
      (date < activeLeg.starts_on || date > activeLeg.ends_on)
    ) {
      pendingJump.current = date;
      setActiveLegId(null);
      return;
    }
    if (scroller.current) scrollBoardTo(scroller.current, date);
  }

  const decided = items.filter((i) => i.lane === "decided");
  // The header names the agreed day, so only the agreed route's rides belong
  // in it. A suggested night bus lives on the Transit tab until it's adopted.
  const decidedTransit = transitIn(board.transit, "decided");
  // Flights and agreed stays count toward the trip total like any other cost.
  const spend =
    sumYen(decided, rate) +
    sumYen(docs, rate) +
    sumYen(board.flights, rate) +
    // Rides the rail pass covers cost nothing on the day — the pass itself is
    // a trip_docs row and its price is counted there instead.
    sumYen(payableRides(decidedTransit), rate) +
    sumYen(staysIn(stays, "decided"), rate);

  // The lanes drawn by the hour, left to right: one, or Compare's two drafts
  // side by side over what Decided already has.
  const hoursLanes: Lane[] | null =
    layout === "hours" ? BOARD_VIEWS[view].lanes : null;
  const hours = hoursLanes !== null;
  const split = hours && hoursLanes.length > 1;

  /**
   * What's already on the clock each day: the agreed trains, flights and hotel
   * times, and when the sun goes down where that day's route has you.
   */
  const clock = useMemo(() => {
    const byDay = new Map<
      string,
      { anchors: Anchor[]; marks: Mark[]; sun: Sun }
    >();
    if (!hoursLanes) return byDay;
    const rides = transitIn(board.transit, "decided");
    const beds = staysIn(stays, "decided");
    // Sunset for the first leg it recognises: the lanes' own, then Decided's.
    const routes = [...hoursLanes, "decided" as const].map((lane) =>
      legsIn(legs, lane),
    );
    for (const date of visibleDays) {
      byDay.set(date, {
        anchors: anchorsOnDay(date, board.flights, rides),
        marks: marksOnDay(date, beds),
        sun: sunOn(date, ...routes.map((r) => legForDay(r, date)?.name)),
      });
    }
    return byDay;
  }, [hoursLanes, visibleDays, board.transit, board.flights, stays, legs]);

  /** The hours every day column shares, from everything in scope. */
  const range = useMemo(() => {
    if (!hoursLanes) return null;
    const inScope = new Set(visibleDays);
    // Compare draws Decided too, behind the drafts.
    const drawn = new Set<Lane>(
      split ? [...hoursLanes, "decided"] : hoursLanes,
    );
    const minutes: number[] = [];
    for (const item of items) {
      const start = itemStart(item);
      if (
        start === null ||
        !drawn.has(item.lane) ||
        !item.on_date ||
        !inScope.has(item.on_date)
      ) {
        continue;
      }
      minutes.push(start, Math.min(start + itemLength(item), 24 * 60));
    }
    for (const { anchors, marks } of clock.values()) {
      for (const a of anchors) {
        if (a.start !== null) minutes.push(a.start);
        if (a.end !== null) minutes.push(a.end);
      }
      for (const m of marks) minutes.push(m.at);
    }
    return hoursRange(minutes);
  }, [hoursLanes, split, visibleDays, items, clock]);

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

  /**
   * On the hours, the arrow keys move a card by one snap up and down and a day
   * left and right. Everywhere else they hop between cards, as in the list.
   */
  const coordinateGetter: KeyboardCoordinateGetter = (event, args) => {
    const over = args.context.over;
    const column =
      range && over && isHoursId(String(over.id))
        ? document.querySelector<HTMLElement>(`[data-hours="${over.id}"]`)
        : null;
    if (column && range) {
      const box = column.getBoundingClientRect();
      const step = (SNAP / (range.end - range.start)) * box.height;
      const { x, y } = args.currentCoordinates;
      const moves: Record<string, { x: number; y: number }> = {
        ArrowDown: { x, y: y + step },
        ArrowUp: { x, y: y - step },
        ArrowRight: { x: x + box.width, y },
        ArrowLeft: { x: x - box.width, y },
      };
      if (event.code in moves) {
        event.preventDefault();
        return moves[event.code];
      }
    }
    return sortableKeyboardCoordinates(event, args);
  };

  const sensors = useSensors(
    // A small threshold so a tap still reaches the buttons on the card.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter }),
  );

  /**
   * The pointer picks where a card goes; nearest corners only pick the slot.
   *
   * Nearest corners alone let tall targets lose to short ones beside them: a
   * card let go in the middle of the pile landed on the first day of the trip,
   * and on the hours a card in the next day's shelf won from the middle of an
   * afternoon. So whatever is under the pointer — an hours column, a cell, a
   * shelf, the pile, a route strip day, read from the page as it is right now
   * — is where it goes, and inside that, nearest corners find the slot.
   */
  const collisionDetection: CollisionDetection = (args) => {
    const rect = args.collisionRect;
    const point = args.pointerCoordinates ?? {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    const under = document.elementsFromPoint(point.x, point.y);

    if (hours) {
      const id = under
        .map((el) => el.closest<HTMLElement>("[data-hours-cell]"))
        .find(Boolean)?.dataset.hoursCell;
      const column = id
        ? args.droppableContainers.find((c) => c.id === id)
        : undefined;
      if (column) {
        return [
          { id: column.id, data: { droppableContainer: column, value: 0 } },
        ];
      }
    }

    const targets = args.droppableContainers.filter(
      (c) => !isHoursId(String(c.id)),
    );
    const zone = under
      .map((el) => el.closest<HTMLElement>("[data-drop-zone]"))
      .find(Boolean);
    const inZone = zone
      ? targets.filter((c) => c.node.current && zone.contains(c.node.current))
      : [];
    return closestCorners({
      ...args,
      droppableContainers: inZone.length > 0 ? inZone : targets,
    });
  };

  /** Which cell an arbitrary drop target belongs to. */
  function resolveCell(id: string): { lane: Lane; date: string | null } | null {
    if (id.startsWith(DAY_DROP_PREFIX)) {
      // A route strip day names a day, not a lane — keep the card in its own row.
      const date = id.slice(DAY_DROP_PREFIX.length);
      const dragged = items.find((i) => i.id === activeId);
      return dragged && dayLookup.has(date)
        ? { lane: dragged.lane, date }
        : null;
    }

    const cell = parseCell(id) ?? parseShelfId(id);
    if (cell) return cell;

    const item = items.find((i) => i.id === id);
    return item ? { lane: item.lane, date: item.on_date } : null;
  }

  type Drop = {
    id: string;
    lane: Lane;
    onDate: string | null;
    position: number;
    /** Undefined leaves the time alone; null takes it away. */
    startTime?: string | null;
  };

  /**
   * Where the dragged card would land: which cell, and the fractional position
   * between whichever two neighbours it is hovering between. On the hours, also
   * when it starts — `startTime` is left undefined by every drop that doesn't
   * decide a time, and is null for a drop onto a Sometime shelf.
   */
  function computeDrop(
    event: DragOverEvent | DragMoveEvent | DragEndEvent,
  ): Drop | null {
    const { active, over } = event;
    if (!over) return null;

    const activeItem = items.find((i) => i.id === active.id);
    if (!activeItem) return null;

    // Onto the hours: the card's top edge is when it starts, measured against
    // the column as it is on the page now, not as it was when the drag began.
    const column = parseHoursId(String(over.id));
    if (column?.date) {
      const box = document
        .querySelector<HTMLElement>(`[data-hours="${over.id}"]`)
        ?.getBoundingClientRect();
      const dragged = active.rect.current.translated;
      if (!box || !dragged || !range) return null;
      const start = minuteAt(dragged.top - box.top, box.height, range);
      const siblings = itemsInCell(items, column.lane, column.date).filter(
        (i) => i.id !== activeItem.id,
      );
      return {
        id: activeItem.id,
        lane: column.lane,
        onDate: column.date,
        position: positionForTime(siblings, start),
        startTime: toTime(start),
      };
    }

    const target = resolveCell(String(over.id));
    if (!target) return null;

    const container = cellId(target.lane, target.date);
    const siblings = itemsIn(items, container).filter(
      (i) => i.id !== activeItem.id,
    );
    const overItem = items.find((i) => i.id === String(over.id));

    // Over itself is over nowhere new. This used to mean "append to the end
    // of the cell", which moved the card out from under the pointer, onto the
    // card that took its place, which put it back — until React gave up.
    if (overItem?.id === activeItem.id) return null;

    let position: number;
    if (overItem && containerOf(overItem) === containerOf(activeItem)) {
      // A reorder within the cell: the card takes the slot of the one it's
      // over, the way the sortable animation has already drawn it.
      const cell = itemsIn(items, container);
      const moved = arrayMove(
        cell,
        cell.findIndex((i) => i.id === activeItem.id),
        cell.findIndex((i) => i.id === overItem.id),
      );
      const at = moved.findIndex((i) => i.id === activeItem.id);
      position = positionBetween(
        moved[at - 1]?.position,
        moved[at + 1]?.position,
      );
    } else if (overItem) {
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
      // Dropped on the cell itself (or a route strip day) — append.
      position = positionBetween(siblings.at(-1)?.position, undefined);
    }

    // Onto a shelf, or among its cards, takes the time away.
    const toShelf =
      hours &&
      (parseShelfId(String(over.id)) !== null ||
        (overItem?.on_date != null && overItem.start_time === null));

    return {
      id: activeItem.id,
      lane: target.lane,
      onDate: target.date,
      position,
      startTime: toShelf ? null : undefined,
    };
  }

  // The last move made mid-drag — always into another cell — kept for a drop
  // that ends over nothing at all.
  const lastDrop = useRef<Drop | null>(null);
  const movedThisFrame = useRef(false);

  function applyLocally(drop: Drop) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === drop.id
          ? {
              ...i,
              lane: drop.lane,
              on_date: drop.onDate,
              position: drop.position,
              ...(drop.startTime !== undefined && {
                start_time: drop.startTime,
              }),
            }
          : i,
      ),
    );
  }

  function persist(drop: Drop) {
    applyLocally(drop);
    startTransition(async () => {
      const result =
        drop.startTime === undefined
          ? await moveItem(drop.id, drop.lane, drop.onDate, drop.position)
          : await scheduleItem(
              drop.id,
              drop.lane,
              drop.onDate,
              drop.startTime,
              drop.position,
            );
      if (result.error) setNotice({ tone: "error", text: result.error });
    });
  }

  // The board as it was when a drag began, so letting go with Escape puts
  // back the cards it had already shuffled on the way.
  const beforeDrag = useRef<TripItem[] | null>(null);

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    const item = items.find((i) => i.id === id);
    setActiveId(id);
    setDragFace(
      !hours || !item?.on_date
        ? "card"
        : item.start_time === null
          ? "chip"
          : "block",
    );
    lastDrop.current = null;
    beforeDrag.current = items;
  }

  function handleDragMove(event: DragMoveEvent) {
    if (!hours) return;
    const over = event.over ? String(event.over.id) : null;
    const drop = over && isHoursId(over) ? computeDrop(event) : null;
    const item = drop && items.find((i) => i.id === drop.id);
    // Updaters rather than reading `slot`: this fires on every pointer move,
    // and only a change of snapped time or column should render anything.
    if (!drop?.startTime || !drop.onDate || !item) {
      setSlot((prev) => (prev === null ? prev : null));
      return;
    }

    const onDate = drop.onDate;
    const cell = hoursId(drop.lane, onDate);
    const start = minutesOf(drop.startTime);
    setSlot((prev) =>
      prev?.cell === cell && prev.start === start && prev.item.id === item.id
        ? prev
        : {
            cell,
            item,
            start,
            problems: slotProblems(
              item,
              start,
              onDate,
              // In Compare what's already agreed is on screen behind the
              // drafts, so landing on it is a clash worth saying.
              split
                ? [
                    ...itemsInCell(items, drop.lane, onDate),
                    ...itemsInCell(items, "decided", onDate),
                  ]
                : itemsInCell(items, drop.lane, onDate),
              clock.get(onDate)?.anchors ?? [],
            ),
          },
    );
  }

  function handleDragOver(event: DragOverEvent) {
    // Over the hours nothing moves until it's let go: the preview shows where.
    if (hours && event.over && isHoursId(String(event.over.id))) return;

    const drop = computeDrop(event);
    if (!drop) return;

    // Onto a shelf, the move waits for the drop too. A shelf shows its first
    // few cards, so moving the card mid-drag could push it past them — its
    // drop target unmounts, the pointer is over the card that took its place,
    // the move reverses, and React gives up on the loop.
    if (drop.startTime === null) return;

    // So does a reorder within the card's own cell: the sortable animation
    // already shows it, and moving it for real re-measured every card under
    // the pointer mid-drag. Only a move into another cell or pile happens now.
    const current = items.find((i) => i.id === drop.id);
    if (!current || cellId(drop.lane, drop.onDate) === containerOf(current)) {
      return;
    }

    // And only once a frame: the cell it left shrinks and the one it joined
    // grows, which can put the pointer back over the first for a moment.
    if (movedThisFrame.current) return;
    movedThisFrame.current = true;
    requestAnimationFrame(() => {
      movedThisFrame.current = false;
    });

    lastDrop.current = drop;
    applyLocally(drop);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    setSlot(null);
    beforeDrag.current = null;
    const drop = computeDrop(event) ?? lastDrop.current;
    lastDrop.current = null;
    if (drop) persist(drop);
  }

  function handleDragCancel() {
    setActiveId(null);
    setSlot(null);
    lastDrop.current = null;
    if (beforeDrag.current) setItems(beforeDrag.current);
    beforeDrag.current = null;
  }

  /** A block's bottom edge, let go. Saved straight away, put back if it fails. */
  function resize(item: TripItem, minutes: number) {
    const before = item.duration_min;
    const set = (value: number | null) =>
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, duration_min: value } : i)),
      );
    set(minutes);
    startTransition(async () => {
      const result = await setItemDuration(item.id, minutes);
      if (result.error) {
        set(before);
        setNotice({ tone: "error", text: result.error });
      }
    });
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
  // Compare needs a turned name to tell its two rows apart. A single-lane view
  // gets no lane column at all: the heading already names it, and the column
  // was 1.5rem of tint whose only job was opening the pile beside it.
  const laneColumn = shownLanes.length > 1 ? "2.75rem" : null;
  // Hours puts its ruler where Compare's list puts the turned lane names.
  const leadColumn = hours ? RULER : laneColumn;
  // Two tracks to a day need the room for a title each.
  const dayWidth = split ? SPLIT_COLUMN : COLUMN;
  const gridColumns = leadColumn
    ? `${leadColumn} repeat(${visibleDays.length}, ${dayWidth})`
    : `repeat(${visibleDays.length}, ${dayWidth})`;
  const dayColumn = (index: number) => index + (leadColumn ? 2 : 1);

  /**
   * Whose day the header is describing.
   *
   * It used to read Decided no matter which view you were in, so Aaron's view
   * warned that a day was a twelve-hour march when the march was on a row he
   * could not see. With one lane on screen the header is that lane's. In
   * Compare neither draft owns the day, so it is Decided's — the baseline you
   * are weighing the two against, drawn as a spine directly under the header.
   */
  const headerLane: Lane = shownLanes.length === 1 ? shownLanes[0] : "decided";
  // Hours draws its one lane as a shelf over a column of hours instead.
  const gridLanes = hours ? [] : shownLanes;
  // Compare's list shows two drafts, so Decided comes along as their baseline.
  // By the hour it's drawn behind them instead.
  const showSpine = !hours && shownLanes.length > 1;

  /**
   * Rows are placed explicitly and sized to their contents. Leaving them
   * implicit let a tall grid item spread its excess height evenly across every
   * row it spanned, which is where the empty half-band above a lane's cards
   * came from — the pile spanned both of its lane's rows and half its overflow
   * landed in the leg band.
   */
  const listRows = [
    "auto",
    ...(showSpine ? ["min-content"] : []),
    ...shownLanes.map((_, i) =>
      // The last lane's cells take whatever height is left, so a sparse
      // board's tint reaches the foot of the frame instead of stopping
      // halfway down beside a full-height pile. Only that one track: an fr
      // track never shrinks below its content, and spreading the slack over
      // every row is the bug the explicit tracks above exist to prevent.
      i === shownLanes.length - 1 ? "min-content 1fr" : "min-content min-content",
    ),
  ].join(" ");

  // Hours: the day headers, each draft lane's route, the Sometime shelves,
  // then the hours — which take the rest of the frame, and never less than a
  // readable height per half hour.
  const routeLanes = (hoursLanes ?? []).filter((l) => l !== "decided");
  const shelfRow = 2 + routeLanes.length;
  const hoursRow = shelfRow + 1;
  const gridRows = range
    ? [
        "auto",
        ...routeLanes.map(() => "min-content"),
        "min-content",
        `minmax(${((range.end - range.start) / 30) * HALF_HOUR_REM}rem, 1fr)`,
      ].join(" ")
    : listRows;

  /**
   * The columns where the agreed route changes. Everything between two of them
   * is the same place, so only these need naming — the route strip has the
   * route in full, and "Tokyo" down six day headers said it a third time.
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
  const lanesFrom = showSpine ? 3 : 2;
  const bandRow = (laneIndex: number) => lanesFrom + laneIndex * 2;
  const cellRow = (laneIndex: number) => lanesFrom + 1 + laneIndex * 2;

  return (
    <BoardProvider
      rate={rate}
      stays={stays}
      items={items}
      transit={board.transit}
    >
      <main className="mx-auto mt-6 max-w-[110rem]">
        {/* Phones only. On a desktop the trip bar carries the summary and the
            view's own name heads the board. */}
        <div className="mb-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-2 lg:hidden">
          <p className="font-garamond text-lg leading-snug text-muted-foreground italic">
            Argue in your own lane. Agree with the arrow.
          </p>
          {trip && (
            <TripSummary days={allDays} items={items} spend={spend} />
          )}
        </div>

        {notice && (
          <p
            role={notice.tone === "error" ? "alert" : "status"}
            className={cn(
              "fixed z-40 flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 font-raleway text-sm shadow-lg",
              // Floating rather than in the flow: in the flow, every move and
              // every delete pushed the whole board down a line and back up.
              // Above the tab bar on a phone; bottom centre on a desktop.
              "max-lg:inset-x-4 max-lg:bottom-[calc(4.5rem_+_env(safe-area-inset-bottom))] max-lg:py-3 sm:max-lg:bottom-6",
              "lg:bottom-6 lg:left-1/2 lg:w-[min(36rem,calc(100%-2rem))] lg:-translate-x-1/2",
              notice.tone === "error"
                ? "border-destructive/40 text-destructive"
                : "border-primary/30 text-primary",
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
                collisionDetection={collisionDetection}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                {/* The trip, and the shape of it: its dates, how much of it is
                    still undecided, and the route across every day. */}
                <TripBar
                  trip={trip}
                  trips={board.trips}
                  days={allDays}
                  legs={legs}
                  stays={stays}
                  items={items}
                  laneItems={items.filter((i) => i.lane === headerLane)}
                  spend={spend}
                  activeLegId={activeLegId}
                  onLeg={setActiveLegId}
                  onEditTrip={() => setTripDraft({ trip })}
                  onNewTrip={() => setTripDraft({ trip: null })}
                  onEditLeg={(leg) => setLegDraft({ leg, lane: leg.lane })}
                  onCreateLeg={(lane, from, to) =>
                    setLegDraft({ leg: null, lane, from, to })
                  }
                  onDay={showOnBoard}
                  onScreen={onScreen}
                  today={today}
                />

                {/* Whose board this is. The view's name heads the board and its
                    blurb is the line under it, so the one sentence of
                    instruction on screen is the one true of this view. It
                    replaced a fixed tagline about dragging a card up into
                    Decided — which no single-lane view puts on screen. */}
                <div className="mt-6 flex flex-wrap items-end gap-x-5 gap-y-3">
                  <div className="min-w-0">
                    <h2
                      className="font-garamond text-3xl leading-none"
                      style={{
                        color:
                          shownLanes.length === 1
                            ? LANES[shownLanes[0]].accent
                            : undefined,
                      }}
                    >
                      {shownLanes.length === 1
                        ? LANES[shownLanes[0]].label
                        : viewMeta.label}
                    </h2>
                    <p className="mt-1.5 font-garamond text-lg leading-snug text-muted-foreground italic">
                      {split
                        ? "Both drafts by the hour, over what's agreed. The arrow on a card settles it."
                        : viewMeta.blurb}
                    </p>
                  </div>

                  {/* Adopting a whole route is a lane-level act, so it sits
                      with the lane's name — not in its pile of cards, under
                      the search box, where it used to be. */}
                  {shownLanes
                    .filter(
                      (lane) =>
                        lane !== "decided" && legsIn(legs, lane).length > 0,
                    )
                    .map((lane) => (
                      <button
                        key={lane}
                        type="button"
                        onClick={() => requestAdoptRoute(lane)}
                        style={{ color: LANES[lane].accent }}
                        className="mb-1 flex items-center gap-1.5 rounded-sm border border-current/40 px-2.5 py-1 font-raleway text-[0.65rem] tracking-[0.15em] uppercase transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <ArrowUp
                          className="h-3 w-3"
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                        Use {PLANNERS[LANES[lane].planner ?? "aaron"].label}
                        &apos;s route
                      </button>
                    ))}

                  {/* List is for moving things between days; Hours is for
                    fitting things into one. */}
                  <div
                    role="radiogroup"
                    aria-label="Layout"
                    className="mb-1 ml-auto flex gap-1 rounded-full border border-border p-0.5"
                  >
                    {(["list", "hours"] as const).map((l) => {
                      const on = (hours ? "hours" : "list") === l;
                      return (
                        <button
                          key={l}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          title={
                            l === "list"
                              ? "Each day as a list, for moving things between days"
                              : "Each day by the hour, for fitting things into it"
                          }
                          onClick={() => setLayout(l)}
                          className={cn(
                            "rounded-full px-3 py-1 font-raleway text-[0.65rem] tracking-[0.15em] uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                            on
                              ? "bg-secondary text-primary"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {l === "list" ? "List" : "Hours"}
                        </button>
                      );
                    })}
                  </div>
                  <div
                    role="radiogroup"
                    aria-label="View"
                    className="mb-1 flex gap-1 rounded-full border border-border p-0.5"
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

                {/* One grid, three rows. Horizontal scroll moves all three lanes
              together, which is the point — a day's three cells must always
              line up. */}
                {/* The pile and the grid are exactly one screen tall under the
                    planner bar. At 78vh, with the header above them, they
                    ran past the bottom of any laptop screen: the page and the
                    board both scrolled, and there was no position where the
                    pile's foot and the day headers were on screen together. */}
                <div className="mt-4 flex scroll-mt-[calc(var(--spacing-planner-bar)+0.5rem)] items-start gap-3">
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
                      open={pileOpen}
                      onOpen={setPileOpen}
                    />
                  )}
                  <div
                    ref={scroller}
                    className="rail-scroll h-[calc(100dvh-var(--spacing-planner-bar)-1.5rem)] min-w-0 flex-1 overflow-auto rounded-lg border border-border"
                  >
                    {/* As wide as its columns, not as the frame. A sticky
                        element only travels inside its containing block, so
                        on a frame-wide grid the pinned first column came
                        unstuck about a screen into the trip. */}
                    <div
                      className="grid min-h-full w-max min-w-full"
                      style={{
                        gridTemplateColumns: gridColumns,
                        gridTemplateRows: gridRows,
                      }}
                    >
                      {leadColumn && (
                        <div
                          style={{ gridRow: 1, gridColumn: 1 }}
                          className="sticky top-0 left-0 z-40 border-r-2 border-b border-border bg-background"
                        />
                      )}
                      {visibleDays.map((date, column) => (
                        <DayHeader
                          key={date}
                          style={{ gridRow: 1, gridColumn: dayColumn(column) }}
                          date={date}
                          note={dayNotes.find((d) => d.on_date === date)}
                          legs={legs}
                          laneItems={itemsInCell(items, headerLane, date)}
                          marksChange={marksChange.get(date) ?? true}
                          flights={flightsOnDay(board.flights, date)}
                          transit={transitOnDay(decidedTransit, date)}
                          layout={hours ? "hours" : "list"}
                          sun={clock.get(date)?.sun}
                          isToday={date === today}
                          onEditNote={setNoteDate}
                          onSortByTime={(d) =>
                            startTransition(async () => {
                              await sortDayByTime(d, "decided");
                            })
                          }
                        />
                      ))}

                      {hoursLanes && range && (
                        <>
                          {routeLanes.map((lane, index) => (
                            <LegBand
                              key={lane}
                              lane={lane}
                              legs={legs}
                              stays={stays}
                              days={visibleDays}
                              row={2 + index}
                              firstColumn={dayColumn(0)}
                              stickyLeft={`calc(${RULER} + 0.75rem)`}
                              onEdit={(leg) =>
                                setLegDraft({ leg, lane: leg.lane })
                              }
                              onCreate={(l, from, to) =>
                                setLegDraft({ leg: null, lane: l, from, to })
                              }
                              onAdopt={requestAdoptLeg}
                            />
                          ))}
                          <div
                            aria-hidden="true"
                            style={{
                              gridRow: `2 / ${hoursRow}`,
                              gridColumn: 1,
                            }}
                            className="sticky left-0 z-20 border-r border-b border-border bg-background"
                          />
                          {visibleDays.map((date, column) => (
                            <div
                              key={date}
                              style={{
                                gridRow: shelfRow,
                                gridColumn: dayColumn(column),
                              }}
                              className="grid min-w-0 auto-cols-fr grid-flow-col"
                            >
                              {hoursLanes.map((lane, index) => {
                                const cell = itemsInCell(items, lane, date);
                                return (
                                  <SometimeShelf
                                    key={lane}
                                    lane={lane}
                                    date={date}
                                    // Two shelves a day say whose is whose.
                                    label={
                                      split ? (
                                        <>
                                          <span
                                            style={{
                                              color: LANES[lane].accent,
                                            }}
                                            className="mr-1 font-raleway text-[0.6rem] tracking-[0.15em] not-italic uppercase"
                                          >
                                            {LANES[lane].planner
                                              ? PLANNERS[LANES[lane].planner]
                                                  .label
                                              : LANES[lane].label}
                                          </span>
                                          sometime
                                        </>
                                      ) : undefined
                                    }
                                    items={cell.filter(
                                      (i) => i.start_time === null,
                                    )}
                                    timed={cell.filter(
                                      (i) => i.start_time !== null,
                                    )}
                                    anchors={clock.get(date)?.anchors ?? []}
                                    expanded={shelvesOpen}
                                    onExpand={setShelvesOpen}
                                    actions={actions}
                                    onAdd={(l, d) =>
                                      setDraft({
                                        item: null,
                                        lane: l,
                                        onDate: d,
                                      })
                                    }
                                    isToday={index === 0 && date === today}
                                  />
                                );
                              })}
                            </div>
                          ))}
                          <HoursRuler
                            range={range}
                            style={{ gridRow: hoursRow, gridColumn: 1 }}
                          />
                          {visibleDays.map((date, column) => {
                            const day = clock.get(date);
                            return (
                              <HoursCell
                                key={date}
                                style={{
                                  gridRow: hoursRow,
                                  gridColumn: dayColumn(column),
                                }}
                                date={date}
                                range={range}
                                tracks={hoursLanes.map((lane) => ({
                                  lane,
                                  items: itemsInCell(items, lane, date).filter(
                                    (i) => i.start_time !== null,
                                  ),
                                }))}
                                ghosts={
                                  split
                                    ? itemsInCell(items, "decided", date).filter(
                                        (i) => i.start_time !== null,
                                      )
                                    : []
                                }
                                anchors={day?.anchors ?? []}
                                marks={day?.marks ?? []}
                                sun={day?.sun ?? sunOn(date)}
                                slot={
                                  slot && parseHoursId(slot.cell)?.date === date
                                    ? slot
                                    : null
                                }
                                dragging={activeId !== null}
                                isToday={date === today}
                                actions={actions}
                                onAddAt={(l, d, time) =>
                                  setDraft({
                                    item: null,
                                    lane: l,
                                    onDate: d,
                                    startTime: time,
                                  })
                                }
                                onResize={resize}
                              />
                            );
                          })}
                          <HoursLines
                            range={range}
                            style={{ gridRow: hoursRow, gridColumn: "2 / -1" }}
                          />
                        </>
                      )}

                      {showSpine && (
                        <>
                          <button
                            type="button"
                            onClick={() => setView("decided")}
                            title={`Open ${LANES.decided.label}`}
                            style={{
                              gridRow: 2,
                              gridColumn: 1,
                              backgroundColor: LANES.decided.tint,
                              color: LANES.decided.accent,
                            }}
                            className="sticky left-0 z-20 flex items-center justify-center border-r-2 border-b-2 border-r-border border-b-primary/30 font-raleway text-[0.6rem] tracking-[0.25em] uppercase transition-colors hover:brightness-95 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                          >
                            <span className="rotate-180 [writing-mode:vertical-rl]">
                              {LANES.decided.label}
                            </span>
                          </button>
                          {visibleDays.map((date, column) => (
                            <DecidedSpineCell
                              key={date}
                              style={{ gridRow: 2, gridColumn: dayColumn(column) }}
                              date={date}
                              items={itemsInCell(items, "decided", date)}
                              isToday={date === today}
                              onEdit={actions.onEdit}
                            />
                          ))}
                        </>
                      )}

                      {gridLanes.map((lane, laneIndex) => (
                        <Fragment key={lane}>
                          {/* The turned name, Compare only. Clicking it opens
                              that person's own view: Compare has no pile to
                              open, which is what this used to try to do. */}
                          {laneColumn && (
                            <button
                              type="button"
                              onClick={() => setView(lane)}
                              title={`Open ${LANES[lane].label}`}
                              style={{
                                gridRow: `${bandRow(laneIndex)} / span 2`,
                                gridColumn: 1,
                                backgroundColor: LANES[lane].tint,
                                color: LANES[lane].accent,
                              }}
                              className="sticky left-0 z-20 flex items-center justify-center border-r-2 border-b border-border font-raleway text-[0.6rem] tracking-[0.25em] uppercase transition-colors hover:brightness-95 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                            >
                              <span className="rotate-180 [writing-mode:vertical-rl]">
                                {LANES[lane].label}
                              </span>
                            </button>
                          )}
                          {/* Decided's route is the route strip up top, so
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
                              firstColumn={dayColumn(0)}
                              stickyLeft={
                                laneColumn
                                  ? `calc(${laneColumn} + 0.75rem)`
                                  : "0.75rem"
                              }
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
                                gridColumn: dayColumn(column),
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
                    <div className="relative h-full">
                      {dragFace === "block" ? (
                        <HoursBlockFace
                          item={dragging}
                          start={slot?.start ?? itemStart(dragging) ?? 0}
                          length={itemLength(dragging)}
                          overlay
                        />
                      ) : dragFace === "chip" ? (
                        <ShelfChipFace item={dragging} overlay />
                      ) : (
                        <div className="w-[15rem]">
                          <ItemCardFace item={dragging} overlay />
                        </div>
                      )}
                      {/* When it would start, said where the eye already is. */}
                      {slot && (
                        <span
                          className={cn(
                            "absolute bottom-full left-0 mb-1 rounded-sm px-1.5 py-0.5 font-mono text-[0.6rem] whitespace-nowrap text-primary-foreground shadow-sm tabular-nums slashed-zero",
                            slot.problems.length > 0 ? "bg-warn" : "bg-primary",
                          )}
                        >
                          {toTime(slot.start)}–
                          {toTime(slot.start + itemLength(slot.item))}
                          {slot.problems.map((p) => ` · ${p}`).join("")}
                        </span>
                      )}
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

/** Where a day column starts in the scroller's content, in pixels. */
function columnX(el: HTMLElement, column: HTMLElement) {
  return (
    column.getBoundingClientRect().left -
    el.getBoundingClientRect().left -
    el.clientLeft +
    el.scrollLeft
  );
}

/**
 * Which day columns are mostly on screen, as indices into the board's columns.
 * A column counts once its middle is visible — clear of the sticky lane column
 * on the left, and of the scroller's edge on the right.
 */
function columnsOnScreen(el: HTMLElement) {
  const first = el.querySelector<HTMLElement>("[data-board-day]");
  if (!first || first.offsetWidth === 0) return null;
  const width = first.offsetWidth;
  const lane = columnX(el, first);
  const from = Math.max(0, Math.round(el.scrollLeft / width));
  const to = Math.floor(
    (el.scrollLeft + el.clientWidth - lane) / width - 0.5,
  );
  return { first: from, last: Math.max(from, to) };
}

/** Scroll so `date` is the first column, just right of the lane column. */
function scrollBoardTo(el: HTMLElement, date: string) {
  const first = el.querySelector<HTMLElement>("[data-board-day]");
  const target = el.querySelector<HTMLElement>(`[data-board-day="${date}"]`);
  if (!first || !target) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollTo({
    left: columnX(el, target) - columnX(el, first),
    behavior: reduced ? "auto" : "smooth",
  });
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

/** The view and layout, as the query string. List is the default and goes unsaid. */
function writeBoardParams(view: BoardView, layout: BoardLayout) {
  const params = new URLSearchParams({ view });
  if (layout === "hours") params.set("layout", layout);
  window.history.replaceState(null, "", `?${params}`);
}
