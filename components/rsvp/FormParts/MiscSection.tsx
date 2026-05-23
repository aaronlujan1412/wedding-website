import { Input } from "@/components/ui/input";
import { Guest } from "../types";
import { isSongRequestOpen } from "@/lib/constants";

type Props = {
  guestId: number;
  songRequest: string | null;
  notes: string;
  onGuestUpdate: (guestId: number, updates: Partial<Guest>) => void;
};

export default function MiscSection({
  guestId,
  songRequest,
  notes,
  onGuestUpdate,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      {isSongRequestOpen ? (
        <div className="flex flex-col gap-2">
          <label className="font-bold">
            Does this guest have any song requests? One per guest.
          </label>
          <Input
            onChange={(e) =>
              onGuestUpdate(guestId, {
                song_request: e.target.value,
              })
            }
            type="text"
            placeholder="You want some Rick James? Rick Astley? Rick And Roll?"
          />
        </div>
      ) : (
        <p className="font-bold">Song requests are now closed.</p>
      )}

      <div className="flex flex-col gap-2">
        <label className="font-bold">Extra Notes:</label>
        <Input
          onChange={(e) =>
            onGuestUpdate(guestId, {
              notes: e.target.value,
            })
          }
          type="text"
          placeholder="Anything else for us to know?"
        ></Input>
      </div>
    </div>
  );
}
