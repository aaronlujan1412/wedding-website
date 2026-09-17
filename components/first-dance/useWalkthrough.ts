"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The metronome, and the thing that walks the highlight down the sheet.
 *
 * Clicks are scheduled ahead on the AudioContext's own clock rather than fired
 * from a timer: `setInterval` drifts by whole milliseconds under load, and at
 * 70bpm a dancer hears that as the beat wandering. So a coarse timer only ever
 * *schedules* — it never sounds anything — and a rAF loop reads the same clock
 * to decide which beat the page should be showing.
 *
 * The engine below is deliberately outside React. It is a clock, two loops and
 * a queue; none of that is state, and holding the loops as `useCallback`s meant
 * the rAF loop had to reference itself, which this repo's lint rejects.
 *
 * A full eight-count of count-in, not "5 6 7 8": you need the bar to get set.
 */

export const COUNT_IN = 8;

/** How often the scheduler wakes, and how far ahead it fills. */
const TICK_MS = 50;
const AHEAD_S = 0.25;

export type Spot = {
  /** Index into the flat list of eight-counts. */
  index: number;
  /** 1–8. */
  beat: number;
  /** True during the count-in; `index` is where it is about to land. */
  countIn: boolean;
};

export type Live = {
  /** How many eight-counts there are to walk. */
  total: number;
  /** The gear at an index — Gear 3 gets its off-beats clicked too. */
  gearAt: (index: number) => number;
  bpm: number;
  sound: boolean;
};

type Engine = {
  ctx: AudioContext | null;
  timer: number | null;
  raf: number | null;
  lock: WakeLockSentinel | null;
  /** Beats waiting to be shown, in the order they will sound. */
  queue: { at: number; spot: Spot }[];
  /** Next beat to schedule, counted from -COUNT_IN. */
  cursor: number;
  nextAt: number;
  from: number;
  /** Set once the last beat is scheduled; `endsAt` is when it stops mattering. */
  done: boolean;
  endsAt: number;
  /** Read, never captured: the tempo and the mute change mid-run. */
  getLive: () => Live;
  show: (spot: Spot) => void;
  finish: () => void;
};

type Click = "accent" | "beat" | "half";

function click(ctx: AudioContext, at: number, kind: Click) {
  const [freq, peak] =
    kind === "accent" ? [1245, 0.5] : kind === "beat" ? [830, 0.3] : [622, 0.12];

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  // Exponential ramps cannot touch zero, hence the near-silent floor.
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + 0.07);
}

/** Fill the schedule out to the lookahead horizon. Sounds nothing itself. */
function pump(engine: Engine) {
  const ctx = engine.ctx;
  if (!ctx || engine.done) return;
  const { bpm, sound, total, gearAt } = engine.getLive();
  const beatS = 60 / bpm;

  while (engine.nextAt < ctx.currentTime + AHEAD_S) {
    const { cursor } = engine;
    const at = engine.nextAt;

    if (cursor < 0) {
      const beat = COUNT_IN + cursor + 1;
      engine.queue.push({ at, spot: { index: engine.from, beat, countIn: true } });
      if (sound) click(ctx, at, beat === 1 ? "accent" : "beat");
    } else {
      const index = engine.from + Math.floor(cursor / 8);
      if (index >= total) {
        // `at` is when the beat after the last one would have sounded, so the
        // final beat still gets its full length before anything stops.
        engine.done = true;
        engine.endsAt = at;
        return;
      }
      const beat = (cursor % 8) + 1;
      engine.queue.push({ at, spot: { index, beat, countIn: false } });
      if (sound) {
        click(ctx, at, beat === 1 ? "accent" : "beat");
        if (gearAt(index) === 3) click(ctx, at + beatS / 2, "half");
      }
    }

    engine.cursor = cursor + 1;
    engine.nextAt = at + beatS;
  }
}

/** Show whichever beat has actually sounded by now. */
function paint(engine: Engine) {
  const ctx = engine.ctx;
  if (!ctx) return;

  let latest: Spot | null = null;
  while (engine.queue.length > 0 && engine.queue[0].at <= ctx.currentTime) {
    latest = engine.queue.shift()!.spot;
  }
  if (latest) engine.show(latest);

  if (engine.done && ctx.currentTime >= engine.endsAt) {
    engine.finish();
    return;
  }
  engine.raf = requestAnimationFrame(() => paint(engine));
}

function halt(engine: Engine) {
  if (engine.timer !== null) clearInterval(engine.timer);
  if (engine.raf !== null) cancelAnimationFrame(engine.raf);
  engine.timer = null;
  engine.raf = null;
  engine.queue = [];
  void engine.lock?.release();
  engine.lock = null;
}

export function useWalkthrough(live: Live) {
  const [spot, setSpot] = useState<Spot | null>(null);
  const [running, setRunning] = useState(false);

  const liveRef = useRef(live);
  const engineRef = useRef<Engine | null>(null);

  // The engine outlives any one render's closure, so the tempo, the mute and
  // the routine itself are read through here rather than captured.
  useEffect(() => {
    liveRef.current = live;
  });

  /**
   * The engine is made on first use and never during render — a ref's value
   * cannot be read while rendering, and a `useState` instance cannot be
   * mutated, so it is reached only from callbacks and effects. Nothing on it
   * is rendered; it is a clock, two loops and a queue.
   */
  const obtain = useCallback(() => {
    const existing = engineRef.current;
    if (existing) return existing;
    const made: Engine = {
      ctx: null,
      timer: null,
      raf: null,
      lock: null,
      queue: [],
      cursor: 0,
      nextAt: 0,
      from: 0,
      done: false,
      endsAt: 0,
      getLive: () => liveRef.current,
      show: setSpot,
      finish: () => {},
    };
    engineRef.current = made;
    return made;
  }, []);

  const stop = useCallback(() => {
    halt(obtain());
    setRunning(false);
    // The last spot stays lit, so the sheet still shows where you stopped.
  }, [obtain]);

  const start = useCallback(
    async (index: number) => {
      const engine = obtain();
      halt(engine);

      const ctx = engine.ctx ?? new AudioContext();
      engine.ctx = ctx;
      if (ctx.state === "suspended") await ctx.resume();

      engine.from = index;
      engine.cursor = -COUNT_IN;
      engine.nextAt = ctx.currentTime + 0.15;
      engine.done = false;
      engine.queue = [];
      engine.finish = () => {
        halt(engine);
        setRunning(false);
      };

      setRunning(true);
      setSpot({ index, beat: 1, countIn: true });

      // Started before anything else is awaited: `nextAt` is already fixed
      // against the clock, so any await in front of the first pump spends the
      // lead-in and the opening beats come out in one burst.
      pump(engine);
      engine.timer = window.setInterval(() => pump(engine), TICK_MS);
      engine.raf = requestAnimationFrame(() => paint(engine));

      // Phones get propped up, not held, and a run is minutes of no touches.
      try {
        engine.lock = (await navigator.wakeLock?.request("screen")) ?? null;
      } catch {
        // Denied, unsupported, or the tab is not visible. The metronome is the
        // point; the screen staying awake is a courtesy.
      }
    },
    [obtain],
  );

  /** Put the highlight somewhere without starting the clock. */
  const park = useCallback(
    (index: number) => {
      if (obtain().timer !== null) return;
      setSpot({ index, beat: 1, countIn: false });
    },
    [obtain],
  );

  // Read inside the cleanup, not outside it: the engine is built on the first
  // Walk, which is long after this effect first ran.
  useEffect(
    () => () => {
      const engine = engineRef.current;
      if (!engine) return;
      halt(engine);
      void engine.ctx?.close();
      engine.ctx = null;
    },
    [],
  );

  return { spot, running, start, stop, park };
}
