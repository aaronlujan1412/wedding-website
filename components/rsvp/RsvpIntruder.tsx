import { VisuallyHidden } from "radix-ui";
import { DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";

export default function RsvpIntruder() {
  return (
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
  );
}
