import { VisuallyHidden } from "radix-ui";
import { DialogTitle } from "../ui/dialog";
import { GuestGroup } from "./types";

type Props = {
  group: GuestGroup;
};

export default function RsvpConfirmMessage({ group }: Props) {
  return (
    <div>
      <VisuallyHidden.Root>
        <DialogTitle>RSVP submitted</DialogTitle>
      </VisuallyHidden.Root>
      {group.custom_message ? (
        <div>{group.custom_message}</div>
      ) : (
        <div>Thanks bitchacho.</div>
      )}
    </div>
  );
}
