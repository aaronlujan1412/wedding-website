import { ChevronRight } from "lucide-react";

import { EFFORT, type Figure } from "@/lib/first-dance";
import { cn } from "@/lib/utils";

/**
 * A figure, named so it can be watched.
 *
 * The routine was written as physical description and named nothing, which is
 * workable with a teacher in the room and a dead end without one — you cannot
 * search for "single slow 360°, led low at waist height". Each search phrase is
 * a link, so the gap between reading the sheet and watching the move is a
 * click rather than an evening of guessing at vocabulary.
 *
 * It is a line until you ask for it. Open, this is three paragraphs and a row
 * of chips — roughly four hundred pixels — and there are ten of them against
 * thirty-eight eight-counts, which made the page read as figures with some
 * choreography between them. Closed, it still says the two things you scan
 * for: what the move is called, and how long it takes to learn.
 */
export function FigureLink({ figure }: { figure: Figure }) {
  const careful = figure.effort === "careful";

  return (
    <details className="figure group mt-3 max-w-[62ch]">
      {/* Wrapping, because in a count row's column the effort note otherwise
          squeezes the name down to one word per line. */}
      <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-sm py-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className="h-3 w-3 flex-none translate-y-px text-muted-foreground transition-transform group-open:rotate-90 motion-reduce:transition-none"
          strokeWidth={2}
        />
        <span className="font-garamond text-base text-foreground group-hover:text-primary">
          {figure.name}
        </span>
        <span
          className={cn(
            "font-garamond text-sm",
            careful ? "text-warn" : "text-muted-foreground",
          )}
        >
          {EFFORT[figure.effort]}
        </span>
      </summary>

      <div className="mt-2 ml-[0.9rem] border-l-2 border-border pl-3">
        {figure.steps && (
          <p className="font-garamond text-base leading-relaxed text-foreground/85">
            {figure.steps}
          </p>
        )}

        {figure.timing && (
          <p className="mt-2 font-garamond text-base leading-relaxed text-muted-foreground">
            {figure.timing}
          </p>
        )}

        <LookUp terms={figure.lookUp} />

        {figure.instead && (
          <p className="mt-3 font-garamond text-base leading-relaxed text-foreground/85">
            <span className="text-pop">Worth changing. </span>
            {figure.instead}
          </p>
        )}
      </div>
    </details>
  );
}

/** The search phrases, as links. Nothing here is a claim about a particular
 *  video — it is the vocabulary that returns the right ones. */
export function LookUp({
  terms,
  className,
}: {
  terms: string[];
  className?: string;
}) {
  return (
    <p className={cn("mt-3 flex flex-wrap items-center gap-2", className)}>
      <span className="font-garamond text-base text-muted-foreground">
        Watch it:
      </span>
      {terms.map((term) => (
        <a
          key={term}
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(term)}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-border bg-background px-3 py-1 font-mono text-[0.7rem] text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
        >
          {term}
        </a>
      ))}
    </p>
  );
}
