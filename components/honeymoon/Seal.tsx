import { cn } from "@/lib/utils";
import { BOOKING_STATUSES } from "./trip";
import type { BookingStatus } from "./types";

/**
 * The signature mark of the board.
 *
 * Temples and stations in Japan stamp a traveller's book with a vermilion
 * seal, so that is what "this is actually booked" looks like here: 予約済
 * (reserved) and then 発券済 (ticket issued). It carries the booking state —
 * it is not decoration, and nothing else on the card is allowed to be this loud.
 */
export function Seal({
  status,
  animate = false,
  size = "md",
}: {
  status: BookingStatus;
  animate?: boolean;
  size?: "sm" | "md";
}) {
  const meta = BOOKING_STATUSES[status];
  if (!meta.seal) return null;

  const box = size === "sm" ? "h-8 w-8" : "h-11 w-11";
  const type = size === "sm" ? "text-[0.45rem]" : "text-[0.6rem]";

  return (
    <span
      role="img"
      aria-label={meta.sealLabel}
      title={meta.sealLabel}
      // Also set inline so `motion-reduce` leaves the seal stamped at an
      // angle rather than snapping it upright.
      style={{ transform: "rotate(-8deg)" }}
      className={cn(
        "pointer-events-none relative flex flex-none select-none items-center justify-center",
        "rounded-full border-2 border-seal text-seal opacity-90 mix-blend-multiply",
        box,
        animate && "animate-seal motion-reduce:animate-none",
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-[3px] rounded-full border border-seal/60"
      />
      <span
        className={cn(
          "font-jp leading-[1.05] [writing-mode:vertical-rl]",
          type,
        )}
      >
        {meta.seal}
      </span>
    </span>
  );
}
