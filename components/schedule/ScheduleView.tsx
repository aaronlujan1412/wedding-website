"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { GuestStopRow } from "./GuestStopRow";
import { RoleEntryRow } from "./RoleEntryRow";
import { ROLES, roleById, roleFromPath, scheduleHref, type Role } from "./roles";
import { formatDay, timelineFor } from "./timeline";

const GUEST_INTRO = "A cozy winter evening, from first cocoa to last dance.";

/**
 * The schedule page. The URL is the only state: `/schedule` is the guest
 * schedule and `/schedule/<role>` lays that role's entries over it, so the
 * link you text the photographers opens straight onto their view.
 *
 * Switching views rewrites the URL with `history.replaceState` instead of
 * navigating. Next keeps `usePathname` in step with it, and because nothing
 * remounts, the guest stops can animate down into landmarks while the
 * role's entries arrive between them.
 */
export function ScheduleView() {
  const role = roleFromPath(usePathname());
  const days = timelineFor(role);
  const entryOrder = new Map(
    days
      .flatMap((d) => d.items)
      .filter((item) => item.kind === "entry")
      .map((item, i) => [item.key, i]),
  );

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 pt-40 pb-24 print:max-w-none print:px-0 print:pt-0 print:pb-0">
      <header className="mb-14 text-center md:mb-20 print:mb-8">
        <p className="font-raleway text-xs uppercase tracking-[0.3em] text-primary">
          The Schedule
        </p>
        <h1 className="mt-3 font-corinthia text-7xl text-pop md:text-8xl">
          The Timeline of Forever
        </h1>
        <p className="mx-auto mt-4 min-h-[3.5em] max-w-xl font-garamond text-xl italic text-muted-foreground md:min-h-[2.5em] md:text-2xl">
          {role ? roleById(role)?.intro : GUEST_INTRO}
        </p>

        <ViewSwitcher role={role} />
        {role && <Legend />}
      </header>

      <div id="schedule">
        {days.map(({ day, items }) => (
          <section
            key={day}
            aria-labelledby={`day-${day}`}
            className="mb-6 animate-in fade-in duration-500 motion-reduce:animate-none print:animate-none"
          >
            <h2
              id={`day-${day}`}
              className="mb-8 font-garamond text-2xl italic text-muted-foreground md:text-3xl"
            >
              {formatDay(day)}
            </h2>
            <ol>
              {items.map((item, i) => {
                const isLast = i === items.length - 1;
                return (
                  <li key={item.key}>
                    {item.kind === "stop" ? (
                      <GuestStopRow
                        stop={item.stop}
                        underlay={role !== null}
                        isLast={isLast}
                      />
                    ) : (
                      role && (
                        <RoleEntryRow
                          entry={item.entry}
                          role={role}
                          isLast={isLast}
                          order={entryOrder.get(item.key) ?? 0}
                        />
                      )
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </main>
  );
}

function ViewSwitcher({ role }: { role: Role | null }) {
  const views: { id: Role | null; label: string }[] = [
    { id: null, label: "Everyone" },
    ...ROLES,
  ];

  function choose(event: React.MouseEvent<HTMLAnchorElement>, next: Role | null) {
    // Leave modified clicks to the browser: a new tab, or copying the link
    // to text to someone, should get the real URL.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    window.history.replaceState(null, "", scheduleHref(next));
  }

  return (
    <nav aria-label="Whose schedule" className="mt-10 print:hidden">
      <p className="font-garamond text-lg text-foreground/80">
        Helping out on the day? See the schedule for
      </p>
      <ul className="mt-2 flex flex-wrap justify-center gap-x-0.5 gap-y-0.5">
        {views.map((view) => {
          const selected = view.id === role;
          return (
            <li key={view.id ?? "everyone"}>
              <a
                href={scheduleHref(view.id)}
                aria-current={selected ? "page" : undefined}
                onClick={(event) => choose(event, view.id)}
                className={cn(
                  "inline-block rounded-sm px-2 py-1.5 font-garamond text-lg underline-offset-[0.35em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:py-2.5",
                  selected
                    ? cn(
                        "underline decoration-2",
                        view.id ? "text-pop2 decoration-pop2" : "text-primary decoration-primary",
                      )
                    : "text-muted-foreground hover:text-foreground hover:underline hover:decoration-border",
                )}
              >
                {view.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Shown only once a role is on: what the two kinds of mark on the spine mean. */
function Legend() {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-raleway text-sm text-muted-foreground print:mt-2">
      <span className="flex items-center gap-2.5">
        <span aria-hidden="true" className="size-2.5 rotate-45 bg-pop2" />
        Your part
      </span>
      <span className="flex items-center gap-2">
        <span aria-hidden="true" className="size-4 rounded-full bg-card ring-1 ring-border" />
        What the guests are doing
      </span>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-sm text-primary underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring print:hidden"
      >
        Print this
      </button>
    </div>
  );
}
