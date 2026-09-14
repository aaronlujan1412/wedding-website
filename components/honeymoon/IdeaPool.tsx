"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { SortableItemCard } from "./ItemCard";
import { KINDS, POOL, formatYen, sumYen } from "./trip";
import type { ItemKind, TripItem } from "./types";

/**
 * Everything you both want to do that hasn't landed on a day yet. This is the
 * backlog, and it is the column the trip actually gets planned out of — so it
 * sticks to the left edge while the days scroll past under the drag.
 */
export function IdeaPool({
  items,
  onEdit,
  onNudge,
  onAdd,
}: {
  items: TripItem[];
  onEdit: (item: TripItem) => void;
  onNudge: (item: TripItem, delta: number) => void;
  onAdd: (date: string | null) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: POOL });
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<ItemKind | "all">("all");

  const visible = items.filter((item) => {
    if (kind !== "all" && item.kind !== kind) return false;
    if (!query.trim()) return true;
    const haystack =
      `${item.title} ${item.title_ja ?? ""} ${item.city ?? ""} ${item.notes ?? ""}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "sticky left-0 z-20 flex w-[19rem] flex-none flex-col rounded-lg border bg-card transition-colors",
        isOver ? "border-primary bg-secondary" : "border-border",
      )}
    >
      <header className="border-b border-border px-3 py-2.5">
        <p className="font-raleway text-[0.65rem] uppercase tracking-[0.25em] text-primary">
          Not placed yet
        </p>
        <p className="mt-0.5 font-garamond text-lg leading-tight text-foreground">
          The maybe pile
        </p>
        <p className="mt-0.5 font-mono text-[0.6rem] tracking-wide text-muted-foreground tabular-nums slashed-zero">
          {items.length} idea{items.length === 1 ? "" : "s"}
          {sumYen(items) > 0 && ` · ${formatYen(sumYen(items))} if you did it all`}
        </p>

        <label className="relative mt-2 block">
          <Search
            className="pointer-events-none absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the pile"
            className="h-7 w-full rounded-sm border border-input bg-background pr-2 pl-7 font-raleway text-xs text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </label>

        <div className="mt-2 flex flex-wrap gap-1">
          <KindChip active={kind === "all"} onClick={() => setKind("all")}>
            All
          </KindChip>
          {(Object.keys(KINDS) as ItemKind[]).map((k) => (
            <KindChip
              key={k}
              active={kind === k}
              color={KINDS[k].color}
              onClick={() => setKind(kind === k ? "all" : k)}
            >
              {KINDS[k].label}
            </KindChip>
          ))}
        </div>
      </header>

      <div className="rail-scroll min-h-[7rem] flex-1 space-y-2 overflow-y-auto px-3 py-3">
        <SortableContext
          items={visible.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {visible.map((item) => (
            <SortableItemCard
              key={item.id}
              item={item}
              actions={{ onEdit, onNudge }}
            />
          ))}
        </SortableContext>

        {visible.length === 0 && (
          <p className="rounded-md border border-dashed border-border px-3 py-6 text-center font-garamond text-sm text-muted-foreground">
            {items.length === 0
              ? "Nothing yet. Every trip starts with one thing you can't stop thinking about."
              : "Nothing matches that."}
          </p>
        )}
      </div>

      <footer className="border-t border-border px-3 py-2">
        <button
          type="button"
          onClick={() => onAdd(null)}
          className="flex w-full items-center justify-center gap-1 rounded-sm py-1 font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Plus className="h-3 w-3" strokeWidth={2} />
          Add an idea
        </button>
      </footer>
    </section>
  );
}

function KindChip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={active && color ? { borderColor: color, color } : undefined}
      className={cn(
        "rounded-full border px-2 py-0.5 font-raleway text-[0.6rem] tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
        active
          ? "border-primary text-primary"
          : "border-border text-muted-foreground hover:border-primary/50",
      )}
    >
      {children}
    </button>
  );
}
