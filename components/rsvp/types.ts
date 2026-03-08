import type { Database } from "@/lib/database.types";

export type Guest = Database["public"]["Tables"]["guests"]["Row"];
export type GuestGroup = Database["public"]["Tables"]["guest_groups"]["Row"];
export interface Address {
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
}
export interface RsvpFormData {
  groupId: Number;
  groupMembers: Guest[];
  address: Address | null;
}
