import { Guest } from "./types";

import { Separator } from "../ui/separator";
import { Checkbox } from "../ui/checkbox";

import DietarySection from "./FormParts/DietarySection";
import PlusOneSection from "./FormParts/PlusOneSection";
import MiscSection from "./FormParts/MiscSection";
import ContactSection from "./FormParts/ContactSection";

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
      <h1 className="font-bold text-foreground mb-2">{groupMember.name}</h1>
      <div className="flex flex-col gap-2">
        <div>
          <Checkbox
            className="mr-2"
            id="attending"
            checked={groupMember.attending ?? false}
            onCheckedChange={(checked) => {
              if (checked === "indeterminate") return;
              onGuestUpdate(groupMember.id, {
                attending: checked,
                ...(!checked && {
                  dietary_type: null,
                  dietary_details: [],
                  plus_one_name: null,
                  song_request: null,
                }),
              });
            }}
          />
          <label className="text-muted-foreground">
            This person coming or what?
          </label>
        </div>
        {groupMember.attending === true && (
          <div className="flex flex-col gap-3">
            <ContactSection
              guestId={groupMember.id}
              onGuestUpdate={onGuestUpdate}
              contactNumber={groupMember.contact_number}
            />

            {groupMember.plus_one_allowed && (
              <PlusOneSection
                guestId={groupMember.id}
                plus_one_allowed={groupMember.plus_one_allowed}
                plus_one_name={groupMember.plus_one_name}
                onGuestUpdate={onGuestUpdate}
              />
            )}
            <DietarySection
              dietary_details={groupMember.dietary_details}
              dietary_type={groupMember.dietary_type ?? "none"}
              guestId={groupMember.id}
              onGuestUpdate={onGuestUpdate}
            />
            <MiscSection
              songRequest={groupMember.song_request}
              notes={groupMember.notes ?? ""}
              guestId={groupMember.id}
              onGuestUpdate={onGuestUpdate}
            />
          </div>
        )}
      </div>
      <Separator className="m-3" />
    </div>
  );
}
