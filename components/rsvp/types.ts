import type { Database } from "@/lib/database.types";
import type { PostgrestError } from "@supabase/supabase-js";

export type Guest = Database["public"]["Tables"]["guests"]["Row"];
export type GuestGroup = Database["public"]["Tables"]["guest_groups"]["Row"];
export type DietaryType = Database["public"]["Enums"]["dietary"];

/**
 * Just enough to render the group picker. Deliberately excludes the address
 * columns: the picker is fetched by an unauthenticated browser, so anything
 * in this type is effectively public.
 */
export type GroupOption = Pick<GuestGroup, "id" | "name">;
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
  groupMembers: Guest[];
  submitterId: number;
  step: number;
}

export type GroupResult =
  | {
      verified: true;
      data: Guest[];
      group: GuestGroup;
      error: null;
      submitterId: number;
    }
  | {
      verified: false;
      data: null;
      group: null;
      error: PostgrestError | null;
      submitterId: null;
    };

export const REJECTED: GroupResult = {
  verified: false,
  data: null,
  group: null,
  error: null,
  submitterId: null,
};

export const failed = (error: PostgrestError | null): GroupResult => ({
  verified: false,
  data: null,
  group: null,
  error,
  submitterId: null,
});

export const ok = (
  data: Guest[],
  group: GuestGroup,
  submitterId: number,
): GroupResult => ({
  verified: true,
  data,
  group,
  error: null,
  submitterId,
});

export const DIETARY_DETAIL_OPTIONS = [
  "Gluten-free",
  "Dairy-free",
  "Nut allergy",
  "Shellfish allergy",
  "Vegetarian",
  "Vegan",
  "Pescetarian",
];
