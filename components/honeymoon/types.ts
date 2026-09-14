import type { Database } from "@/lib/database.types";

export type TripLeg = Database["public"]["Tables"]["trip_legs"]["Row"];
export type TripDay = Database["public"]["Tables"]["trip_days"]["Row"];
export type TripItem = Database["public"]["Tables"]["trip_items"]["Row"];
export type TripDoc = Database["public"]["Tables"]["trip_docs"]["Row"];

export type ItemKind = Database["public"]["Enums"]["trip_item_kind"];
export type BookingStatus = Database["public"]["Enums"]["trip_booking_status"];
export type Planner = Database["public"]["Enums"]["trip_planner"];
export type Lane = Database["public"]["Enums"]["trip_lane"];
export type DocCategory = Database["public"]["Enums"]["trip_doc_category"];

/** Everything the board needs, read once on the server. */
export type TripBoard = {
  legs: TripLeg[];
  days: TripDay[];
  items: TripItem[];
  docs: TripDoc[];
};
