"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
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
import { MapPinned, Plus, Printer, ScrollText } from "lucide-react";
import { moveItem, sortDayByTime } from "@/app/actions/honeymoon";
import { cn } from "@/lib/utils";
import { DayColumn } from "./DayColumn";
import { DayNoteDialog } from "./DayNoteDialog";
import { DayRibbon, RIBBON_PREFIX } from "./DayRibbon";
import { IdeaPool } from "./IdeaPool";
import { ItemCardFace } from "./ItemCard";
import { ItemDialog, type ItemDraft } from "./ItemDialog";
import { LegDialog } from "./LegDialog";
import { TripDocsPanel } from "./TripDocsPanel";
import {
  POOL,
  containerOf,
  eachDay,
  formatYen,
  itemsIn,
  positionBetween,
  sumYen,
  todayISO,
  tripDays,
  yenToUsd,
} from "./trip";
import type { TripBoard, TripItem, TripLeg } from "./types";

export function HoneymoonBoard({ board }: { board: TripBoard }) {
  const { legs, days: dayNotes, docs } = board;

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
  const [legDialog, setLegDialog] = useState<{
    open: boolean;
    leg: TripLeg | null;
  }>({ open: false, leg: null });
  const [activeLegId, setActiveLegId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const today = todayISO();
  const allDays = useMemo(() => tripDays(legs), [legs]);
  const dayLookup = useMemo(() => new Set(allDays), [allDays]);

  const activeLeg = legs.find((l) => l.id === activeLegId) ?? null;
  const visibleDays = activeLeg
    ? eachDay(activeLeg.starts_on, activeLeg.ends_on)
    : allDays;

  const pool = itemsIn(items, POOL);
  const placed = items.filter((i) => i.on_date !== null);
  const booked = placed.filter(
    (i) => i.booking_status === "booked" || i.booking_status === "in_hand",
  ).length;
  const spend = sumYen(items) + sumYen(docs);

  const sensors = useSensors(
    // A small threshold so a tap still reaches the buttons on the card.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  /** Which column an arbitrary drop target belongs to. */
  function resolveContainer(id: string): string | null {
    if (id.startsWith(RIBBON_PREFIX)) return id.slice(RIBBON_PREFIX.length);
    if (id === POOL || dayLookup.has(id)) return id;
    const item = items.find((i) => i.id === id);
    return item ? containerOf(item) : null;
  }

  /**
   * Where the dragged card would land: which column, and the fractional
   * position between whichever two neighbours it is hovering between.
   */
  function computeDrop(event: DragOverEvent | DragEndEvent) {
    const { active, over } = event;
    if (!over) return null;

    const activeItem = items.find((i) => i.id === active.id);
    if (!activeItem) return null;

    const container = resolveContainer(String(over.id));
    if (container === null) return null;

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
      // Dropped on the column itself (or a ribbon chip) — append.
      position = positionBetween(siblings.at(-1)?.position, undefined);
    }

    return {
      id: activeItem.id,
      onDate: container === POOL ? null : container,
      position,
    };
  }

  const lastDrop = useRef<ReturnType<typeof computeDrop>>(null);

  function applyLocally(drop: NonNullable<ReturnType<typeof computeDrop>>) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === drop.id
          ? { ...i, on_date: drop.onDate, position: drop.position }
          : i,
      ),
    );
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    lastDrop.current = null;
  }

  function handleDragOver(event: DragOverEvent) {
    const drop = computeDrop(event);
    if (!drop) return;

    const current = items.find((i) => i.id === drop.id);
    if (current?.on_date === drop.onDate && current.position === drop.position)
      return;

    lastDrop.current = drop;
    applyLocally(drop);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const drop = computeDrop(event) ?? lastDrop.current;
    lastDrop.current = null;
    if (!drop) return;

    applyLocally(drop);
    startTransition(async () => {
      await moveItem(drop.id, drop.onDate, drop.position);
    });
  }

  /**
   * The arrow buttons on every card. Dragging across a twelve-day board on a
   * phone is miserable, so shifting a card one day at a time is the real move
   * control — and the first nudge left off day one drops it back in the pile.
   */
  function nudge(item: TripItem, delta: number) {
    const index = item.on_date ? allDays.indexOf(item.on_date) : -1;
    let target: string | null;

    if (index === -1) {
      if (delta < 0 || allDays.length === 0) return;
      target = allDays[0];
    } else {
      const next = index + delta;
      if (next >= allDays.length) return;
      target = next < 0 ? null : allDays[next];
    }

    const siblings = itemsIn(items, target ?? POOL).filter(
      (i) => i.id !== item.id,
    );
    const position = positionBetween(siblings.at(-1)?.position, undefined);

    applyLocally({ id: item.id, onDate: target, position });
    startTransition(async () => {
      await moveItem(item.id, target, position);
    });
  }

  const dragging = activeId ? items.find((i) => i.id === activeId) : null;

  return (
    <main className="mx-auto min-h-screen max-w-[110rem] px-6 pt-40 pb-24">
      <header className="mb-8">
        <p className="font-raleway text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Back of house · just the two of us
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <h1 className="font-corinthia text-7xl leading-none text-pop md:text-8xl">
              Honeymoon
            </h1>
            <p className="mt-2 font-garamond text-xl italic text-muted-foreground">
              Fill the pile, then hand the days out between us.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <dl className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-muted-foreground tabular-nums slashed-zero">
              <Stat label="days" value={allDays.length} />
              <Stat label="in the pile" value={pool.length} />
              <Stat label="placed" value={placed.length} />
              <Stat label="sealed" value={booked} />
              {spend > 0 && (
                <Stat label={yenToUsd(spend)} value={formatYen(spend)} raw />
              )}
            </dl>
            <div className="flex gap-3">
              <ToolLink
                href="/honeymoon/itinerary"
                icon={<ScrollText className="h-3.5 w-3.5" strokeWidth={1.5} />}
              >
                Itinerary
              </ToolLink>
              <ToolLink
                href="/honeymoon/pocket"
                icon={<Printer className="h-3.5 w-3.5" strokeWidth={1.5} />}
              >
                Pocket
              </ToolLink>
            </div>
          </div>
        </div>
      </header>

      {/* Legs */}
      <div className="flex flex-wrap items-center gap-2 border-y border-border py-3">
        <LegPill
          active={activeLegId === null}
          onClick={() => setActiveLegId(null)}
        >
          Whole trip
        </LegPill>
        {legs.map((leg) => (
          <LegPill
            key={leg.id}
            active={activeLegId === leg.id}
            onClick={() => setActiveLegId(leg.id)}
            onEdit={() => setLegDialog({ open: true, leg })}
          >
            {leg.name}
            {leg.name_ja && (
              <span className="ml-1 font-jp text-[0.65rem] opacity-70">
                {leg.name_ja}
              </span>
            )}
          </LegPill>
        ))}
        <button
          type="button"
          onClick={() => setLegDialog({ open: true, leg: null })}
          className="flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Plus className="h-3 w-3" strokeWidth={2} />
          Leg
        </button>
      </div>

      {legs.length === 0 ? (
        <EmptyTrip onAddLeg={() => setLegDialog({ open: true, leg: null })} />
      ) : (
        <DndContext
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
              legs={legs}
              items={items}
              activeLegId={activeLegId}
              today={today}
            />
          </div>

          <div className="rail-scroll mt-4 flex h-[min(72vh,46rem)] gap-4 overflow-x-auto pb-4">
            <IdeaPool
              items={pool}
              onEdit={(item) => setDraft({ item, onDate: null })}
              onNudge={nudge}
              onAdd={(date) => setDraft({ item: null, onDate: date })}
            />

            {visibleDays.map((date) => (
              <DayColumn
                key={date}
                date={date}
                note={dayNotes.find((d) => d.on_date === date)}
                legs={legs}
                items={itemsIn(items, date)}
                isToday={date === today}
                onEdit={(item) => setDraft({ item, onDate: date })}
                onNudge={nudge}
                onAdd={(d) => setDraft({ item: null, onDate: d })}
                onEditNote={setNoteDate}
                onSortByTime={(d) =>
                  startTransition(async () => {
                    await sortDayByTime(d);
                  })
                }
              />
            ))}
          </div>

          <DragOverlay>
            {dragging ? (
              <div className="w-[15rem]">
                <ItemCardFace item={dragging} overlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <TripDocsPanel docs={docs} legs={legs} />

      <ItemDialog draft={draft} days={allDays} onClose={() => setDraft(null)} />
      <DayNoteDialog
        date={noteDate}
        existing={dayNotes.find((d) => d.on_date === noteDate)}
        onClose={() => setNoteDate(null)}
      />
      <LegDialog
        open={legDialog.open}
        leg={legDialog.leg}
        onClose={() => setLegDialog({ open: false, leg: null })}
      />
    </main>
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

function ToolLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-sm font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {icon}
      {children}
    </Link>
  );
}

function LegPill({
  active,
  onClick,
  onEdit,
  children,
}: {
  active: boolean;
  onClick: () => void;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className="rounded-full px-3 py-1 font-raleway text-[0.7rem] uppercase tracking-[0.2em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {children}
      </button>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit leg"
          className="pr-2.5 pl-0.5 text-[0.7rem] opacity-60 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          ✎
        </button>
      )}
    </span>
  );
}

function EmptyTrip({ onAddLeg }: { onAddLeg: () => void }) {
  return (
    <div className="mt-16 rounded-lg border border-dashed border-border px-8 py-20 text-center">
      <MapPinned
        className="mx-auto h-8 w-8 text-primary"
        strokeWidth={1.25}
        aria-hidden="true"
      />
      <h2 className="mt-4 font-garamond text-3xl text-foreground">
        Start with a city and a stretch of days
      </h2>
      <p className="mx-auto mt-2 max-w-md font-garamond text-lg leading-relaxed text-muted-foreground">
        Tokyo for five nights, Kyoto for four. The board draws a column for
        every day in a leg, and everything else hangs off that.
      </p>
      <button
        type="button"
        onClick={onAddLeg}
        className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 font-raleway text-[0.7rem] uppercase tracking-[0.2em] text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        Add the first leg
      </button>
    </div>
  );
}
