import { Guest, GuestGroup } from "./types";
import { Label } from "../ui/label";
import { formatUsPhone } from "@/lib/utils";
import { useState } from "react";
import { PencilIcon, Save } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

type Props = {
  guestGroup: GuestGroup;
  groupMembers: Guest[];
  submitterId: number;
  handleBack: () => void;
  onAddressUpdate: (updates: Partial<GuestGroup>) => void;
};

export default function RsvpStepThree({
  guestGroup,
  groupMembers,
  submitterId,
  handleBack,
  onAddressUpdate,
}: Props) {
  const [editing, setEditing] = useState(false);
  const submitter = groupMembers.find((s) => s.id === submitterId);
  if (!submitter) return null;

  return (
    <div className="overflow-y-auto min-h-0">
      <Label className="mb-6 font-bold text-xl justify-center">
        Everything look gucci?
      </Label>
      <div className="flex items-center mb-2">
        <h1 className="font-bold text-lg mr-2">Group Information</h1>
        {!editing ? (
          <Button
            className="outline-1"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(!editing)}
          >
            Edit
            <PencilIcon />
          </Button>
        ) : (
          <Button
            className="outline-1"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(!editing)}
          >
            Save
            <Save />
          </Button>
        )}
      </div>

      {!editing ? (
        <dl className="mb-8">
          <div>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">
              Address
            </dt>
            <dd className="text-foreground">{guestGroup.address_street}</dd>
            <dd className="text-foreground">
              {guestGroup.address_city}, {guestGroup.address_state}{" "}
              {guestGroup.address_zip}
            </dd>
          </div>
        </dl>
      ) : (
        <div className="mb-10 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="address_street">Street</Label>
            <Input
              id="address_street"
              value={guestGroup.address_street ?? ""}
              onChange={(e) =>
                onAddressUpdate({ address_street: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="address_city">City</Label>
            <Input
              id="address_city"
              value={guestGroup.address_city ?? ""}
              onChange={(e) =>
                onAddressUpdate({ address_city: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="address_state">State</Label>
            <Input
              id="address_state"
              value={guestGroup.address_state ?? ""}
              onChange={(e) =>
                onAddressUpdate({ address_state: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="address_zip">Zip</Label>
            <Input
              id="address_zip"
              value={guestGroup.address_zip ?? ""}
              onChange={(e) => onAddressUpdate({ address_zip: e.target.value })}
            />
          </div>
        </div>
      )}

      <div className="flex items-center mb-2">
        <h1 className="font-bold text-lg mr-2">Individual Information</h1>
        <div>
          <Button
            className="outline-1"
            variant="ghost"
            size="sm"
            onClick={() => handleBack()}
          >
            Edit
            <PencilIcon />
          </Button>
        </div>
      </div>
      <div>
        {groupMembers.map((member) => (
          <div key={member.id}>
            <div className="rounded-lg border border-border bg-secondary p-4 mb-4">
              <h3 className="font-garamond text-xl text-foreground mb-3">
                {member.name}
              </h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    Contact
                  </dt>
                  <dd className="text-foreground">
                    {formatUsPhone(member.contact_number)}
                  </dd>
                </div>
                {member.dietary_type !== "none" && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                      Dietary
                    </dt>
                    <dd className="text-foreground">
                      {member.dietary_details?.join(", ")}
                    </dd>
                  </div>
                )}
                {member.plus_one_allowed && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                      Plus One
                    </dt>
                    <dd className="text-foreground">{member.plus_one_name}</dd>
                  </div>
                )}
                {member.song_request && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                      Song Request
                    </dt>
                    <dd className="text-foreground">{member.song_request}</dd>
                  </div>
                )}
                {member.notes && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                      Additional Notes
                    </dt>
                    <dd className="text-foreground">{member.notes}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
