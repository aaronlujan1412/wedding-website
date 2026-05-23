import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { GuestGroup, RsvpFormData } from "./types";

type Props = {
  guestGroups: GuestGroup[];
  selectedGroup: string;
  setSelectedGroup: (value: string) => void;
};

export default function RsvpStepOne({
  guestGroups,
  selectedGroup,
  setSelectedGroup,
}: Props) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <label htmlFor="group">Which group are you RSVP'ing for?</label>
        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger className="border-border bg-card">
            <SelectValue placeholder="Select an option..."></SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-card">
            {guestGroups.map((group) => (
              <SelectItem key={group.id} value={String(group.id)}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
