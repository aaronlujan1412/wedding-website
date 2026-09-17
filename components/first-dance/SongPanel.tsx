"use client";

import { type RefObject, useRef, useState } from "react";
import { Minus, Music, Plus, Timer } from "lucide-react";
import { SONG } from "@/lib/first-dance";
import { cn } from "@/lib/utils";
import { fitTaps } from "./songFile";

export type Mode = "metronome" | "song";

const RATE_MIN = 0.6;
const RATE_STEP = 0.05;
/** How far one press moves the downbeat. Tapping lands late by a fairly
 *  constant amount, so the nudge is there to take that back out. */
const NUDGE_S = 0.025;

/** m:ss.hh — the downbeat is a hundredths-of-a-second fact, not a m:ss one. */
function precise(seconds: number) {
  const whole = Math.max(0, seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole - minutes * 60;
  return `${minutes}:${rest < 10 ? "0" : ""}${rest.toFixed(2)}`;
}

/**
 * Where you choose what you are dancing to.
 *
 * The sheet itself asks for both: E22 says to drill it dry against a metronome
 * until it is automatic and only then put the song back. So this is a switch
 * between two real practice modes, not a player bolted onto a page.
 */
export function SongPanel({
  mode,
  onMode,
  song,
  onPick,
  bpm,
  onBpm,
  anchor,
  songBpm,
  onCalibrate,
  rate,
  onRate,
  audioRef,
}: {
  mode: Mode;
  onMode: (mode: Mode) => void;
  song: { file: File; url: string } | null;
  onPick: (file: File) => void;
  /** The metronome's tempo. */
  bpm: number;
  onBpm: (bpm: number) => void;
  anchor: number;
  songBpm: number;
  onCalibrate: (anchor: number, bpm: number) => void;
  rate: number;
  onRate: (rate: number) => void;
  audioRef: RefObject<HTMLAudioElement | null>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [taps, setTaps] = useState<number[] | null>(null);

  const fit = taps ? fitTaps(taps) : null;

  const beginTapping = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = 1;
    audio.currentTime = 0;
    void audio.play();
    setTaps([]);
  };

  const tap = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const at = audio.currentTime;
    setTaps((previous) => [...(previous ?? []), at]);
  };

  const endTapping = (keep: boolean) => {
    audioRef.current?.pause();
    if (keep && fit) onCalibrate(fit.anchor, fit.bpm);
    setTaps(null);
  };

  return (
    <div className="mt-8 rounded-lg border border-border bg-card p-4 sm:p-5 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-garamond text-lg text-foreground">
          Practise to
        </span>
        <div className="flex gap-2">
          <ModeButton
            on={mode === "metronome"}
            onClick={() => onMode("metronome")}
            icon={<Timer className="h-3.5 w-3.5" strokeWidth={1.5} />}
          >
            the metronome
          </ModeButton>
          <ModeButton
            on={mode === "song"}
            onClick={() => onMode("song")}
            icon={<Music className="h-3.5 w-3.5" strokeWidth={1.5} />}
          >
            the song
          </ModeButton>
        </div>
      </div>

      {mode === "metronome" ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Stepper
            value={`${bpm} bpm`}
            onDown={() => onBpm(Math.max(40, bpm - 5))}
            onUp={() => onBpm(Math.min(SONG.bpm, bpm + 5))}
            downLabel="Slower"
            upLabel="Faster"
            atMin={bpm <= 40}
            atMax={bpm >= SONG.bpm}
          />
          <p className="font-garamond text-base text-muted-foreground">
            {bpm === SONG.bpm
              ? "Song tempo. The times on the sheet are this."
              : `Practice tempo. The song is ${SONG.bpm} — put it back before a full run.`}
          </p>
        </div>
      ) : !song ? (
        <div className="mt-4">
          <p className="max-w-[58ch] font-garamond text-lg leading-relaxed text-foreground/85">
            Choose the mp3 on this device. It is never uploaded — it is read
            straight off your disk and remembered in this browser, so each of
            you points the page at your own copy.
          </p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-3 rounded-full border border-primary px-4 py-1.5 font-raleway text-xs tracking-wide text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
          >
            Choose the file
          </button>
        </div>
      ) : taps ? (
        <div className="mt-4">
          <p className="max-w-[58ch] font-garamond text-lg leading-relaxed text-foreground/85">
            Tap every beat, starting on the one you would take your first step
            on. Eight is enough; more is better.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              autoFocus
              onClick={tap}
              className="rounded-full bg-primary px-8 py-3 font-raleway text-sm tracking-wide text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Tap
            </button>
            <p className="font-mono text-xs tabular-nums slashed-zero text-muted-foreground">
              {taps.length} {taps.length === 1 ? "tap" : "taps"}
              {fit
                ? ` · ${fit.bpm.toFixed(1)} bpm · downbeat ${precise(fit.anchor)}`
                : " · four to go"}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!fit}
              onClick={() => endTapping(true)}
              className="rounded-full border border-primary px-4 py-1.5 font-raleway text-xs tracking-wide text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
            >
              Use this
            </button>
            <button
              type="button"
              onClick={() => endTapping(false)}
              className="rounded-full border border-border px-4 py-1.5 font-raleway text-xs tracking-wide text-muted-foreground transition-colors hover:border-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
            >
              Keep what I had
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-garamond text-lg text-foreground">
              {song.file.name}
            </span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-sm font-raleway text-[0.65rem] tracking-[0.2em] text-muted-foreground uppercase underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
            >
              Change
            </button>
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Stepper
              value={`${Math.round(rate * 100)}%`}
              onDown={() => onRate(Math.max(RATE_MIN, rate - RATE_STEP))}
              onUp={() => onRate(Math.min(1, rate + RATE_STEP))}
              downLabel="Slower"
              upLabel="Faster"
              atMin={rate <= RATE_MIN}
              atMax={rate >= 1}
            />
            <p className="font-garamond text-base text-muted-foreground">
              {rate === 1
                ? `Full speed, ${songBpm.toFixed(0)} bpm.`
                : `Slowed to about ${(songBpm * rate).toFixed(0)} bpm, at pitch. The sheet's times are still the song's.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-3">
            <span
              className={cn(
                "font-mono text-xs tabular-nums slashed-zero",
                // Until it is measured every time on the page is a guess, and
                // that is a thing to go and do — pending, as everywhere else.
                anchor > 0 || songBpm !== SONG.bpm
                  ? "text-muted-foreground"
                  : "text-pending",
              )}
            >
              {anchor > 0 || songBpm !== SONG.bpm
                ? `downbeat ${precise(anchor)} · ${songBpm.toFixed(1)} bpm`
                : "downbeat not set"}
            </span>
            {anchor > 0 && (
              <Stepper
                small
                value="nudge"
                onDown={() => onCalibrate(Math.max(0, anchor - NUDGE_S), songBpm)}
                onUp={() => onCalibrate(anchor + NUDGE_S, songBpm)}
                downLabel="Downbeat 25ms earlier"
                upLabel="Downbeat 25ms later"
              />
            )}
            <button
              type="button"
              onClick={beginTapping}
              className="rounded-full border border-primary px-4 py-1.5 font-raleway text-xs tracking-wide text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
            >
              {anchor > 0 ? "Tap it again" : "Tap in the beat"}
            </button>
          </div>

          {anchor === 0 ? (
            <p className="max-w-[58ch] font-garamond text-base leading-relaxed text-muted-foreground">
              Until you tap it in, the sheet assumes the dance starts at 0:00 of
              the file at exactly {SONG.bpm}. Tapping measures both against your
              actual edit, and everything on the page moves with it.
            </p>
          ) : (
            Math.abs(songBpm - SONG.bpm) >= 0.5 && (
              <p className="max-w-[58ch] font-garamond text-base leading-relaxed text-muted-foreground">
                Your edit runs at {songBpm.toFixed(1)}, not {SONG.bpm}. The page
                follows the measured tempo, so the highlight is right — but the
                times printed down the sheet are still the nominal {SONG.bpm},
                and drift from the file by about{" "}
                {Math.abs(260 - (260 * SONG.bpm) / songBpm).toFixed(0)}s by the
                end.
              </p>
            )
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}

function ModeButton({
  on,
  onClick,
  icon,
  children,
}: {
  on: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-garamond text-lg leading-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none",
        on
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:border-primary",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function Stepper({
  value,
  onDown,
  onUp,
  downLabel,
  upLabel,
  atMin,
  atMax,
  small,
}: {
  value: string;
  onDown: () => void;
  onUp: () => void;
  downLabel: string;
  upLabel: string;
  atMin?: boolean;
  atMax?: boolean;
  small?: boolean;
}) {
  const button =
    "flex items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none";
  const size = small ? "h-7 w-7" : "h-8 w-8";

  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1">
      <button
        type="button"
        onClick={onDown}
        disabled={atMin}
        title={downLabel}
        className={cn(button, size)}
      >
        <Minus className="h-4 w-4" strokeWidth={1.5} />
        <span className="sr-only">{downLabel}</span>
      </button>
      <span
        className={cn(
          "text-center font-mono tabular-nums slashed-zero",
          small ? "px-1 text-[0.65rem] text-muted-foreground" : "min-w-14 text-sm",
        )}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={onUp}
        disabled={atMax}
        title={upLabel}
        className={cn(button, size)}
      >
        <Plus className="h-4 w-4" strokeWidth={1.5} />
        <span className="sr-only">{upLabel}</span>
      </button>
    </div>
  );
}
