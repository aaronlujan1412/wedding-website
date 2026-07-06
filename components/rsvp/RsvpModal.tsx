"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import RsvpStepOne from "./RsvpStepOne";
import RsvpStepTwo from "./RsvpStepTwo";
import RsvpStepThree from "./RsvpStepThree";
import { Guest, GuestGroup, RsvpFormData } from "./types";
import { getGroupFromGroupId, putGuestInformation } from "@/app/actions/rsvp";
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
  const [groupInformation, setGroupInformation] = useState<GuestGroup | null>(
    null,
  );
  const [rsvpForm, setRsvpForm] = useState<RsvpFormData>({
    groupId: 0,
    groupName: "",
    groupMembers: [],
    submitterId: 0,
    step: 0,
  });
  const selectedGroupObj = guestGroups.find(
    (g) => g.id === Number(selectedGroup),
  );

  function onGuestUpdate(guestId: number, updates: Partial<Guest>) {
    setRsvpForm((prev) => ({
      ...prev,
      groupMembers: prev.groupMembers.map((m) =>
        m.id === guestId ? { ...m, ...updates } : m,
      ),
    }));
  }

  function onAddressUpdate(updates: Partial<GuestGroup>) {
    setGroupInformation((prev) => (prev ? { ...prev, ...updates } : prev));
  }

  const handleNext = async () => {
    setError(null);
    if (rsvpForm.step === 1) {
      setLoading(true);
      try {
        const result = await getGroupFromGroupId(
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
        const members = data.map((g) => ({
          ...g,
          dietary_type: g.dietary_type ?? "none",
        }));
        setGroupInformation(selectedGroupObj ?? null);
        setRsvpForm((prev) => ({
          ...prev,
          groupId: Number(selectedGroup),
          groupMembers: members,
          submitterId: submitterId,
          step: prev.step + 1,
        }));
      } catch (e) {
        setError("Welp. Something went wrong I didn't expect. Please text me.");
      } finally {
        setLoading(false);
      }
      return;
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
    if (!groupInformation) return;
    setError(null);
    setLoading(true);
    try {
      const result = await putGuestInformation(
        groupInformation,
        rsvpForm.groupMembers,
      );
      if (result.error) {
        setError("Failed to update group members. Please try again");
        return;
      }
      setRsvpForm((prev) => ({ ...prev, step: 1 }));
    } catch (e) {
      setError("Damn. I don't know how that one messed up.");
    } finally {
      setLoading(false);
    }
    return;
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

      <DialogContent className="sm:max-w-[700px] max-h-[85vh] bg-card overflow-hidden grid-rows-[auto_1fr_auto_auto]">
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

            {rsvpForm.step === 3 && groupInformation && (
              <RsvpStepThree
                guestGroup={groupInformation}
                groupMembers={rsvpForm.groupMembers}
                submitterId={rsvpForm.submitterId}
                handleBack={handleBack}
                onAddressUpdate={onAddressUpdate}
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
