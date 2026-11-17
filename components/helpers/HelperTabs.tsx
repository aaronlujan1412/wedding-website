import Link from "next/link";
import { cn } from "@/lib/utils";
import { cardsOn, helpersHref, type CardId, type HelperView } from "./cards";

/*
 * A helper page's tabs, one per card. Each tab is its own URL, so it can be
 * texted, bookmarked and come back to with the back button. A page with a
 * single card (the officiant's) has nothing to switch between and draws no
 * tabs.
 *
 * Drawn by the page rather than the layout: a staff page shows no tabs at
 * all until the code is in, and only the page knows whether it is.
 *
 * Both are rendered and CSS shows one, the same way the honeymoon planner
 * does it: no media-query hook, so no flash while it hydrates.
 */

type TabsProps = { view: HelperView; active: CardId };

/** Across the top, under the role buttons, on anything wider than a phone. */
export function HelperTabs({ view, active }: TabsProps) {
  const cards = cardsOn(view);
  if (cards.length < 2) return null;

  return (
    <nav aria-label="Helper pages" className="mb-12 max-md:hidden print:hidden">
      <ul className="flex justify-center border-b border-border">
        {cards.map((card) => {
          const selected = card.id === active;
          const Icon = card.icon;
          return (
            <li key={card.id}>
              <Link
                href={helpersHref(view, { card: card.id })}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "-mb-px flex items-center gap-2 border-b-2 px-4 py-3 font-garamond text-lg whitespace-nowrap transition-colors",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                  selected
                    ? "border-pop2 text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn("size-4", selected ? "text-pop2" : "text-muted-foreground")}
                  strokeWidth={1.75}
                />
                {/* The short name: five full titles don't fit across, and
                    the full one is the heading right under the tabs. */}
                {card.short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Along the bottom on a phone, where a thumb already is. Sticky rather than
 * fixed: it rides the bottom edge while the tab scrolls, then settles above
 * the site footer instead of covering it.
 */
export function HelperTabBar({ view, active }: TabsProps) {
  const cards = cardsOn(view);
  if (cards.length < 2) return null;

  return (
    <nav
      aria-label="Helper pages"
      className="sticky bottom-0 z-40 -mx-6 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden print:hidden"
    >
      <ul className="grid auto-cols-fr grid-flow-col">
        {cards.map((card) => {
          const selected = card.id === active;
          const Icon = card.icon;
          return (
            <li key={card.id}>
              <Link
                href={helpersHref(view, { card: card.id })}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "relative flex h-14 flex-col items-center justify-center gap-1 font-raleway text-[0.6rem] tracking-[0.12em] uppercase transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-ring",
                  selected ? "text-primary" : "text-muted-foreground",
                )}
              >
                {selected && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-4 top-0 h-0.5 rounded-b-full bg-pop2"
                  />
                )}
                <Icon
                  aria-hidden="true"
                  className="size-5"
                  strokeWidth={selected ? 1.75 : 1.5}
                />
                {card.short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
