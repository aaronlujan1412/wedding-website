import { Input } from "@/components/ui/input";
import { Guest } from "../types";
import { Label } from "@/components/ui/label";
import { formatUsPhone, unformatUsPhone } from "@/lib/utils";

type Props = {
  guestId: number;
  onGuestUpdate: (guestId: number, updates: Partial<Guest>) => void;
  contactNumber: string;
};

export default function ContactSection({
  guestId,
  onGuestUpdate,
  contactNumber,
}: Props) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onGuestUpdate(guestId, { contact_number: unformatUsPhone(e.target.value) });
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`contact-${guestId}`} className="font-bold">
        Contact Number:
      </Label>
      <Input
        id={`contact-${guestId}`}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="(xxx) xxx-xxxx"
        value={formatUsPhone(contactNumber)}
        onChange={(e) => handleChange(e)}
      />
    </div>
  );
}
