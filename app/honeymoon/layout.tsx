import { SectionTabs } from "@/components/honeymoon/SectionTabs";

/**
 * Shared frame for every honeymoon tab: the title and the tab strip, once.
 * Pages render only their own content underneath. Hidden in print so the
 * pocket card prints as just the sheets.
 */
export default function HoneymoonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // On a phone the bottom tab bar takes the space the tabs had, so the
    // header shrinks and the page leaves room at the bottom for the bar.
    <div className="px-4 pt-28 pb-32 sm:px-6 sm:pt-36 sm:pb-24 print:px-0 print:pt-0 print:pb-0">
      <header className="mx-auto max-w-[110rem] text-center print:hidden">
        <p className="font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.3em]">
          Back of house · just the two of us
        </p>
        <h1 className="mt-1 font-corinthia text-6xl leading-none text-pop sm:text-7xl md:text-8xl">
          Honeymoon
        </h1>
        <SectionTabs />
      </header>
      {children}
    </div>
  );
}
