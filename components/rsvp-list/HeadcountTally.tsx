import { LedgerLine } from "./LedgerParts";
import type { Ledger } from "./summarize";

/**
 * The count, written out the way a caterer's final count is written — the
 * arithmetic stays visible so the headcount can be trusted at a glance.
 */
export function HeadcountTally({ ledger }: { ledger: Ledger }) {
  return (
    <section
      aria-labelledby="the-count"
      className="rounded-lg border border-border bg-card px-6 py-8 md:px-10 md:py-10"
    >
      <h2
        id="the-count"
        className="font-raleway text-xs uppercase tracking-[0.3em] text-muted-foreground"
      >
        The count
      </h2>

      <div className="mt-7 space-y-3">
        <LedgerLine label="Invited" value={ledger.invited} />

        {/* These three partition the invite list. */}
        <div className="space-y-2 border-l border-border pl-5 md:pl-7">
          <LedgerLine label="Attending" value={ledger.attending} />
          <LedgerLine label="Declined" value={ledger.declined} />
          <LedgerLine label="Awaiting reply" value={ledger.awaiting} />
        </div>

        <LedgerLine label="Plus-ones" value={ledger.plusOnes} />
      </div>

      <div className="mt-6 border-t-4 border-double border-border pt-6">
        <LedgerLine label="Headcount so far" value={ledger.headcount} total />
      </div>

      <p className="mt-4 font-garamond text-base italic text-muted-foreground">
        {ledger.awaiting > 0
          ? `Could still climb by ${ledger.awaiting} — plus anyone they bring.`
          : "Everyone has replied. This is the final number."}
      </p>
    </section>
  );
}
