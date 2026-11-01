import { cn } from "@/lib/utils";

/** The dotted spine. A flex child between two stops by default; pass a
    className to position it, as the two-sided view does down its middle. */
export function TimelineConnector({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("min-h-0 w-[3px] flex-1", className)}
      style={{
        backgroundImage:
          "radial-gradient(circle at center, var(--color-primary) 0 1px, transparent 1px)",
        backgroundSize: "3px 8px",
        backgroundRepeat: "repeat-y",
        backgroundPosition: "center",
      }}
    />
  );
}
