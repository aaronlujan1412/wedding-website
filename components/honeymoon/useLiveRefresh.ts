"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** How often to pick up the other person's edits. Cheap: two tabs, one query. */
const POLL_MS = 12_000;

/**
 * Poor man's realtime, for any honeymoon tab two people edit at once.
 *
 * Supabase Realtime would need browser-side anon access, which breaks the
 * deliberate "RLS on, no policies" posture. Re-rendering from the server every
 * few seconds gets almost all of the benefit for none of that risk.
 *
 * Pass `paused` while something is in progress — a card mid-drag, a dialog
 * open — so a refresh never yanks work out from under someone. Also skipped
 * while the tab is hidden, and fired once on focus so coming back is current.
 */
export function useLiveRefresh(paused: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (paused) return;

    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(tick, POLL_MS);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", tick);
    };
  }, [paused, router]);
}
