"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { moveCard, createCard } from "@/app/actions/board";
import { positionBetween, REVIEW_LABEL } from "@/lib/board-types";
import type { BoardCard, BoardLane, BoardProject, ReviewKind } from "@/lib/board-types";
import { LockGlyph, FlagGlyph, DotGlyph, BarredGlyph } from "./glyphs";

/**
 * The board, drawn as a forum index.
 *
 * Each column is a module with a title bar and a count, the way a forum
 * category showed its topic count; each card is a thread row with a status
 * glyph in a left gutter. That is not decoration — it is the same information
 * problem (what state is this in, down a dense list) solved the way this skin
 * already solves it.
 *
 * Dragging presses a card IN rather than lifting it out: `bevel-in` on the
 * overlay, because a bevelled button in 2004 went down when you pressed it.
 * There is no shadow and no scale.
 *
 * Writes are optimistic. The server action revalidates, so the authoritative
 * order arrives a moment later; without the local move the card snaps back to
 * where it started for as long as the round trip takes, which reads as the
 * drag having failed.
 */

type Filter = "all" | "flagged" | "locked";

export function Board({
  project,
  lanes: initialLanes,
}: {
  project: BoardProject;
  lanes: BoardLane[];
}) {
  const [lanes, setLanes] = useState(initialLanes);
  const [dragging, setDragging] = useState<BoardCard | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [, startTransition] = useTransition();

  /* Server state wins whenever it arrives. The optimistic move below writes to
     `lanes`, and a revalidate then sends a fresh `initialLanes` that plain
     useState would ignore — the board would silently stop reflecting anything
     done in another tab, or by Claude.

     Adjusted during render rather than in an effect: `set-state-in-effect` is
     an error in this repo, and React re-runs this component immediately
     without committing the discarded pass. Compared by identity, which is
     enough — a new array only arrives when the server actually sent one. */
  const [seen, setSeen] = useState(initialLanes);
  if (seen !== initialLanes) {
    setSeen(initialLanes);
    setLanes(initialLanes);
  }

  const sensors = useSensors(
    // A card is also a button that opens it, so a drag has to be deliberate.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const flaggedCount = lanes.reduce(
    (n, lane) => n + lane.cards.filter((c) => c.review_kind).length,
    0,
  );
  const lockedCount = lanes.reduce(
    (n, lane) => n + lane.cards.filter((c) => c.locked_at).length,
    0,
  );

  function visible(cards: BoardCard[]) {
    if (filter === "flagged") return cards.filter((c) => c.review_kind);
    if (filter === "locked") return cards.filter((c) => c.locked_at);
    return cards;
  }

  function onDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    for (const lane of lanes) {
      const card = lane.cards.find((c) => c.id === id);
      if (card) return setDragging(card);
    }
  }

  function onDragEnd(event: DragEndEvent) {
    setDragging(null);
    const { active, over } = event;
    if (!over) return;

    const cardId = String(active.id);
    const from = lanes.find((l) => l.cards.some((c) => c.id === cardId));
    if (!from) return;

    // `over` is either a column (dropped on empty space) or another card.
    const overId = String(over.id);
    const to =
      lanes.find((l) => l.column.id === overId) ??
      lanes.find((l) => l.cards.some((c) => c.id === overId));
    if (!to) return;

    const card = from.cards.find((c) => c.id === cardId)!;
    const target = to.cards.filter((c) => c.id !== cardId);
    const atIndex =
      overId === to.column.id
        ? target.length
        : target.findIndex((c) => c.id === overId);
    const index = atIndex < 0 ? target.length : atIndex;

    const position = positionBetween(
      target[index - 1]?.position,
      target[index]?.position,
    );

    setLanes((current) =>
      current.map((lane) => {
        if (lane.column.id === from.column.id && lane.column.id === to.column.id) {
          const rest = lane.cards.filter((c) => c.id !== cardId);
          rest.splice(index, 0, { ...card, position });
          return { ...lane, cards: rest };
        }
        if (lane.column.id === from.column.id) {
          return { ...lane, cards: lane.cards.filter((c) => c.id !== cardId) };
        }
        if (lane.column.id === to.column.id) {
          const rest = [...target];
          rest.splice(index, 0, { ...card, column_id: to.column.id, position });
          return { ...lane, cards: rest };
        }
        return lane;
      }),
    );

    startTransition(async () => {
      await moveCard(
        cardId,
        to.column.id,
        target[index - 1]?.position,
        target[index]?.position,
      );
    });
  }

  return (
    <div className="space-y-2">
      <FilterRow
        filter={filter}
        onFilter={setFilter}
        flagged={flaggedCount}
        locked={lockedCount}
        projectLocked={Boolean(project.locked_at)}
      />

      <DndContext
        id="board"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        {/* Columns run off the side on a narrow screen rather than stacking:
            a Kanban that stacks is a list, and the comparison between columns
            is the whole point of looking at one. */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {lanes.map((lane) => (
            <Column
              key={lane.column.id}
              lane={lane}
              cards={visible(lane.cards)}
              projectId={project.id}
              hiddenByFilter={lane.cards.length - visible(lane.cards).length}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {dragging ? <CardFace card={dragging} pressed /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function FilterRow({
  filter,
  onFilter,
  flagged,
  locked,
  projectLocked,
}: {
  filter: Filter;
  onFilter: (f: Filter) => void;
  flagged: number;
  locked: number;
  projectLocked: boolean;
}) {
  const tabs: { key: Filter; label: string; count?: number }[] = [
    { key: "all", label: "Everything" },
    { key: "flagged", label: "Waiting on you", count: flagged },
    { key: "locked", label: "Locked", count: locked },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onFilter(tab.key)}
          aria-pressed={filter === tab.key}
          className={`rounded-xs font-dot text-[12px] leading-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-me-gold ${
            filter === tab.key
              ? "text-me-gold underline underline-offset-4"
              : "text-me-dim hover:text-me-ink"
          }`}
        >
          {tab.label}
          {tab.count ? (
            <span className={tab.key === "flagged" ? "text-me-live" : ""}>
              {" "}
              ({tab.count})
            </span>
          ) : null}
        </button>
      ))}

      {projectLocked ? (
        <span className="ml-auto flex items-center gap-1.5 text-[12px] text-me-gold">
          <LockGlyph />
          Locked — Claude cannot change anything here
        </span>
      ) : null}
    </div>
  );
}

function Column({
  lane,
  cards,
  projectId,
  hiddenByFilter,
}: {
  lane: BoardLane;
  cards: BoardCard[];
  projectId: string;
  hiddenByFilter: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: lane.column.id });
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();

  return (
    /* Capped and scrolled per column rather than letting the tallest set the
       page height. Fifteen backlog cards against two in progress made the page
       2,500px of mostly empty columns, and the comparison between columns —
       the reason to look at a board at all — was off screen by the third one.
       Same move the honeymoon grid makes for the same reason. */
    <section className="flex max-h-[62dvh] w-[232px] shrink-0 flex-col bevel-out bg-me-panel shadow-[3px_3px_0_var(--color-me-edge-lo)]">
      <h3 className="flex items-center gap-1.5 border-b-2 border-me-edge-lo bg-me-bar px-2.5 py-1.5 font-dot text-[13px] leading-none text-me-gold">
        {lane.column.name}
        <span className="text-me-dim">{lane.cards.length}</span>
        {!lane.column.agent_can_enter ? (
          <span className="ml-auto" title="Claude cannot move cards into this column">
            <BarredGlyph />
          </span>
        ) : null}
      </h3>

      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto space-y-1.5 p-1.5 ${isOver ? "bevel-in bg-me-void" : ""}`}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} />
          ))}
        </SortableContext>

        {cards.length === 0 ? (
          <p className="px-1 py-3 text-center text-[12px] text-me-dim">
            {hiddenByFilter > 0
              ? `${hiddenByFilter} hidden by the filter`
              : "Nothing here yet."}
          </p>
        ) : null}

        {adding ? (
          <form
            action={(formData) => {
              const title = String(formData.get("title") ?? "");
              setAdding(false);
              startTransition(async () => {
                await createCard(projectId, lane.column.id, title);
              });
            }}
          >
            <input
              name="title"
              autoFocus
              placeholder="What needs doing?"
              className="w-full bevel-in bg-me-void px-2 py-1.5 text-[13px] text-me-ink placeholder:text-me-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
              onBlur={(e) => {
                if (!e.currentTarget.value.trim()) setAdding(false);
              }}
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full bevel-out bg-me-panel px-2 py-1 text-left text-[12px] text-me-dim hover:text-me-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
          >
            + Add a card
          </button>
        )}
      </div>
    </section>
  );
}

function SortableCard({ card }: { card: BoardCard }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, disabled: Boolean(card.locked_at) });

  const open = () => router.push(`/me/board/${card.id}`);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      /* A card is both a handle and a link. The pointer sensor's 6px
         activation constraint is what separates them: a press that does not
         travel is a click, and anything further is a drag. dnd-kit's keyboard
         sensor lifts with space, so Enter is free to open. */
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          open();
        }
      }}
      /* The original stays in place while the overlay travels; hiding it
         entirely makes the column collapse and reflow under the pointer. */
      className={`cursor-pointer ${isDragging ? "opacity-35" : ""}`}
    >
      <CardFace card={card} />
    </div>
  );
}

function CardFace({ card, pressed = false }: { card: BoardCard; pressed?: boolean }) {
  const locked = Boolean(card.locked_at);
  const flagged = card.review_kind as ReviewKind | null;

  return (
    <article
      className={`${pressed || locked ? "bevel-in" : "bevel-out"} ${
        locked ? "bg-me-void" : "bg-me-panel"
      } px-2 py-1.5`}
    >
      <div className="flex gap-1.5">
        {/* The gutter. One glyph wide, always present, so titles line up
            whether or not a card has anything claimed about it. */}
        <span className="mt-0.5 shrink-0">
          {locked ? <LockGlyph /> : flagged ? <FlagGlyph /> : <DotGlyph />}
        </span>

        <div className="min-w-0 flex-1">
          <p
            className={`text-[13px] leading-snug ${
              locked ? "text-me-dim" : "text-me-ink"
            }`}
          >
            {card.title}
          </p>

          {flagged ? (
            <p className="mt-1 text-[11px] leading-snug text-me-live">
              Claude {REVIEW_LABEL[flagged]}
              {card.review_note ? `: ${card.review_note}` : ""}
            </p>
          ) : null}

          {card.labels.length > 0 ? (
            <p className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-me-dim">
              {card.labels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
