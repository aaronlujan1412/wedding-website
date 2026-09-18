import type { Database } from "@/lib/database.types";

export type Trip = Database["public"]["Tables"]["trips"]["Row"];
export type TripLeg = Database["public"]["Tables"]["trip_legs"]["Row"];
export type TripDay = Database["public"]["Tables"]["trip_days"]["Row"];
export type TripItem = Database["public"]["Tables"]["trip_items"]["Row"];
export type TripDoc = Database["public"]["Tables"]["trip_docs"]["Row"];
export type TripFlight = Database["public"]["Tables"]["trip_flights"]["Row"];
export type TripStay = Database["public"]["Tables"]["trip_stays"]["Row"];
export type RouteProposal =
  Database["public"]["Tables"]["trip_route_proposals"]["Row"];
export type StayProposal =
  Database["public"]["Tables"]["trip_stay_proposals"]["Row"];
/** A proposed route with the stays that make it up, in order. */
export type ProposedRoute = RouteProposal & { stays: StayProposal[] };
export type TripTransit = Database["public"]["Tables"]["trip_transit"]["Row"];
export type TripBout = Database["public"]["Tables"]["trip_bouts"]["Row"];
export type Notebook = Database["public"]["Tables"]["trip_notebooks"]["Row"];
export type Note = Database["public"]["Tables"]["trip_notes"]["Row"];
export type ChecklistItem =
  Database["public"]["Tables"]["trip_checklist_items"]["Row"];
export type Cabin = Database["public"]["Enums"]["trip_cabin"];

export type ItemKind = Database["public"]["Enums"]["trip_item_kind"];
export type BookingStatus = Database["public"]["Enums"]["trip_booking_status"];
export type Planner = Database["public"]["Enums"]["trip_planner"];
export type Lane = Database["public"]["Enums"]["trip_lane"];
export type DocCategory = Database["public"]["Enums"]["trip_doc_category"];
export type Currency = Database["public"]["Enums"]["trip_currency"];
export type StayPayment = Database["public"]["Enums"]["trip_stay_payment"];
export type TransitMode = Database["public"]["Enums"]["trip_transit_mode"];
export type BoutOutcome = Database["public"]["Enums"]["trip_bout_outcome"];

/**
 * Yen per US dollar, and where that number came from. `live` is false when the
 * feed has never answered and the board is running on the fallback estimate —
 * the UI says so rather than presenting a guess as a quote.
 */
export type Rate = { yenPerUsd: number; asOf: string | null; live: boolean };

/** Everything the board needs, read once on the server. */
export type TripBoard = {
  /** The holiday all of this belongs to. Its dates are the board's columns. */
  trip: Trip | null;
  /** All of them, for the picker. */
  trips: Trip[];
  legs: TripLeg[];
  days: TripDay[];
  items: TripItem[];
  docs: TripDoc[];
  flights: TripFlight[];
  stays: TripStay[];
  transit: TripTransit[];
  rate: Rate;
};
