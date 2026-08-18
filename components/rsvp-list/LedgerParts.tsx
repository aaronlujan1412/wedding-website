import { Check, X } from "lucide-react";

const STATUS_LABELS = {
  attending: "Attending",
  declined: "Declined",
  awaiting: "No reply yet",
} as const;

/**
 * The mark in the ledger's left margin. Shape carries the meaning as well as
 * colour, so the column stays scannable without relying on red/green alone.
 */
export function StatusMark({ attending }: { attending: boolean | null }) {
  const status =
    attending === true
      ? "attending"
      : attending === false
        ? "declined"
        : "awaiting";

  return (
    <span className="flex size-5 shrink-0 items-center justify-center">
      {status === "attending" && (
        <Check className="size-4 text-primary" strokeWidth={2.5} aria-hidden />
      )}
      {status === "declined" && (
        <X className="size-4 text-pop2" strokeWidth={2.5} aria-hidden />
      )}
      {status === "awaiting" && (
        <span
          className="size-2.5 rounded-full border border-dashed border-muted-foreground/70"
          aria-hidden
        />
      )}
      <span className="sr-only">{STATUS_LABELS[status]}</span>
    </span>
  );
}

/** One line of the tally: label, dot leader, figure. */
export function LedgerLine({
  label,
  value,
  total = false,
}: {
  label: string;
  value: number;
  total?: boolean;
}) {
  return (
    <div className="flex items-baseline">
      <span
        className={
          total
            ? "font-raleway text-xs uppercase tracking-[0.25em] text-primary"
            : "font-garamond text-lg text-foreground/90"
        }
      >
        {label}
      </span>
      <span
        aria-hidden
        className="mx-3 mb-[0.35em] flex-1 self-end border-b border-dotted border-border"
      />
      <span
        className={
          total
            ? "font-mono text-4xl tabular-nums slashed-zero text-primary md:text-5xl"
            : "font-mono text-lg tabular-nums slashed-zero text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}

/** Section label with a rule that runs out to an optional count. */
export function LedgerHeading({
  title,
  count,
  id,
}: {
  title: string;
  count?: number;
  id?: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-4">
      <h2
        id={id}
        className="font-raleway text-xs uppercase tracking-[0.3em] whitespace-nowrap text-primary"
      >
        {title}
      </h2>
      <span aria-hidden className="h-px flex-1 bg-border" />
      {count !== undefined && (
        <span className="font-mono text-xs tabular-nums slashed-zero text-muted-foreground">
          {count}
        </span>
      )}
    </div>
  );
}

/** A labelled fact under a guest's name. Label column aligns from `sm` up. */
export function DetailLine({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-x-3 sm:grid-cols-[6.5rem_1fr]">
      <dt className="font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-primary sm:pt-[0.2rem]">
        {label}
      </dt>
      <dd className="font-garamond text-base leading-relaxed text-foreground/90">
        {children}
      </dd>
    </div>
  );
}
