"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { useSearchParams } from "next/navigation";
import { Undo2, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  agreeToItems,
  reviveItem,
  settleBout,
  undoLastBout,
} from "@/app/actions/bouts";
import { Banzuke } from "./Banzuke";
import { ConfirmDialog, type ConfirmRequest } from "./ConfirmDialog";
import { FLASH_MS, Ring, type Flash } from "./Ring";
import { Festival, Fireball, ManekiNeko, Transformation } from "./RingFx";
import { useLiveRefresh } from "./useLiveRefresh";
import { comboTitle, isCritical, secretFor } from "./arcade";
import {
  budget as budgetOf,
  cutLine,
  formatHours,
  nextBout,
  standings,
} from "./bouts";
import {
  mutedServerSnapshot,
  mutedSnapshot,
  play,
  subscribeMuted,
  toggleMuted,
} from "./ringSound";
import type { BoutOutcome, Trip, TripBout, TripFlight, TripItem } from "./types";

/**
 * The Ring tab.
 *
 * The board lets you drag one card at a time up into Decided, which is the
 * right tool for the card you already agree on and no help at all with the
 * other hundred. Agreeing was never the hard part — cutting is, and nobody
 * cuts their own idea on their own. So this asks one question at a time, out
 * loud, with both of them in front of it, and it is an arcade cabinet about
 * it, because the tasteful version of this screen is one nobody opens twice.
 *
 * Everything on screen is replayed from the bout log, sound effects included,
 * so a verdict can be taken back by deleting a row. The pairing is a pure
 * function of that log too, which is what lets the twelve-second refresh run
 * on a tab with a question sitting unanswered: it cannot deal a new pair out
 * from under whoever is mid-sentence about this one.
 */

type Screen = "ring" | "banzuke";

function isScreen(value: string | null): value is Screen {
  return value === "ring" || value === "banzuke";
}

/**
 * Which screen, in the query string. `history.replaceState` rather than the
 * router, the same as the board's own view and layout: the two screens read
 * the same rows, so a round trip to the server to swap them would throw away
 * a page of data to render the page it already had.
 */
function writeScreen(screen: Screen) {
  const params = new URLSearchParams(window.location.search);
  if (screen === "ring") params.delete("screen");
  else params.set("screen", screen);
  const query = params.toString();
  window.history.replaceState(null, "", query ? `?${query}` : location.pathname);
}

/** A combo that has gone cold. Long enough to argue, short enough to reward
 *  actually keeping going. */
const COMBO_WINDOW = 7000;

/* ------------------------------------------------------------------ *
 * Reduced motion, as a store
 * ------------------------------------------------------------------ */

const motionQuery = "(prefers-reduced-motion: reduce)";

function subscribeMotion(fn: () => void) {
  const mql = window.matchMedia(motionQuery);
  mql.addEventListener("change", fn);
  return () => mql.removeEventListener("change", fn);
}

/** `useSyncExternalStore`, not an effect: `react-hooks/set-state-in-effect` is
 *  an error in this repo, and this is what the hook is for. */
function motionSnapshot() {
  return window.matchMedia(motionQuery).matches;
}

type Optimistic = { items: TripItem[]; bouts: TripBout[] };

type Egg = "fireball" | "festival" | "neko" | null;

export function RingView({
  trip,
  items,
  bouts,
  flights,
}: {
  trip: Trip | null;
  items: TripItem[];
  bouts: TripBout[];
  flights: TripFlight[];
}) {
  const searchParams = useSearchParams();
  const [screen, setScreenState] = useState<Screen>(() => {
    const value = searchParams.get("screen");
    return isScreen(value) ? value : "ring";
  });
  function setScreen(next: Screen) {
    setScreenState(next);
    writeScreen(next);
  }

  const [flash, setFlash] = useState<Flash | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [promoted, setPromoted] = useState<number | null>(null);
  const [combo, setCombo] = useState(0);
  const [egg, setEgg] = useState<Egg>(null);
  const [zen, setZen] = useState(false);
  const [pending, startTransition] = useTransition();

  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHit = useRef(0);
  const typed = useRef("");

  const muted = useSyncExternalStore(
    subscribeMuted,
    mutedSnapshot,
    mutedServerSnapshot,
  );
  const reduced = useSyncExternalStore(
    subscribeMotion,
    motionSnapshot,
    () => false,
  );
  const quiet = reduced || zen;

  // A verdict has to land before the server has answered, or the rhythm the
  // whole tab depends on is gone. `useOptimistic` drops the guess by itself
  // once the revalidated page arrives.
  const [live, applyBout] = useOptimistic(
    { items, bouts } as Optimistic,
    (state: Optimistic, bout: TripBout): Optimistic => ({
      bouts: [...state.bouts, bout],
      items:
        bout.outcome === "neither"
          ? state.items.map((item) =>
              item.id === bout.east_id || item.id === bout.west_id
                ? { ...item, cut_at: bout.created_at }
                : item,
            )
          : state.items,
    }),
  );

  const ranked = useMemo(
    () => standings(live.items, live.bouts),
    [live.items, live.bouts],
  );
  const standing = useMemo(() => ranked.filter((s) => !s.cut), [ranked]);
  const cut = useMemo(() => ranked.filter((s) => s.cut), [ranked]);
  const pairing = useMemo(
    () => nextBout(ranked, live.bouts),
    [ranked, live.bouts],
  );

  const budget = useMemo(
    () => budgetOf(trip, live.items, flights),
    [trip, live.items, flights],
  );
  const fits = useMemo(
    () => cutLine(standing, budget.free),
    [standing, budget.free],
  );
  const inTrip = useMemo(
    () => new Set(standing.slice(0, fits).map((s) => s.item.id)),
    [standing, fits],
  );

  // Never while a hit is playing or a write is in flight.
  useLiveRefresh(
    flash !== null || pending || confirm !== null || promoted !== null,
  );

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  const settle = useCallback(
    (outcome: BoutOutcome) => {
      if (!pairing || flash || !trip) return;

      const index = live.bouts.length;
      const crit =
        outcome === "east" || outcome === "west"
          ? isCritical(pairing.east.item.id, pairing.west.item.id, index)
          : false;

      const bout: TripBout = {
        id: crypto.randomUUID(),
        trip_id: trip.id,
        east_id: pairing.east.item.id,
        west_id: pairing.west.item.id,
        outcome,
        created_at: new Date().toISOString(),
      };

      play(
        outcome === "both"
          ? "keep"
          : outcome === "neither"
            ? "cut"
            : outcome === "skip"
              ? "skip"
              : crit
                ? "crit"
                : "hit",
      );

      // The streak counts decisions, not presses: walking away from a bout is
      // the one verdict that isn't one.
      const now = Date.now();
      if (outcome === "skip") {
        setCombo(0);
      } else {
        const next = now - lastHit.current < COMBO_WINDOW ? combo + 1 : 1;
        setCombo(next);
        if (comboTitle(next) && comboTitle(next) !== comboTitle(next - 1)) {
          play("combo");
        }
      }
      lastHit.current = now;

      setFlash({ pairing, outcome, crit });
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(
        () => setFlash(null),
        quiet ? 260 : FLASH_MS,
      );

      startTransition(async () => {
        applyBout(bout);
        const result = await settleBout(bout.east_id, bout.west_id, outcome);
        if (result.error) setNotice(result.error);
      });
    },
    [pairing, flash, trip, applyBout, live.bouts.length, combo, quiet],
  );

  const undo = useCallback(() => {
    if (flash) return;
    setCombo(0);
    startTransition(async () => {
      const result = await undoLastBout();
      setNotice(result.error ?? "待った — took the last one back.");
    });
  }, [flash]);

  /* ---- Keys: four verdicts, an undo, and the secrets ---------------- */

  useEffect(() => {
    if (screen !== "ring") return;

    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "")
      ) {
        return;
      }

      const outcome: Record<string, BoutOutcome> = {
        ArrowLeft: "east",
        ArrowRight: "west",
        ArrowUp: "both",
        ArrowDown: "neither",
        " ": "skip",
      };

      if (event.key in outcome) {
        // Arrows scroll and space pages down; neither is wanted on a screen
        // meant to be played with one hand.
        event.preventDefault();
        settle(outcome[event.key]);
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        undo();
        return;
      }

      // Anything else that is one letter goes in the buffer. The Konami code
      // belongs here and cannot be: up-up-down-down is "keep both, keep both,
      // cut both, cut both", and entering it would settle four real bouts.
      if (event.key.length !== 1) return;
      typed.current = (typed.current + event.key.toLowerCase()).slice(-12);
      const secret = secretFor(typed.current);
      if (!secret) return;

      typed.current = "";
      setNotice(secret.announce);
      if (secret.word === "zen") {
        setZen(true);
        toggleMuted(true);
        return;
      }
      if (quiet) return;
      if (secret.word === "hadouken") setEgg("fireball");
      if (secret.word === "matsuri") setEgg("festival");
      if (secret.word === "neko") setEgg("neko");
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, settle, undo, quiet]);

  /* ---- The promotion ------------------------------------------------ */

  function agree() {
    const chosen = standing.slice(0, fits);
    if (chosen.length === 0) return;
    setConfirm({
      title: `Promote ${chosen.length} to Decided?`,
      body: (
        <>
          <p>
            Everything above the line moves into Decided&apos;s pile, agreed but
            not yet on a day. Picking days is the board&apos;s job.
          </p>
          <p>
            Nothing is scheduled and nothing is deleted — a card you change your
            mind about drags back out.
          </p>
        </>
      ),
      confirmLabel: `Promote ${chosen.length}`,
      onConfirm: () =>
        startTransition(async () => {
          const result = await agreeToItems(chosen.map((s) => s.item.id));
          if (result.error) {
            setNotice(result.error);
            return;
          }
          play("fanfare");
          setPromoted(chosen.length);
        }),
    });
  }

  const over = budget.wanted - budget.free;
  const round = live.bouts.length + 1;
  const streak = comboTitle(combo);

  return (
    <div
      className={cn(
        // Full bleed out of the planner's page padding, on all four sides:
        // the cabinet is the tab, not a panel sitting on the tab. The layout's
        // own padding is pulled off with a negative margin and put back inside,
        // so the dark reaches the edges of the page while everything keeps the
        // same clearance from the fixed bars.
        "-mx-4 -mt-2 -mb-[calc(5.5rem+env(safe-area-inset-bottom))] px-4 pt-6",
        "pb-[calc(6.5rem+env(safe-area-inset-bottom))]",
        "sm:-mx-6 sm:-mt-4 sm:-mb-16 sm:px-6 sm:pt-8 sm:pb-24",
        "min-h-[calc(100dvh-var(--spacing-planner-bar))]",
        "bg-[color:var(--color-arena-deep)]",
      )}
      style={{
        backgroundImage:
          "radial-gradient(60% 40% at 50% 0%, color-mix(in srgb, var(--color-arena-line) 55%, transparent), transparent 70%)",
      }}
    >
      <div className="relative mx-auto max-w-5xl">
        {/* ---- HUD --------------------------------------------------- */}
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-2 border-[color:var(--color-arena-line)] bg-[color:var(--color-arena)] px-3 py-2">
          <div className="font-dot flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.65rem] tracking-widest">
            <span className="text-white/45">
              ROUND{" "}
              <span className="text-[color:var(--color-gold)] tabular-nums">
                {round}
              </span>
            </span>
            <span className="text-white/45">
              CHALLENGERS{" "}
              <span className="text-white tabular-nums">{standing.length}</span>
            </span>
            <span className="text-white/45">
              TIME{" "}
              <span
                className="tabular-nums"
                style={{
                  color: over > 0 ? "var(--color-ko)" : "var(--color-gold)",
                }}
              >
                {formatHours(budget.wanted)}H
              </span>
              <span className="text-white/30"> / {formatHours(budget.free)}H</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleMuted()}
              aria-pressed={muted}
              className="font-dot flex min-h-8 items-center gap-1.5 border-2 border-white/15 px-2 text-[0.6rem] tracking-widest text-white/50 transition-colors hover:border-[color:var(--color-gold)]/60 hover:text-white"
            >
              {muted ? (
                <VolumeX className="size-3.5" aria-hidden />
              ) : (
                <Volume2 className="size-3.5" aria-hidden />
              )}
              {muted ? "OFF" : "ON"}
            </button>

            <nav className="flex border-2 border-white/15">
              {(["ring", "banzuke"] as Screen[]).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setScreen(name)}
                  aria-current={screen === name}
                  className={cn(
                    "font-dot min-h-8 px-3 text-[0.6rem] tracking-widest transition-colors",
                    screen === name
                      ? "bg-[color:var(--color-gold)] text-[color:var(--color-arena-deep)]"
                      : "text-white/50 hover:text-white",
                  )}
                >
                  {name === "ring" ? "FIGHT" : "番付"}
                </button>
              ))}
            </nav>
          </div>
        </header>

        {/* The streak, floating over the cabinet's top-right corner. */}
        {streak && screen === "ring" ? (
          <p
            key={streak}
            className={cn(
              "pointer-events-none absolute -top-1 right-2 z-30 text-right",
              !quiet && "animate-ring-combo",
            )}
          >
            <span className="font-dela text-impact block text-2xl text-[color:var(--color-gold)] sm:text-3xl">
              {combo}
            </span>
            <span className="font-dot text-[0.6rem] tracking-[0.25em] text-white">
              {streak}
            </span>
          </p>
        ) : null}

        {/* ---- The screen -------------------------------------------- */}
        <div className="relative mt-3">
          {screen === "ring" ? (
            pairing ? (
              <Ring
                pairing={pairing}
                flash={flash}
                round={round}
                quiet={quiet}
                onSettle={settle}
              />
            ) : (
              <div className="border-2 border-[color:var(--color-arena-line)] bg-[color:var(--color-arena)] px-6 py-20 text-center">
                <p className="font-jp-gothic text-impact text-4xl text-[color:var(--color-gold)]">
                  千秋楽
                </p>
                <p className="font-dot mt-3 text-[0.7rem] tracking-[0.3em] text-white/60">
                  {standing.length === 0
                    ? "NO CHALLENGERS LEFT"
                    : "ONE LEFT STANDING — IT WINS BY DEFAULT"}
                </p>
                <p className="mt-2 font-garamond text-sm text-white/45 italic">
                  Final day of the tournament. The rankings have the list.
                </p>
              </div>
            )
          ) : (
            <Banzuke
              ranked={ranked}
              inTrip={inTrip}
              cut={cut}
              busy={pending}
              onRevive={(id) =>
                startTransition(async () => {
                  const result = await reviveItem(id);
                  if (result.error) setNotice(result.error);
                })
              }
            />
          )}

          {egg === "fireball" ? <Fireball onDone={() => setEgg(null)} /> : null}
          {egg === "neko" ? <ManekiNeko onDone={() => setEgg(null)} /> : null}
        </div>

        {/* ---- Footer ------------------------------------------------ */}
        <footer className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={undo}
            disabled={pending || live.bouts.length === 0}
            className={cn(
              "font-dot flex min-h-10 items-center gap-2 border-2 border-white/15 px-3",
              "text-[0.65rem] tracking-widest text-white/50 transition-colors",
              "hover:border-white/40 hover:text-white disabled:opacity-30",
            )}
          >
            <Undo2 className="size-4" aria-hidden />
            待った UNDO
          </button>

          <button
            type="button"
            onClick={agree}
            disabled={pending || fits === 0}
            className={cn(
              "font-dela flex min-h-11 items-center gap-3 border-2 px-5 text-sm tracking-wide",
              "border-[color:var(--color-gold)] bg-[color:var(--color-gold)] text-[color:var(--color-arena-deep)]",
              "transition-transform hover:scale-[1.03] disabled:scale-100 disabled:opacity-30",
            )}
          >
            <span className="font-jp-gothic text-base">決定</span>
            PROMOTE TOP {fits}
          </button>
        </footer>

        <p className="font-dot mt-4 text-center text-[0.6rem] tracking-[0.25em] text-white/25">
          {over > 0
            ? `${formatHours(over)}H MORE IDEAS THAN TRIP — KEEP CUTTING`
            : "IT ALL FITS. CARRY ON ANYWAY."}
        </p>
      </div>

      {notice ? (
        <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm border-2 border-[color:var(--color-gold)] bg-[color:var(--color-arena)] px-4 py-3 sm:right-auto sm:bottom-6 sm:left-6 sm:mx-0">
          <p className="font-jp-gothic text-base text-white">{notice}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="font-dot mt-1 text-[0.6rem] tracking-widest text-white/50 underline"
          >
            DISMISS
          </button>
        </div>
      ) : null}

      {egg === "festival" ? <Festival onDone={() => setEgg(null)} /> : null}

      {promoted !== null ? (
        <Transformation
          count={promoted}
          quiet={quiet}
          onDone={() => setPromoted(null)}
        />
      ) : null}

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
