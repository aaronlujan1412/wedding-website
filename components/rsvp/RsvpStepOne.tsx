import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { GuestGroup } from "./types";
import { Input } from "../ui/input";

type Props = {
  guestGroups: GuestGroup[];
  selectedGroup: string;
  setSelectedGroup: (value: string) => void;
  lastFourInput: string;
  setLastFourInput: (value: string) => void;
};

export default function RsvpStepOne({
  guestGroups,
  selectedGroup,
  setSelectedGroup,
  lastFourInput,
  setLastFourInput,
}: Props) {
  return (
    <div className="grid gap-4 py-4 overflow-y-auto min-h-0">
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

        {selectedGroup && (
          <div>
            <label htmlFor="verification">
              Please enter the last four digits of your phone number:
            </label>
            <Input
              onChange={(e) => setLastFourInput(e.target.value)}
              value={lastFourInput}
              id={"verification"}
              type="text"
              placeholder="Don't get caught lying. I'll call the FBI."
            ></Input>
          </div>
        )}
      </div>
    </div>
  );
}
