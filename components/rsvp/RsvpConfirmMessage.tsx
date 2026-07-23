import { GuestGroup } from "./types";

type Props = {
  group: GuestGroup;
};

export default function RsvpConfirmMessage({ group }: Props) {
  return (
    <div>
      {group.custom_message ? (
        <div>{group.custom_message}</div>
      ) : (
        <div>Thanks bitchacho.</div>
      )}
    </div>
  );
}
