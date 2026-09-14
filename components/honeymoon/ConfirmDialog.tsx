"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type ConfirmRequest = {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
};

/**
 * For the two actions that overwrite something the other person may have
 * typed: adopting a leg over existing Decided legs, and adopting a whole route.
 * Only shown when something would actually be lost — adopting onto empty dates
 * just happens.
 */
export function ConfirmDialog({
  request,
  onClose,
}: {
  request: ConfirmRequest | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={request !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card sm:max-w-md">
        {request && (
          <>
            <DialogHeader>
              <DialogTitle className="font-garamond text-2xl">
                {request.title}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-2 font-garamond text-base leading-relaxed text-foreground/90">
                  {request.body}
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  request.onConfirm();
                  onClose();
                }}
              >
                {request.confirmLabel}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
