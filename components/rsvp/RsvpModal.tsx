"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { GuestGroup } from "./types";
import { ViewState } from "@/lib/types";
import RsvpIntruder from "./RsvpIntruder";
import FormFlow from "./FormFlow";
import RsvpConfirmMessage from "./RsvpConfirmMessage";

type Props = {
  guestGroups: GuestGroup[];
};

export default function RsvpModal({ guestGroups }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [groupInformation, setGroupInformation] = useState<GuestGroup | null>(
    null,
  );
  const [viewState, setViewState] = useState<ViewState>({ view: "form" });

  function renderView() {
    switch (viewState.view) {
      case "form":
        return (
          <FormFlow
            guestGroups={guestGroups}
            groupInformation={groupInformation}
            onGroupResolved={onGroupResolved}
            onAddressUpdate={onAddressUpdate}
            onReject={onReject}
            onComplete={onComplete}
          />
        );

      case "intruder":
        return <RsvpIntruder />;
      case "complete":
        return groupInformation ? (
          <RsvpConfirmMessage group={groupInformation} />
        ) : null;
      default:
        return assertNever(viewState.view);
    }
  }

  function assertNever(x: never): never {
    throw new Error(`Unhandled view: ${x}`);
  }

  function onGroupResolved(group: GuestGroup | null) {
    setGroupInformation(group);
  }

  function onAddressUpdate(updates: Partial<GuestGroup>) {
    setGroupInformation((prev) => (prev ? { ...prev, ...updates } : prev));
  }

  function onReject() {
    setViewState({ view: "intruder" });
  }

  function onComplete() {
    setViewState({ view: "complete" });
  }

  const handleOpen = (open: boolean) => {
    if (open) {
      setViewState({ view: "form" });
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

      <DialogContent
        className={`sm:max-w-[700px] max-h-[85vh] bg-card overflow-hidden ${
          viewState.view === "intruder" || viewState.view === "complete"
            ? "place-items-center"
            : "grid-rows-[auto_1fr_auto_auto]"
        }`}
      >
        {renderView()}
      </DialogContent>
    </Dialog>
  );
}
