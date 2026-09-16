import { Check, Clock, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { BOOKING_STATUSES, type Warning } from "./trip";
import type { BookingStatus } from "./types";

/**
 * The traffic light, in the forms the planner draws it.
 *
 * Green is ready, amber is still to do, red is wrong — the same three on every
 * tab. What's ready used to be a vermilion goshuin with 予約済 or 発券済 in it:
 * two states neither of us can tell apart, in the loudest ink on the card, for
 * the one thing that needed nothing doing. The stamp stays, because a tilted
 * double ring still reads as "stamped", but it says what it means in pictures.
 */

/** The text ink for each warning tone. */
export const TONE_INK: Record<Warning["tone"], string> = {
  warn: "text-warn",
  pending: "text-pending",
  info: "text-muted-foreground",
};

/**
 * A booking, stamped: a check once booked, a ticket once in hand. Still to
 * book takes the same spot as a dashed amber ring with a clock — the stamp
 * that hasn't come down yet — so every card answers "are we sorted?" in the
 * same corner. An idea draws nothing.
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
  if (meta.light === "none") return null;
  const ready = meta.light === "ready";
  const Icon = status === "in_hand" ? Ticket : ready ? Check : Clock;

  return (
    <span
      role="img"
      aria-label={meta.label}
      title={meta.label}
      // Also set inline so `motion-reduce` leaves the stamp at an angle rather
      // than snapping it upright.
      style={{ transform: "rotate(-8deg)" }}
      className={cn(
        "pointer-events-none relative flex flex-none select-none items-center justify-center",
        "rounded-full border-2 opacity-90 mix-blend-multiply",
        ready
          ? "border-ready text-ready"
          : "border-dashed border-pending text-pending",
        size === "sm" ? "h-8 w-8" : "h-11 w-11",
        // Only a real stamp lands with a thump.
        animate && ready && "animate-seal motion-reduce:animate-none",
      )}
    >
      {ready && (
        <span
          aria-hidden="true"
          className="absolute inset-[3px] rounded-full border border-ready/60"
        />
      )}
      <Icon
        aria-hidden="true"
        strokeWidth={2.25}
        className={size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5"}
      />
    </span>
  );
}

/**
 * The same light at the size of a letter, for where a stamp won't fit: a
 * check, a ticket, or a clock for still to book. An idea draws nothing.
 */
export function StatusMark({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  const meta = BOOKING_STATUSES[status];
  if (meta.light === "none") return null;
  const Icon =
    status === "in_hand" ? Ticket : meta.light === "ready" ? Check : Clock;

  return (
    <span
      title={meta.label}
      className={cn(
        "flex flex-none items-center",
        meta.light === "ready" ? "text-ready" : "text-pending",
        className,
      )}
    >
      <Icon className="h-3 w-3" strokeWidth={2.25} aria-hidden="true" />
      <span className="sr-only">{meta.label}</span>
    </span>
  );
}

/** The light in words: "Booked", "Ticket in hand", "Need to book". */
export function StatusLabel({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  const meta = BOOKING_STATUSES[status];
  if (meta.light === "none") return null;
  return (
    <span
      className={cn(
        "tracking-[0.15em] uppercase",
        meta.light === "ready" ? "text-ready" : "text-pending",
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
