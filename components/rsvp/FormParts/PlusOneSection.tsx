import { Input } from "@/components/ui/input";
import { Guest } from "../types";

type Props = {
  guestId: number;
  plus_one_allowed: boolean;
  plus_one_name: string | null;
  onGuestUpdate: (guestId: number, updates: Partial<Guest>) => void;
};

export default function PlusOneSection({
  guestId,
  plus_one_name,
  onGuestUpdate,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-bold">
        You bringing someone with? Huh? Are you Rob?
      </label>
      <Input
        onChange={(e) =>
          onGuestUpdate(guestId, {
            plus_one_name: e.target.value,
          })
        }
        value={plus_one_name ?? ""}
        type="text"
        placeholder="What's the cutie's name?"
      ></Input>
    </div>
  );
}
