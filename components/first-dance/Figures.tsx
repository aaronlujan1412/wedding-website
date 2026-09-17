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
 */
export function FigureCard({ figure }: { figure: Figure }) {
  return (
    <div className="mt-5 rounded-lg border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="font-garamond text-2xl text-foreground">{figure.name}</h3>
        <p
          className={cn(
            "font-garamond text-base",
            figure.effort === "careful" ? "text-warn" : "text-muted-foreground",
          )}
        >
          {EFFORT[figure.effort]}
        </p>
      </div>

      {figure.steps && (
        <p className="mt-2 max-w-[62ch] font-garamond text-lg leading-relaxed text-foreground/85">
          {figure.steps}
        </p>
      )}

      {figure.timing && (
        <p className="mt-2 max-w-[62ch] font-garamond text-base leading-relaxed text-muted-foreground">
          {figure.timing}
        </p>
      )}

      <LookUp terms={figure.lookUp} />

      {figure.instead && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="max-w-[62ch] font-garamond text-lg leading-relaxed text-foreground/85">
            <span className="text-pop">Worth changing. </span>
            {figure.instead}
          </p>
        </div>
      )}
    </div>
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
