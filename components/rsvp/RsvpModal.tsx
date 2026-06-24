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
import { Button } from "@/components/ui/button";
import { DialogDescription } from "@radix-ui/react-dialog";
import RsvpStepOne from "./RsvpStepOne";
import RsvpStepTwo from "./RsvpStepTwo";
import RsvpStepThree from "./RsvpStepThree";
import { Guest, GuestGroup, RsvpFormData } from "./types";
import { getGuestsFromGroupId } from "@/app/actions/rsvp";
import ErrorBox from "../ErrorBox/ErrorBox";

type Props = {
  guestGroups: GuestGroup[];
};

export default function RsvpModal({ guestGroups }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [rsvpForm, setRsvpForm] = useState<RsvpFormData>({
    groupId: 0,
    groupName: "",
    groupMembers: [],
    submitterId: 0,
    step: 0,
  });

  function onGuestUpdate(guestId: number, updates: Partial<Guest>) {
    setRsvpForm((prev) => ({
      ...prev,
      groupMembers: prev.groupMembers.map((m) =>
        m.id === guestId ? { ...m, ...updates } : m,
      ),
    }));
  }

  function verifySubmitter(guestId: number, numberToVerify: string) {}

  const handleNext = async () => {
    setError(null);
    if (rsvpForm.step === 1) {
      setLoading(true);
      try {
        const { data, error: fetchError } = await getGuestsFromGroupId(
          Number(selectedGroup),
        );
        if (fetchError) {
          setError("Failed to load group members. Please try again.");
          return;
        }
        if (data !== null) {
          setRsvpForm((prev) => ({
            ...prev,
            groupId: Number(selectedGroup),
            groupMembers: data,
          }));
        }
      } catch (e) {
        setError("Welp. Something went wrong I didn't expect. Please text me.");
      } finally {
        setLoading(false);
      }
    }
    setRsvpForm((prev) => ({
      ...prev,
      step: prev.step + 1,
    }));
  };

  const handleBack = () => {
    setRsvpForm((prev) => ({ ...prev, step: prev.step - 1 }));
  };

  const handleSubmit = async () => {
    setRsvpForm((prev) => ({ ...prev, step: 1 }));
  };

  const handleOpen = (open: boolean) => {
    if (open) {
      setRsvpForm((prev) => ({ ...prev, step: 1 }));
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button className="mt-8 px-6 py-3 bg-primary text-white rounded-lg hover:bg-stone-700 transition">
          RSVP Now
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[700px] bg-card">
        <DialogHeader>
          <DialogTitle className="text-center">RSVP</DialogTitle>
          <DialogDescription>Step {rsvpForm.step} of 3</DialogDescription>
        </DialogHeader>

        {rsvpForm.step === 1 && (
          <RsvpStepOne
            setSelectedGroup={setSelectedGroup}
            selectedGroup={selectedGroup}
            guestGroups={guestGroups}
          />
        )}

        {rsvpForm.step === 2 && (
          <RsvpStepTwo
            groupMembers={rsvpForm.groupMembers}
            onGuestUpdate={onGuestUpdate}
          />
        )}

        {rsvpForm.step === 3 && (
          <RsvpStepThree
            guestGroup={selectedGroup}
            groupMembers={rsvpForm.groupMembers}
            onGuestUpdate={onGuestUpdate}
          />
        )}

        <div className="flex justify-center">
          {error && <ErrorBox message={error} />}
        </div>

        <DialogFooter>
          {rsvpForm.step > 1 && (
            <Button onClick={handleBack} className="mr-2">
              Back
            </Button>
          )}
          {rsvpForm.step < 3 && (
            <Button disabled={loading} onClick={handleNext}>
              Next
            </Button>
          )}
          {rsvpForm.step === 3 && (
            <Button onClick={() => handleSubmit()} disabled={loading}>
              Submit
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
