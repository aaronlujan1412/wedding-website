"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import RsvpModal from "./RsvpModal";

type RsvpContextValue = { openRsvp: () => void };

const RsvpContext = createContext<RsvpContextValue | null>(null);

export function useRsvp() {
  const ctx = useContext(RsvpContext);
  if (!ctx) {
    throw new Error("useRsvp must be used within an RsvpProvider");
  }
  return ctx;
}

export function RsvpProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openRsvp = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ openRsvp }), [openRsvp]);

  return (
    <RsvpContext.Provider value={value}>
      {children}
      <RsvpModal open={open} onOpenChange={setOpen} />
    </RsvpContext.Provider>
  );
}
