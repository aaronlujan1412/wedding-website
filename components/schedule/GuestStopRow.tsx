import { cn } from "@/lib/utils";
import type { GuestStop } from "./schedule";
import { formatWhen } from "./timeline";
import { TimelineConnector } from "./TimelineConnector";

/**
 * A stop on the guest schedule. Under a role's view it sinks back into a
 * landmark — a smaller, quieter medallion with the body folded away — so the
 * role's own entries read as the layer on top. It animates between the two
 * rather than remounting, which is the whole of the "overlay" idea.
 */
export function GuestStopRow({
  stop,
  underlay,
  isLast,
}: {
  stop: GuestStop;
  underlay: boolean;
  isLast: boolean;
}) {
  return (
    <article className="grid grid-cols-[3rem_1fr] gap-x-4 md:grid-cols-[4rem_1fr] md:gap-x-8">
      <div className="flex flex-col items-center" aria-hidden="true">
        <span
          className={cn(
            "z-10 flex shrink-0 items-center justify-center rounded-full bg-card transition-all duration-500 ease-out motion-reduce:transition-none",
            underlay
              ? "h-8 w-8 text-sm ring-1 ring-border grayscale-[0.6]"
              : "h-11 w-11 text-lg ring-2 ring-primary md:h-14 md:w-14 md:text-2xl",
          )}
        >
          {stop.icon}
        </span>
        {!isLast && <TimelineConnector />}
      </div>

      <div
        className={cn(
          "transition-[padding] duration-500 motion-reduce:transition-none",
          underlay ? "pb-10" : "pb-16",
        )}
      >
        <p
          className={cn(
            "font-raleway text-xs uppercase tracking-[0.3em] text-primary transition-[margin] duration-500 motion-reduce:transition-none",
            underlay && "mt-2",
          )}
        >
          {formatWhen(stop)}
        </p>
        <h3
          className={cn(
            "mt-2 font-garamond transition-[font-size,color] duration-500 motion-reduce:transition-none",
            underlay
              ? "text-xl text-muted-foreground"
              : "text-2xl text-foreground md:text-3xl",
          )}
        >
          {stop.title}
        </h3>

        {/* Folds on grid rows rather than height, so it can animate to and
            from the content's natural size without measuring it. */}
        <div
          inert={underlay}
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-500 ease-out motion-reduce:transition-none",
            underlay ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <p className="mt-3 font-garamond text-lg leading-relaxed text-foreground/90">
              {stop.body}
            </p>
            {stop.notes?.map((note) => (
              <div
                key={note.title}
                className="mt-4 rounded-lg border border-border bg-secondary p-4"
              >
                <p className="font-raleway text-xs uppercase tracking-[0.2em] text-primary">
                  {note.title}
                </p>
                <p className="mt-2 font-garamond text-base leading-relaxed text-foreground/90">
                  {note.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
