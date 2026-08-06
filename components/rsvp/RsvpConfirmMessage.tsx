import { VisuallyHidden } from "radix-ui";
import { DialogTitle } from "../ui/dialog";
import { Guest, GuestGroup } from "./types";

type Props = {
  group: GuestGroup;
  guests: Guest[];
};

export default function RsvpConfirmMessage({ group, guests }: Props) {
  const anyoneAttending = guests.some((g) => g.attending === true);

  return (
    <div className="px-6 py-10 text-center">
      <VisuallyHidden.Root>
        <DialogTitle>RSVP submitted</DialogTitle>
      </VisuallyHidden.Root>

      {group.custom_message ? (
        <p className="font-garamond text-xl text-foreground">
          {group.custom_message}
        </p>
      ) : anyoneAttending ? (
        <>
          <p className="font-corinthia text-6xl text-primary">
            You&apos;re in.
          </p>
          <p className="mt-2 font-garamond text-xl text-foreground">
            We&apos;ve got you down. See you on the dance floor.
          </p>
          <p className="mt-4 font-raleway text-sm text-muted-foreground">
            (No takebacks.)
          </p>
        </>
      ) : (
        <>
          <p className="font-corinthia text-6xl text-primary">
            We&apos;ll miss you.
          </p>
          <p className="mt-2 font-garamond text-xl text-foreground">
            Thanks for letting us know.
          </p>
          <p className="mt-4 font-raleway text-sm text-muted-foreground">
            (Beats leaving us guessing.)
          </p>
        </>
      )}
    </div>
  );
}
