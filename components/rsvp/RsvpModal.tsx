"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DialogDescription } from "@radix-ui/react-dialog";
import RsvpStepOne from "./RsvpStepOne";
import RsvpStepTwo from "./RsvpStepTwo";
import { Guest, GuestGroup, RsvpFormData } from "./types";
import { getGuestsFromGroupId } from "@/app/actions/rsvp";

type Props = {
  guestGroups: GuestGroup[];
};

export default function RsvpModal({ guestGroups }: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [rsvpForm, setRsvpForm] = useState<RsvpFormData>({
    groupId: 0,
    groupMembers: [],
    address: null,
  });

  function handleAttendingToggle(
    groupMembers: Guest[],
    memberId: number,
    isAttending: boolean,
  ) {
    setRsvpForm((prev) => ({
      ...prev,
      groupMembers: prev.groupMembers.map((m) =>
        m.id === memberId ? { ...m, attending: isAttending } : m,
      ),
    }));
  }

  const handleNext = async () => {
    if (step === 1) {
      const { data } = await getGuestsFromGroupId(Number(selectedGroup));
      if (data !== null) {
        setRsvpForm((prev) => ({
          ...prev,
          groupId: Number(selectedGroup),
          groupMembers: data,
        }));
      }
    }
    setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const handleSubmit = async () => {
    setStep(1);
  };

  const handleOpen = (open: boolean) => {
    if (open) {
      setStep(1);
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button className="mt-8 px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-700 transition">
          RSVP Now
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-center">RSVP</DialogTitle>
          <DialogDescription>Step {step} of 3</DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <RsvpStepOne
            setSelectedGroup={setSelectedGroup}
            selectedGroup={selectedGroup}
            guestGroups={guestGroups}
          />
        )}

        {step === 2 && (
          <RsvpStepTwo groupMembers={rsvpForm.groupMembers}></RsvpStepTwo>
        )}

        {step === 3 && (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="meal">Meal Preference</Label>
              <Input id="meal" placeholder="e.g., Vegetarian" />
            </div>
          </div>
        )}

        <DialogFooter>
          {step > 1 && (
            <Button onClick={handleBack} className="mr-2">
              Back
            </Button>
          )}
          {step < 3 && <Button onClick={handleNext}>Next</Button>}
          {step === 3 && (
            <Button onClick={() => handleSubmit()} disabled={loading}>
              Submit
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
