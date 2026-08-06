import type { Guest } from "@/components/rsvp/types";

export type ViewState =
  | { view: "form" }
  | { view: "intruder" }
  | { view: "complete"; guests: Guest[] };
