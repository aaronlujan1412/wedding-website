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
    <div className="px-6 pt-36 pb-24 print:px-0 print:pt-0 print:pb-0">
      <header className="mx-auto max-w-[110rem] text-center print:hidden">
        <p className="font-raleway text-xs uppercase tracking-[0.2em] text-muted-foreground sm:tracking-[0.3em]">
          Back of house · just the two of us
        </p>
        <h1 className="mt-1 font-corinthia text-7xl leading-none text-pop md:text-8xl">
          Honeymoon
        </h1>
        <SectionTabs />
      </header>
      {children}
    </div>
  );
}
