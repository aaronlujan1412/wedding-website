"use client";

import { useEffect, useState } from "react";

/**
 * A clock for countdowns. Starts from the server's render time so the first
 * client render matches the HTML, then ticks every half minute.
 */
export function useNow(renderedAt: number, everyMs = 30_000): number {
  const [now, setNow] = useState(renderedAt);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(timer);
  }, [everyMs]);
  return now;
}
