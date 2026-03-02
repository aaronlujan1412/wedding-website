import type { Database } from "@/lib/database.types";

export type Guest = Database["public"]["Tables"]["guests"]["Row"];
export type GuestGroup = Database["public"]["Tables"]["guest_groups"]["Row"];
