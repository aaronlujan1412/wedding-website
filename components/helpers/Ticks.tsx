"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { readTicks, setTick } from "@/app/actions/helpers";
import { cn } from "@/lib/utils";

/** How often an open card checks for other people's ticks. */
const POLL_MS = 10_000;

const NO_SIGNAL = "That didn’t save. Check your signal and try again.";

type Ticks = {
  ticked: ReadonlySet<string>;
  toggle: (item: string, on: boolean) => Promise<void>;
};

const TicksContext = createContext<Ticks | null>(null);

/**
 * A card's ticks, shared with everyone who has it open. The page renders
 * with what's ticked; this keeps it current by asking again every 10
 * seconds while the tab is visible, and straight away when it comes back.
 *
 * It asks for the ticks alone rather than refreshing the page: a refresh
 * re-signs every photo on who's who and the shot list, and a new URL is a
 * new download of all of them.
 *
 * A tick shows at once and saves behind it. `writes` counts local changes,
 * so an answer that left before the latest one is dropped rather than
 * flicking a box back for a moment.
 */
export function TickProvider({
  card,
  initial,
  children,
}: {
  card: string;
  initial: string[];
  children: ReactNode;
}) {
  const [ticked, setTicked] = useState<ReadonlySet<string>>(() => new Set(initial));
  const [error, setError] = useState<string | null>(null);
  const writes = useRef(0);

  const adopt = useCallback((asOf: number, items: string[] | null) => {
    if (items && asOf === writes.current) setTicked(new Set(items));
  }, []);

  useEffect(() => {
    let live = true;
    async function poll() {
      if (document.hidden) return;
      const asOf = writes.current;
      try {
        const result = await readTicks(card);
        if (live) adopt(asOf, result.data);
      } catch {
        // No signal: keep what's on screen and ask again next time.
      }
    }
    const timer = setInterval(poll, POLL_MS);
    const onVisible = () => void poll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      live = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [card, adopt]);

  const toggle = useCallback(
    async (item: string, on: boolean) => {
      const asOf = ++writes.current;
      setError(null);
      setTicked((prev) => flip(prev, item, on));

      // A dropped connection throws rather than answering with an error,
      // and at the lodge that's the likely way for a tick to fail.
      const result = await setTick(card, item, on).catch(() => ({
        data: null,
        error: NO_SIGNAL,
      }));
      if (result.error) {
        // Undo only if nothing's changed since; otherwise the next answer
        // from the server sorts it out.
        if (asOf === writes.current) setTicked((prev) => flip(prev, item, !on));
        setError(result.error);
        return;
      }
      adopt(asOf, result.data);
    },
    [card, adopt],
  );

  return (
    <TicksContext.Provider value={{ ticked, toggle }}>
      {children}
      {error && (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-sm items-start gap-3 rounded-md bg-foreground px-4 py-3 font-raleway text-sm text-background shadow-lg md:bottom-6 print:hidden"
        >
          <p className="flex-1">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="rounded-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            OK
          </button>
        </div>
      )}
    </TicksContext.Provider>
  );
}

function flip(set: ReadonlySet<string>, item: string, on: boolean) {
  const next = new Set(set);
  if (on) next.add(item);
  else next.delete(item);
  return next;
}

/**
 * One box on a checklist, with its line as the label, so the words are a
 * tap target too. Ticked lines are struck through and fade back. It belongs
 * inside a `TickProvider`; outside one there's nowhere to save a tick, so
 * the box is disabled rather than pretending.
 */
export function TickBox({
  item,
  side,
  children,
}: {
  item: string;
  side: "left" | "right";
  children: ReactNode;
}) {
  const ticks = useContext(TicksContext);
  const checked = ticks?.ticked.has(item) ?? false;

  return (
    <label className="cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        disabled={!ticks}
        onChange={(event) => void ticks?.toggle(item, event.target.checked)}
        className={cn(
          "absolute top-[0.3em] size-4 cursor-pointer accent-primary pointer-coarse:size-5",
          side === "left" ? "left-0" : "right-0",
        )}
      />
      <span
        className={cn(
          "transition-colors",
          checked && "text-muted-foreground line-through decoration-muted-foreground/60",
        )}
      >
        {children}
      </span>
    </label>
  );
}
