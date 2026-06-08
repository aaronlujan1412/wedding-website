import { DIETARY_OPTIONS, Guest, GuestGroup } from "./types";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";

type Props = {
  guestGroup: string;
  groupMembers: Guest[];
  onGuestUpdate: (guestId: number, updates: Partial<Guest>) => void;
};

export default function RsvpStepThree({
  guestGroup,
  groupMembers,
  onGuestUpdate,
}: Props) {
  return (
    <div>
      <Label htmlFor="groupDetails" className="mb-3 font-bold text-xl">
        Everything look gucci?
      </Label>
      <h1 className="font-bold text-l mb-2">Group Information:</h1>

      <div className="mb-2">
        <Label className="mb-2">Submitter Address:</Label>
        <div className="flex flex-col">
          <p>8532 w 3828 s</p>
          <p>West Valley, UT</p>
          <p>84128</p>
        </div>
      </div>

      <div>
        <h1 className="font-bold text-1 mb-2">Individuals</h1>
        {groupMembers.map((member) => (
          <div key={member.id}>
            <Label className="mb-1">Name:</Label>
            <p className="mb-2">{member.name}</p>

            <Label className="mb-1">Best Contact Number:</Label>
            <p className="mb-2">{member.contact_number}</p>

            {member.dietary_type !== "none" && (
              <div>
                <Label className="mb-1">Dietary Choices:</Label>
                <p className="mb-2">{member.dietary_details}</p>
              </div>
            )}
            <Separator className="mb-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
