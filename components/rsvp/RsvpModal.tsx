"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "radix-ui";
import { Guest, GroupOption, GuestGroup } from "./types";
import { ViewState } from "@/lib/types";
import { getAllGuestGroups } from "@/app/actions/rsvp";
import RsvpIntruder from "./RsvpIntruder";
import FormFlow from "./FormFlow";
import RsvpConfirmMessage from "./RsvpConfirmMessage";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function RsvpModal({ open, onOpenChange }: Props) {
  const [groups, setGroups] = useState<GroupOption[] | null>(null);
  const [groupInformation, setGroupInformation] = useState<GuestGroup | null>(
    null,
  );
  const [viewState, setViewState] = useState<ViewState>({ view: "form" });
  const [prevOpen, setPrevOpen] = useState(open);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!open || fetchedRef.current) return;
    fetchedRef.current = true;
    getAllGuestGroups().then(({ data }) => {
      setGroups(data ?? []);
    });
  }, [open]);

  const loading = open && groups === null;

  function renderView() {
    switch (viewState.view) {
      case "form":
        return (
          <FormFlow
            guestGroups={groups ?? []}
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
          <RsvpConfirmMessage
            group={groupInformation}
            guests={viewState.guests}
          />
        ) : null;
      default:
        return assertNever(viewState);
    }
  }

  function assertNever(x: never): never {
    throw new Error(`Unhandled view: ${JSON.stringify(x)}`);
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

  function onComplete(guests: Guest[]) {
    setViewState({ view: "complete", guests });
  }

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setViewState({ view: "form" });
    }
  }

  const centered =
    loading || viewState.view === "intruder" || viewState.view === "complete";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`sm:max-w-[700px] max-h-[85vh] bg-card overflow-hidden ${
          centered ? "place-items-center" : "grid-rows-[auto_1fr_auto_auto]"
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16 font-garamond text-lg text-muted-foreground">
            <VisuallyHidden.Root>
              <DialogTitle>RSVP</DialogTitle>
            </VisuallyHidden.Root>
            Loading…
          </div>
        ) : (
          renderView()
        )}
      </DialogContent>
    </Dialog>
  );
}
