import { EntryContent } from "./EntryContent";
import type { Role } from "./roles";
import type { RoleEntry } from "./schedule";
import { TimelineConnector } from "./TimelineConnector";

/**
 * A role's own entry, drawn on top of the guest schedule in cranberry with
 * a diamond on the spine. The diamond matters as much as the colour: red
 * against green is the pair colour-blind readers can't separate, so the two
 * layers differ in shape too.
 *
 * Entries mount when a view is chosen, so the entrance animation plays only
 * for the ones that are new to it; an entry shared with the previous view
 * keeps its key and stays put.
 */
export function RoleEntryRow({
  entry,
  role,
  isLast,
  order,
}: {
  entry: RoleEntry;
  role: Role;
  isLast: boolean;
  /** Its place among the view's entries, for a short stagger on arrival. */
  order: number;
}) {
  return (
    <article
      className="grid grid-cols-[3rem_1fr] gap-x-4 animate-in fade-in slide-in-from-left-3 duration-500 fill-mode-both motion-reduce:animate-none md:grid-cols-[4rem_1fr] md:gap-x-8 print:animate-none"
      style={{ animationDelay: `${Math.min(order, 10) * 45}ms` }}
    >
      <div className="flex flex-col items-center" aria-hidden="true">
        <span className="z-10 mt-[0.3rem] size-3 shrink-0 rotate-45 bg-pop2 ring-4 ring-background" />
        {!isLast && <TimelineConnector />}
      </div>

      <div className="pb-12 break-inside-avoid-page">
        <EntryContent entry={entry} role={role} />
      </div>
    </article>
  );
}
