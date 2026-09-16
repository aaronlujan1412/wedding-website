import Link from "next/link";
import { SectionTabs } from "./SectionTabs";

/**
 * The planner's own top bar, in the place and the green of the site navbar it
 * replaces — so it still reads as the same house — but carrying the planner.
 *
 * It replaced three layers: the guest navbar (Travel, Schedule, RSVP…), a
 * header with a 6rem script title under it, and the tab strip under that.
 * Together they pushed every tab's first line 347px down a 914px laptop
 * screen. The script survives as the wordmark, which is still the page's h1.
 */
export function PlannerBar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 h-planner-bar bg-primary text-primary-foreground shadow-md print:hidden">
      <div className="mx-auto flex h-full max-w-[110rem] items-center gap-4 px-4 sm:gap-6 sm:px-6">
        <h1 className="flex-none">
          <Link
            href="/honeymoon"
            className="block rounded-sm pt-1 font-corinthia text-4xl leading-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-foreground"
          >
            Honeymoon
          </Link>
        </h1>

        <SectionTabs />

        {/* The hub the other back-of-house pages hang off, and the way back
            to the guest site from there. */}
        <Link
          href="/hosts"
          title="All the hosts' pages"
          className="ml-auto flex-none rounded-sm font-raleway text-[0.65rem] tracking-[0.2em] text-primary-foreground/70 uppercase transition-colors hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
        >
          Hosts
        </Link>
      </div>
    </header>
  );
}
