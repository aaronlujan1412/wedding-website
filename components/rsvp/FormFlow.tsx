"use client";

import { useReducer, useState } from "react";
import {
  DialogHeader,
  DialogTitle,
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

type RsvpAction =
  | { type: "GROUP_LOADED"; members: Guest[]; submitterId: number }
  | { type: "NEXT" }
  | { type: "BACK" }
  | { type: "GUEST_UPDATED"; guestId: number; updates: Partial<Guest> };

const initialRsvpForm: RsvpFormData = {
  groupMembers: [],
  submitterId: 0,
  step: 1,
};

function assertNever(x: never): never {
  throw new Error(`Unhandled view: ${x}`);
}

function rsvpReducer(state: RsvpFormData, action: RsvpAction): RsvpFormData {
  switch (action.type) {
    case "GROUP_LOADED":
      return {
        ...state,
        step: 2,
        groupMembers: action.members,
        submitterId: action.submitterId,
      };
    case "NEXT":
      return { ...state, step: state.step + 1 };
    case "BACK":
      return { ...state, step: state.step - 1 };
    case "GUEST_UPDATED":
      return {
        ...state,
        groupMembers: state.groupMembers.map((m) =>
          m.id === action.guestId ? { ...m, ...action.updates } : m,
        ),
      };
    default:
      return assertNever(action);
  }
}

type Props = {
  guestGroups: GuestGroup[];
  groupInformation: GuestGroup | null;
  onGroupResolved: (group: GuestGroup | null) => void;
  onAddressUpdate: (updates: Partial<GuestGroup>) => void;
  onReject: () => void;
  onComplete: () => void;
};

export default function FormFlow({
  guestGroups,
  groupInformation,
  onGroupResolved,
  onAddressUpdate,
  onReject,
  onComplete,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [lastFourInput, setLastFourInput] = useState("");
  const selectedGroupObj = guestGroups.find(
    (g) => g.id === Number(selectedGroup),
  );
  const [rsvpForm, dispatch] = useReducer(rsvpReducer, initialRsvpForm);

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
          onReject();
          return;
        }
        const members = result.data.map((g) => ({
          ...g,
          dietary_type: g.dietary_type ?? "none",
        }));
        onGroupResolved(selectedGroupObj ?? null);
        dispatch({
          type: "GROUP_LOADED",
          members,
          submitterId: result.submitterId,
        });
      } catch {
        setError("Welp. Something went wrong I didn't expect. Please text me.");
      } finally {
        setLoading(false);
      }
      return;
    }
    dispatch({ type: "NEXT" });
  };

  const handleBack = () => {
    dispatch({ type: "BACK" });
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
      onComplete();
    } catch {
      setError("Damn. I don't know how that one messed up.");
    } finally {
      setLoading(false);
    }
    return;
  };

  function onGuestUpdate(guestId: number, updates: Partial<Guest>) {
    dispatch({ type: "GUEST_UPDATED", guestId, updates });
  }

  return (
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
  );
}
