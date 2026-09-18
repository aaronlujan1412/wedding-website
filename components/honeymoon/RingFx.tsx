"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { hash } from "./arcade";

/**
 * The things that happen to the Ring that aren't a bout.
 *
 * All four are pointer-transparent overlays that mount, run once and unmount,
 * so nothing here can get between anyone and a verdict. They all take `quiet`,
 * which is set by reduced motion or by somebody typing `zen`: in quiet the
 * transformation still says what it did, and the rest simply never appear,
 * because a cat is not information.
 */

/* ------------------------------------------------------------------ *
 * The transformation
 * ------------------------------------------------------------------ */

export const TRANSFORM_MS = 2600;

/**
 * Sending the winners to Decided is the one thing on this tab that changes the
 * actual holiday, so it gets the magical girl sequence: ribbons, sparkles, a
 * gold hit and a fanfare. Everything else here is a game; this is the bit
 * where the game turns into a plan.
 */
export function Transformation({
  count,
  quiet,
  onDone,
}: {
  count: number;
  quiet: boolean;
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, quiet ? 900 : TRANSFORM_MS);
    return () => clearTimeout(timer);
  }, [onDone, quiet]);

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center overflow-hidden bg-[color:var(--color-arena-deep)]/92"
      role="status"
      aria-live="polite"
      onClick={onDone}
    >
      {!quiet ? (
        <>
          {/* The sweep: one gold disc through the whole frame. */}
          <span
            aria-hidden
            className="animate-ring-sweep absolute aspect-square w-[40vmax] rounded-full"
            style={{
              background:
                "radial-gradient(circle, var(--color-gold) 0%, color-mix(in srgb, var(--color-neon-aaron) 60%, transparent) 45%, transparent 70%)",
            }}
          />
          {/* Ribbons. */}
          {Array.from({ length: 9 }, (_, i) => (
            <span
              key={i}
              aria-hidden
              className="animate-ring-ribbon absolute h-[4px] w-[70vmax] origin-center"
              style={{
                background: `linear-gradient(90deg, transparent, ${
                  i % 2 ? "var(--color-neon-savea)" : "var(--color-gold)"
                }, transparent)`,
                transform: `rotate(${i * 20}deg)`,
                animationDelay: `${i * 70}ms`,
              }}
            />
          ))}
          {/* Sparkles, scattered but not randomly — the same every time, so it
              is a sequence rather than a snowstorm. */}
          {Array.from({ length: 14 }, (_, i) => (
            <span
              key={`s${i}`}
              aria-hidden
              className="animate-ring-sparkle absolute text-[color:var(--color-gold)]"
              style={{
                left: `${8 + hash(`sx${i}`) * 84}%`,
                top: `${8 + hash(`sy${i}`) * 84}%`,
                fontSize: `${0.8 + hash(`sz${i}`) * 1.6}rem`,
                animationDelay: `${hash(`sd${i}`) * 900}ms`,
              }}
            >
              ✦
            </span>
          ))}
        </>
      ) : null}

      <div
        className={cn(
          "relative flex flex-col items-center gap-2 px-6 text-center",
          !quiet && "animate-ring-verdict",
        )}
      >
        <span className="font-jp-gothic text-impact text-6xl text-white sm:text-8xl">
          決定
        </span>
        <span className="font-dela text-xl text-white sm:text-3xl">
          {count} {count === 1 ? "IDEA" : "IDEAS"} PROMOTED
        </span>
        <span className="font-dot text-[0.7rem] tracking-[0.3em] text-white/70">
          IN THE PLAN. NOT YET ON A DAY.
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 祭り
 * ------------------------------------------------------------------ */

/** Petals and paper, for anyone who types `matsuri`. Lasts eight seconds and
 *  then the tab is a tab again. */
export function Festival({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 8000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[55] overflow-hidden"
    >
      {Array.from({ length: 60 }, (_, i) => (
        <span
          key={i}
          className="animate-ring-fall absolute top-0 block h-3 w-3 rounded-[60%_0_60%_0]"
          style={
            {
              left: `${hash(`fx${i}`) * 100}%`,
              backgroundColor: [
                "#ffb7d5",
                "var(--color-gold)",
                "var(--color-neon-savea)",
                "var(--color-neon-aaron)",
                "#fff",
              ][Math.floor(hash(`fc${i}`) * 5)],
              "--fall": `${3 + hash(`ff${i}`) * 4}s`,
              "--drift": `${(hash(`fd${i}`) - 0.5) * 20}rem`,
              animationDelay: `${hash(`fa${i}`) * 5000}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 波動拳
 * ------------------------------------------------------------------ */

/** A fireball crosses the arena, hurts nobody, changes nothing. */
export function Fireball({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
    >
      <span
        className="animate-ring-fireball absolute top-1/2 -left-24 h-20 w-32 -translate-y-1/2 rounded-full"
        style={
          {
            background:
              "radial-gradient(circle at 70% 50%, #fff 0%, var(--color-neon-savea) 35%, color-mix(in srgb, var(--color-neon-savea) 40%, transparent) 70%, transparent 80%)",
            filter: "blur(2px)",
            "--throw": "130vw",
          } as React.CSSProperties
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 招き猫
 * ------------------------------------------------------------------ */

/** Turns up in the corner, waves, leaves. Has no opinion about the trip. */
export function ManekiNeko({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 4200);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      aria-hidden
      className="animate-ring-peek pointer-events-none absolute right-4 bottom-28 z-30 sm:bottom-24"
    >
      <svg width="74" height="86" viewBox="0 0 74 86" fill="none">
        <ellipse cx="37" cy="66" rx="27" ry="20" fill="#fdfbf4" />
        <ellipse cx="37" cy="66" rx="27" ry="20" stroke="#2a2350" strokeWidth="2.5" />
        <circle cx="37" cy="34" r="24" fill="#fdfbf4" stroke="#2a2350" strokeWidth="2.5" />
        <path d="M17 18 L15 3 L30 13 Z" fill="#fdfbf4" stroke="#2a2350" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M57 18 L59 3 L44 13 Z" fill="#fdfbf4" stroke="#2a2350" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="28" cy="32" r="3" fill="#2a2350" />
        <circle cx="46" cy="32" r="3" fill="#2a2350" />
        <path d="M33 41 q4 4 8 0" stroke="#2a2350" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <circle cx="37" cy="38" r="2.4" fill="#ff8fae" />
        <rect x="24" y="58" width="26" height="13" rx="3" fill="var(--color-gold)" stroke="#2a2350" strokeWidth="2.5" />
        {/* The paw, doing the one thing a maneki-neko does. */}
        <g className="animate-ring-wave" style={{ transformOrigin: "60px 56px" }}>
          <ellipse cx="62" cy="46" rx="8" ry="11" fill="#fdfbf4" stroke="#2a2350" strokeWidth="2.5" />
        </g>
      </svg>
    </div>
  );
}
