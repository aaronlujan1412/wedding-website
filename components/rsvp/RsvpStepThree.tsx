import { Guest, GuestGroup, RsvpFormData } from "./types";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { formatUsPhone } from "@/lib/utils";
import { useState } from "react";
import { PencilIcon } from "lucide-react";
import { Button } from "../ui/button";

type Props = {
  guestGroup: GuestGroup;
  groupMembers: Guest[];
  onGuestUpdate: (guestId: number, updates: Partial<Guest>) => void;
  submitterId: number;
  rsvpForm: RsvpFormData;
};

export default function RsvpStepThree({
  guestGroup,
  groupMembers,
  onGuestUpdate,
  submitterId,
}: Props) {
  const submitter = groupMembers.find((s) => s.id === submitterId);
  if (!submitter) return null;

  const [editing, setEditing] = useState(false);

  return (
    <div className="overflow-y-auto min-h-0">
      <Label
        htmlFor="groupDetails"
        className="mb-6 font-bold text-xl justify-center"
      >
        Everything look gucci?
      </Label>
      <div className="flex items-center mb-2">
        <h1 className="font-bold text-l mr-2">Group Information</h1>
        <div>
          <Button
            className="outline-1"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
          >
            Edit
            <PencilIcon />
          </Button>
        </div>
      </div>

      <div className="mb-10">
        <Label className="mb-2">Address</Label>
        {guestGroup.address_city ? (
          <div className="flex flex-col">
            <div>
              <p>{guestGroup.address_street}</p>
              <p>
                {guestGroup.address_city}, {guestGroup.address_state}
              </p>
              <p>{guestGroup.address_zip}</p>
            </div>
          </div>
        ) : (
          <p>
            What the heck? Why don't I know where you live? You some kinda
            weirdo or something? Gimme them deets.
          </p>
        )}
      </div>

      <div className="flex items-center mb-2">
        <h1 className="font-bold text-l mr-2">Individual Information</h1>
        <div>
          <Button
            className="outline-1"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
          >
            Edit
            <PencilIcon />
          </Button>
        </div>
      </div>
      <div>
        {groupMembers.map((member) => (
          <div key={member.id}>
            <Label className="mb-1">Name:</Label>
            <p className="mb-2">{member.name}</p>

            <Label className="mb-1">Best Contact Number:</Label>
            <p className="mb-2">{formatUsPhone(member.contact_number)}</p>

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
