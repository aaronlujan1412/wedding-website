"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PanelLeftClose, PanelLeftOpen, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SortableItemCard, type CardActions } from "./ItemCard";
import { useRate } from "./RateContext";
import { LANES, LANE_ORDER, POOL, cellId, formatYen, sumYen } from "./trip";
import type { Lane, TripItem } from "./types";

/**
 * Every lane's pile, beside the board instead of inside it.
 *
 * The piles used to be the board's first column, one per lane, each spanning
 * that lane's two grid rows. That put a 91-card list in charge of how tall a
 * mostly-empty day grid was: the row grew to fit the pile, the day cells
 * stretched with it, and getting to the third lane meant scrolling past two
 * other backlogs. A long list wants a tall narrow box and a sparse grid wants
 * width — the old layout had them exactly the wrong way round.
 *
 * Out here it scrolls on its own, and the grid's rows shrink to the cards
 * actually on those days.
 */
export function IdeaPanel({
  lane,
  onLane,
  items,
  query,
  onQuery,
  actions,
  onAdd,
  open,
  onOpen,
}: {
  /** Which lane's pile is showing. */
  lane: Lane;
  onLane: (lane: Lane) => void;
  /** Every item, so each tab can count its own pile. */
  items: TripItem[];
  query: string;
  onQuery: (next: string) => void;
  actions: CardActions;
  onAdd: (lane: Lane) => void;
  open: boolean;
  onOpen: (next: boolean) => void;
}) {
  const meta = LANES[lane];
  const rate = useRate();
  const { setNodeRef, isOver } = useDroppable({ id: cellId(lane, null) });

  const pileOf = (l: Lane) =>
    items.filter((i) => i.lane === l && i.on_date === null);
  const pile = pileOf(lane);
  const loose = sumYen(pile, rate);
  const unsorted = pile.filter((i) => i.kind === "unsorted").length;

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? pile.filter((item) =>
        `${item.title} ${item.title_ja ?? ""} ${item.city ?? ""} ${item.notes ?? ""}`
          .toLowerCase()
          .includes(needle),
      )
    : pile;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => onOpen(true)}
        // Clear of the site navbar, which is fixed and about 5.5rem tall.
        className="sticky top-24 flex h-fit flex-none items-center gap-2 self-start rounded-lg border border-border bg-card px-2 py-3 font-raleway text-[0.65rem] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [writing-mode:vertical-rl]"
      >
        <PanelLeftOpen className="h-3.5 w-3.5 rotate-90" strokeWidth={2} />
        Ideas · {pile.length}
      </button>
    );
  }

  return (
    <aside
      ref={setNodeRef}
      style={{ backgroundColor: meta.tint }}
      className={cn(
        // Not sticky: it is the grid's height, so there is nothing to stick
        // within — and top-4 slid its tabs under the site navbar.
        "flex h-[calc(100dvh-7rem)] w-[17rem] flex-none flex-col rounded-lg border border-border",
        isOver && "ring-2 ring-inset ring-primary",
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-2.5">
        <div
          role="tablist"
          aria-label="Whose pile"
          className="flex min-w-0 gap-1"
        >
          {LANE_ORDER.map((l) => {
            const on = l === lane;
            return (
              <button
                key={l}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => onLane(l)}
                style={on ? { color: LANES[l].accent } : undefined}
                className={cn(
                  "rounded-sm px-1.5 py-0.5 font-raleway text-[0.6rem] tracking-[0.15em] uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                  on ? "bg-background" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {LANES[l].planner ? PLANNER_SHORT[l] : "Decided"}
                <span className="ml-1 font-mono tabular-nums slashed-zero">
                  {pileOf(l).length}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => onOpen(false)}
          aria-label="Hide the pile"
          className="flex h-6 w-6 flex-none items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
        >
          <PanelLeftClose className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

      <p className="mt-1.5 px-3 font-mono text-[0.6rem] tracking-wider text-muted-foreground uppercase tabular-nums slashed-zero">
        {meta.pile}
        {loose > 0 && ` · ${formatYen(loose)}`}
        {/* A count, not a warning. Nothing is wrong with an unsorted card —
            it just hasn't been looked at yet. */}
        {unsorted > 0 && ` · ${unsorted} unsorted`}
      </p>

      <div className="mt-2 flex items-center gap-1.5 px-3">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search"
            className="h-8 w-full rounded-md border border-input bg-background pr-6 pl-7 font-raleway text-base text-foreground sm:text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQuery("")}
              aria-label="Clear the search"
              className="absolute top-1/2 right-1 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" strokeWidth={2} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => onAdd(lane)}
          aria-label="Add an idea"
          title="Add an idea"
          className="flex h-8 w-8 flex-none items-center justify-center rounded-md border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

      <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 pb-3">
        <SortableContext
          items={visible.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {visible.map((item) => (
            <SortableItemCard key={item.id} item={item} actions={actions} />
          ))}
        </SortableContext>

        {visible.length === 0 && (
          <p
            id={`empty-${cellId(lane, null)}-${POOL}`}
            className="rounded-md border border-dashed border-border px-3 py-4 text-center font-garamond text-sm leading-snug text-muted-foreground"
          >
            {pile.length === 0
              ? "Nothing loose. Throw an idea in — it doesn't have to be good."
              : "Nothing matches that."}
          </p>
        )}
      </div>
    </aside>
  );
}

/** The tabs are narrow, so the piles go by first name. */
const PLANNER_SHORT: Record<Lane, string> = {
  decided: "Decided",
  savea: "Savea",
  aaron: "Aaron",
};
