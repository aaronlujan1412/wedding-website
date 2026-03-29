import { Label } from "../ui/label";
import { Guest, DietaryType, DIETARY_OPTIONS, dietaryLabels } from "./types";

type Props = {
  groupMember: Guest;
  onGuestUpdate: (guestId: number, updates: Partial<Guest>) => void;
};

export default function IndividualGuestForm({
  groupMember,
  onGuestUpdate,
}: Props) {
  return (
    <div>
      <h1 className="font-bold">{groupMember.name}</h1>
      <div className="flex flex-col">
        <div>
          <input
            type="checkbox"
            checked={groupMember.attending ?? false}
            onChange={(e) =>
              onGuestUpdate(groupMember.id, { attending: e.target.checked })
            }
            className="mr-3"
          />
          <label>Attending?</label>
        </div>
        <label>
          Does this guest have any dietary restrictions/preferences?
        </label>
        <select
          aria-required
          value={groupMember.dietary_type ?? ""}
          onChange={(e) =>
            onGuestUpdate(groupMember.id, {
              dietary_type: e.target.value as DietaryType,
            })
          }
        >
          <option value="" disabled>
            Select an option...
          </option>
          {DIETARY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {dietaryLabels[option]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
