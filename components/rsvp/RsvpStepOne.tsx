import { Dispatch, SetStateAction, useState } from "react";
import { Label } from "../ui/label";
import { Guest, GuestGroup } from "./types";

type Props = {
  guestGroups: GuestGroup[];
  selectedGroup: string;
  setSelectedGroup: Dispatch<SetStateAction<string>>;
};

export default function RsvpStepOne({
  guestGroups,
  selectedGroup,
  setSelectedGroup,
}: Props) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="group">Which group are you RSVP'ing for?</Label>
        <select
          aria-required
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
        >
          <option value="" disabled>
            Select your group...
          </option>
          {guestGroups.map((group, id) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
