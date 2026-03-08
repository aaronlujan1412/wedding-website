import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Guest } from "./types";

type Props = {
  groupMembers: Guest[];
};

export default function RsvpStepTwo({ groupMembers }: Props) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="group">
          Please provide all details for associated members:
        </Label>
        {groupMembers.map((member, id) => (
          <div key={member.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`member-${member.id}`}
              value={member.id}
            />
            <label htmlFor={`member-${member.id}`}>{member.name}</label>
          </div>
        ))}
      </div>
    </div>
  );
}
