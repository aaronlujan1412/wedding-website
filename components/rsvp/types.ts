import type { Database } from "@/lib/database.types";

export type Guest = Database["public"]["Tables"]["guests"]["Row"];
export type GuestGroup = Database["public"]["Tables"]["guest_groups"]["Row"];
export type DietaryType = Database["public"]["Enums"]["dietary"];
export const DIETARY_OPTIONS = ["restriction", "preference", "none"] as const;
export const dietaryLabels: Record<DietaryType, string> = {
  restriction: "Restriction",
  preference: "Preference",
  none: "None",
};
export interface Address {
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
}
export interface RsvpFormData {
  groupId: number;
  groupMembers: Guest[];
  address: Address | null;
}
