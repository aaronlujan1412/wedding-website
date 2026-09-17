"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import type { Spot } from "./useWalkthrough";

/**
 * The same walk down the sheet, but the song owns the clock.
 *
 * With the metronome the page generates the beat; here it only reads one.
 * Everything is derived from `audio.currentTime` against two measured numbers —
 * where E1 beat 1 falls in the file, and what the track's tempo actually is —
 * so the highlight is wherever the music is, including after a seek or a drag
 * of the scrubber.
 *
 * Because the reading is in MEDIA time, slowing the track down needs no
 * arithmetic here at all: `playbackRate` stretches wall-clock time and leaves
 * `currentTime` measuring the same song.
 */

export type SongClock = {
  /** Seconds into the file where E1 beat 1 lands. */
  anchor: number;
  /** The track's measured tempo, which the sheet only assumes is 70. */
  bpm: number;
  total: number;
};

type Follower = {
  raf: number | null;
  lock: WakeLockSentinel | null;
  audio: () => HTMLAudioElement | null;
  getClock: () => SongClock;
  show: (spot: Spot) => void;
  finish: () => void;
  /** Last frame's reading, so state is set about once a beat and not sixty
   *  times a second — the whole sheet re-renders on a change. */
  lastIndex: number;
  lastBeat: number;
  lastCountIn: boolean;
};

function tick(follower: Follower) {
  const audio = follower.audio();
  if (!audio) return;

  const { anchor, bpm, total } = follower.getClock();
  const beatSeconds = 60 / bpm;
  const elapsed = audio.currentTime - anchor;

  let spot: Spot;
  if (elapsed < 0) {
    // Still in whatever runs before the dance starts. Count it in anyway: the
    // beat right before E1 beat 1 is an 8, so the intro counts you on.
    const before = Math.floor(-elapsed / beatSeconds);
    spot = { index: 0, beat: 8 - (before % 8), countIn: true };
  } else {
    const index = Math.floor(elapsed / (beatSeconds * 8));
    if (index >= total) {
      follower.finish();
      return;
    }
    spot = {
      index,
      beat: (Math.floor(elapsed / beatSeconds) % 8) + 1,
      countIn: false,
    };
  }

  if (
    spot.index !== follower.lastIndex ||
    spot.beat !== follower.lastBeat ||
    spot.countIn !== follower.lastCountIn
  ) {
    follower.lastIndex = spot.index;
    follower.lastBeat = spot.beat;
    follower.lastCountIn = spot.countIn;
    follower.show(spot);
  }

  if (audio.paused) {
    follower.finish();
    return;
  }
  follower.raf = requestAnimationFrame(() => tick(follower));
}

function halt(follower: Follower) {
  if (follower.raf !== null) cancelAnimationFrame(follower.raf);
  follower.raf = null;
  void follower.lock?.release();
  follower.lock = null;
}

export function useSongWalk(
  audioRef: RefObject<HTMLAudioElement | null>,
  clock: SongClock,
) {
  const [spot, setSpot] = useState<Spot | null>(null);
  const [running, setRunning] = useState(false);

  const clockRef = useRef(clock);
  const followerRef = useRef<Follower | null>(null);

  useEffect(() => {
    clockRef.current = clock;
  });

  // Built on first use, never during render — same reason as the metronome's
  // engine: a ref cannot be read while rendering and state cannot be mutated.
  const obtain = useCallback(() => {
    const existing = followerRef.current;
    if (existing) return existing;
    const made: Follower = {
      raf: null,
      lock: null,
      audio: () => audioRef.current,
      getClock: () => clockRef.current,
      show: setSpot,
      finish: () => {},
      lastIndex: -1,
      lastBeat: -1,
      lastCountIn: false,
    };
    followerRef.current = made;
    return made;
  }, [audioRef]);

  const stop = useCallback(() => {
    const follower = obtain();
    halt(follower);
    follower.audio()?.pause();
    setRunning(false);
  }, [obtain]);

  const start = useCallback(
    async (index: number) => {
      const follower = obtain();
      const audio = follower.audio();
      if (!audio) return;
      halt(follower);

      const { anchor, bpm } = clockRef.current;
      // One eight-count of lead-in, so drilling E32 for the twentieth time
      // still gives you the bar before it rather than dropping you onto the
      // downbeat cold. Clamped, because E1's lead-in is the track's own intro.
      const at = Math.max(0, anchor + (index - 1) * (60 / bpm) * 8);
      try {
        audio.currentTime = at;
        await audio.play();
      } catch {
        // Blocked, or the file went away. Nothing is playing, so claim nothing.
        setRunning(false);
        return;
      }

      follower.finish = () => {
        halt(follower);
        follower.audio()?.pause();
        setRunning(false);
      };
      follower.lastIndex = -1;
      follower.lastBeat = -1;

      setRunning(true);
      follower.raf = requestAnimationFrame(() => tick(follower));

      try {
        follower.lock = (await navigator.wakeLock?.request("screen")) ?? null;
      } catch {
        // A courtesy, not the point.
      }
    },
    [obtain],
  );

  const park = useCallback(
    (index: number) => {
      if (running) return;
      setSpot({ index, beat: 1, countIn: false });
    },
    [running],
  );

  useEffect(
    () => () => {
      const follower = followerRef.current;
      if (follower) halt(follower);
    },
    [],
  );

  return { spot, running, start, stop, park };
}
