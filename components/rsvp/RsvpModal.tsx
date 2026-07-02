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
import { VisuallyHidden } from "radix-ui";

type Props = {
  guestGroups: GuestGroup[];
};

export default function RsvpModal({ guestGroups }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [intruder, setIntruder] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [lastFourInput, setLastFourInput] = useState("");
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

  const handleNext = async () => {
    setError(null);
    if (rsvpForm.step === 1) {
      setLoading(true);
      try {
        const result = await getGuestsFromGroupId(
          Number(selectedGroup),
          lastFourInput,
        );
        if (result.error) {
          setError("Failed to load group members. Please try again.");
          return;
        }
        if (!result.verified) {
          setIntruder(true);
          return;
        }
        const { data, submitterId } = result;
        setRsvpForm((prev) => ({
          ...prev,
          groupId: Number(selectedGroup),
          groupMembers: data,
          submitterId: submitterId,
          step: prev.step + 1,
        }));
      } catch (e) {
        setError("Welp. Something went wrong I didn't expect. Please text me.");
      } finally {
        setLoading(false);
      }
    }
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

      <DialogContent className="sm:max-w-[700px] bg-card overflow-hidden">
        {intruder ? (
          <>
            <div className="animate-intruder absolute inset-0" />

            <VisuallyHidden.Root>
              <DialogHeader>
                <DialogTitle>FBI</DialogTitle>
                <DialogDescription>FBI</DialogDescription>
              </DialogHeader>
            </VisuallyHidden.Root>

            <div
              className="relative z-10 text-center outline-none"
              tabIndex={-1}
              autoFocus
            >
              THE FBI ARE ON THEIR WAY YOU FREAK
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">RSVP</DialogTitle>
              <DialogDescription>Step {rsvpForm.step} of 3</DialogDescription>
            </DialogHeader>

            {rsvpForm.step === 1 && (
              <RsvpStepOne
                setSelectedGroup={setSelectedGroup}
                selectedGroup={selectedGroup}
                guestGroups={guestGroups}
                lastFourInput={lastFourInput}
                setLastFourInput={setLastFourInput}
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
