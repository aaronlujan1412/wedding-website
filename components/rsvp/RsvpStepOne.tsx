import { Label } from "../ui/label";
import { Guest, GuestGroup } from "./types";

type Props = {
  guestGroups: GuestGroup[];
};

export default function RsvpStepOne({ guestGroups }: Props) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="group">Which group are you RSVP'ing for?</Label>
        <select aria-required>
          {guestGroups.map((group, id) => (
            <option key={id}>{group.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
