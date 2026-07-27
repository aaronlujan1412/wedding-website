"use client";

import { cn } from "@/lib/utils";
import { useRsvp } from "./RsvpProvider";

type RsvpVariant = "hero" | "nav" | "sidenav";

const variantStyles: Record<RsvpVariant, string> = {
  hero: "rounded-lg bg-primary px-6 py-3 text-white transition-colors hover:bg-primary/90",
  nav: "rounded-md bg-primary-foreground px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary-foreground/90",
  sidenav:
    "w-full rounded-md bg-primary px-4 py-3 font-raleway text-lg font-medium text-primary-foreground transition-colors hover:bg-primary/90",
};

const variantLabels: Record<RsvpVariant, string> = {
  hero: "RSVP Now",
  nav: "RSVP",
  sidenav: "RSVP",
};

export function RsvpButton({
  variant,
  className,
  onClick,
}: {
  variant: RsvpVariant;
  className?: string;
  onClick?: () => void;
}) {
  const { openRsvp } = useRsvp();
  return (
    <button
      onClick={onClick ?? openRsvp}
      className={cn(variantStyles[variant], className)}
    >
      {variantLabels[variant]}
    </button>
  );
}
