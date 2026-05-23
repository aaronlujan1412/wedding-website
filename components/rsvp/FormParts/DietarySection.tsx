import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { Guest } from "../types";

import { DietaryType } from "../types";

import {
  DIETARY_OPTIONS,
  DIETARY_DETAIL_OPTIONS,
  dietaryLabels,
} from "../types";

import { Checkbox } from "@/components/ui/checkbox";

type Props = {
  dietary_details: string[] | null;
  dietary_type: DietaryType;
  guestId: number;
  onGuestUpdate: (guestId: number, updates: Partial<Guest>) => void;
};

export default function DietarySection({
  guestId,
  dietary_details,
  dietary_type,
  onGuestUpdate,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      <label className="font-bold">
        Does this guest have any dietary restrictions/preferences?
      </label>
      <Select
        value={dietary_type ?? ""}
        onValueChange={(value) =>
          onGuestUpdate(guestId, {
            dietary_type: value as DietaryType,
          })
        }
      >
        <SelectTrigger className="border-border bg-card">
          <SelectValue placeholder="Select an option..."></SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-card">
          {DIETARY_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {dietaryLabels[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {dietary_type && dietary_type !== "none" && (
        <div className="flex flex-col gap-3">
          <label className="font-bold">What are your weaknesses?</label>
          {DIETARY_DETAIL_OPTIONS.map((option) => (
            <div key={option} className="flex items-center gap-2">
              <Checkbox
                id={option}
                checked={(dietary_details ?? []).includes(option)}
                onCheckedChange={(checked) => {
                  if (checked === "indeterminate") return;
                  const updated = checked
                    ? [...(dietary_details ?? []), option]
                    : (dietary_details ?? []).filter((d) => d !== option);
                  onGuestUpdate(guestId, {
                    dietary_details: updated,
                  });
                }}
              />
              <label htmlFor={option}>{option}</label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
