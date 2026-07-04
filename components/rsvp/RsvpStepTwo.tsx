import { Label } from "../ui/label";
import IndividualGuestForm from "./IndividualGuestForm";
import { Guest } from "./types";

type Props = {
  groupMembers: Guest[];
  onGuestUpdate: (guestId: number, updates: Partial<Guest>) => void;
};

export default function RsvpStepTwo({ groupMembers, onGuestUpdate }: Props) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="group" className="mb-3">
          Please provide all details for associated members:
        </Label>
        {groupMembers.map((member, id) => (
          <div key={member.id} className="flex items-center gap-2">
            <IndividualGuestForm
              groupMember={member}
              onGuestUpdate={onGuestUpdate}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
