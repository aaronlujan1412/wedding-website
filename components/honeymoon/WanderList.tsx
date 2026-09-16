"use client";

import { useState, useTransition } from "react";
import { Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { setWanderItem } from "@/app/actions/honeymoon";
import { useBoardData } from "./BoardContext";
import { wanderCandidates, wanderIdeas } from "./blockouts";
import { TextInput } from "./FormParts";
import { kindOf } from "./trip";
import type { TripItem } from "./types";

/**
 * What to check out on a wander afternoon.
 *
 * Attaching happens here rather than on each card, because the question is
 * "what shall we do around here", asked once, against a pile of a hundred
 * ideas — not a hundred separate edits. Writes go straight through instead of
 * waiting for the form's Save: the cards being changed are other rows, and
 * half-applying them on a cancelled form would be worse than applying them
 * as you tick.
 */
export function WanderList({ item }: { item: TripItem | null }) {
  const { items } = useBoardData();
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();

  if (!item) {
    return (
      <p className="font-garamond text-sm leading-snug text-muted-foreground">
        Save this first, then pick what to check out while you&apos;re there.
      </p>
    );
  }

  const attached = wanderIdeas(item, items);
  const needle = query.trim().toLowerCase();
  const candidates = wanderCandidates(item, items)
    .filter((i) =>
      needle
        ? `${i.title} ${i.title_ja ?? ""} ${i.city ?? ""}`
            .toLowerCase()
            .includes(needle)
        : true,
    )
    .slice(0, needle ? 25 : 8);

  const set = (id: string, wanderId: string | null) =>
    startTransition(() => {
      void setWanderItem(id, wanderId);
    });

  return (
    <div className="space-y-3">
      {attached.length > 0 ? (
        <ul className="space-y-1">
          {attached.map((idea) => (
            <li
              key={idea.id}
              className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5"
            >
              <span
                aria-hidden="true"
                className="h-3 w-[3px] flex-none rounded-full"
                style={{ backgroundColor: kindOf(idea.kind).color }}
              />
              <span className="min-w-0 flex-1 font-raleway text-sm text-foreground">
                {idea.title}
                {idea.city && (
                  <span className="ml-2 font-mono text-[0.6rem] text-muted-foreground">
                    {idea.city}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => set(idea.id, null)}
                aria-label={`Take ${idea.title} off the list`}
                className="flex h-7 w-7 flex-none items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-garamond text-sm leading-snug text-muted-foreground">
          Nothing picked yet. Anything you add shows on the card, and prints
          with the day.
        </p>
      )}

      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          strokeWidth={2}
        />
        <TextInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the piles"
          className="pl-8"
        />
      </div>

      {candidates.length > 0 ? (
        <ul className="space-y-1">
          {candidates.map((idea) => {
            // Only worth pointing out when it is why the card is near the top.
            const sameCity =
              !!item.city &&
              idea.city?.trim().toLowerCase() ===
                item.city.trim().toLowerCase();
            return (
              <li key={idea.id}>
                <button
                  type="button"
                  onClick={() => set(idea.id, item.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md border border-dashed border-border px-2.5 py-1.5 text-left transition-colors",
                    "hover:border-primary/60 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                  )}
                >
                  <Plus
                    className="h-3 w-3 flex-none text-muted-foreground"
                    strokeWidth={2}
                  />
                  <span className="min-w-0 flex-1 font-raleway text-sm text-foreground">
                    {idea.title}
                  </span>
                  {sameCity && (
                    <span className="flex-none font-mono text-[0.6rem] text-primary">
                      {idea.city}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="font-garamond text-sm italic text-muted-foreground">
          {needle ? "Nothing matches that." : "Nothing loose left to add."}
        </p>
      )}
    </div>
  );
}
