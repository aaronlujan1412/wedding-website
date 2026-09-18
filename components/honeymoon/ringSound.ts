/**
 * The cabinet's speaker.
 *
 * Synthesised on the spot with two oscillators and a noise buffer — no audio
 * files, nothing to download, nothing to keep in the repo. It is four sounds
 * and they are all about 300ms.
 *
 * Nothing plays until the first press, which is not restraint: an AudioContext
 * cannot start without a user gesture, so the page always loads silent and the
 * first verdict is the thing that turns the machine on. The mute is remembered
 * per browser, and typing `zen` throws it.
 */

export type Cue = "hit" | "crit" | "keep" | "cut" | "skip" | "combo" | "fanfare";

const STORE_KEY = "ring-muted";

let context: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (context) return context;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  context = new Ctor();
  return context;
}

/** Whether the speaker is off. Reads can throw in a locked-down browser, and
 *  a page that cannot remember the setting should still make a noise. */
export function isMuted(): boolean {
  try {
    return window.localStorage.getItem(STORE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  try {
    window.localStorage.setItem(STORE_KEY, muted ? "1" : "0");
  } catch {
    /* A private window still gets sound, it just forgets by morning. */
  }
}

function tone(
  audio: AudioContext,
  at: number,
  from: number,
  to: number,
  length: number,
  gain: number,
  type: OscillatorType = "square",
) {
  const osc = audio.createOscillator();
  const vol = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + length);
  vol.gain.setValueAtTime(gain, at);
  vol.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(vol).connect(audio.destination);
  osc.start(at);
  osc.stop(at + length + 0.02);
}

/** The percussive half of a punch: white noise through a falling filter. */
function thud(audio: AudioContext, at: number, length: number, gain: number) {
  const frames = Math.floor(audio.sampleRate * length);
  const buffer = audio.createBuffer(1, frames, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 2;
  }
  const source = audio.createBufferSource();
  source.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1800, at);
  filter.frequency.exponentialRampToValueAtTime(180, at + length);
  const vol = audio.createGain();
  vol.gain.setValueAtTime(gain, at);
  source.connect(filter).connect(vol).connect(audio.destination);
  source.start(at);
}

export function play(cue: Cue) {
  if (mutedSnapshot()) return;
  const audio = ctx();
  if (!audio) return;
  // Every browser suspends the context until a gesture, and the press that
  // called this is one.
  if (audio.state === "suspended") void audio.resume();

  const t = audio.currentTime;

  switch (cue) {
    case "hit":
      thud(audio, t, 0.16, 0.5);
      tone(audio, t, 220, 60, 0.18, 0.22);
      break;
    case "crit":
      thud(audio, t, 0.24, 0.65);
      tone(audio, t, 320, 50, 0.3, 0.28);
      tone(audio, t + 0.04, 900, 180, 0.26, 0.2, "sawtooth");
      break;
    case "keep":
      // Both survive: a bright two-note ding, up rather than down.
      tone(audio, t, 660, 660, 0.1, 0.18, "triangle");
      tone(audio, t + 0.09, 990, 990, 0.16, 0.18, "triangle");
      break;
    case "cut":
      // Both gone: the classic falling raspberry.
      tone(audio, t, 300, 300, 0.1, 0.22, "sawtooth");
      tone(audio, t + 0.1, 240, 90, 0.34, 0.22, "sawtooth");
      break;
    case "skip":
      tone(audio, t, 420, 300, 0.1, 0.12, "triangle");
      break;
    case "combo":
      tone(audio, t, 880, 880, 0.06, 0.14, "square");
      tone(audio, t + 0.06, 1320, 1320, 0.1, 0.14, "square");
      break;
    case "fanfare": {
      // The transformation. A major arpeggio, then the octave, held.
      const notes = [523, 659, 784, 1047, 1319];
      notes.forEach((note, i) => {
        tone(audio, t + i * 0.09, note, note, 0.22, 0.16, "triangle");
      });
      tone(audio, t + 0.55, 1568, 1568, 0.7, 0.14, "triangle");
      break;
    }
  }
}

/* ------------------------------------------------------------------ *
 * The mute, as a store
 * ------------------------------------------------------------------ */

/**
 * `useSyncExternalStore` rather than state seeded from localStorage: the
 * server has no idea whether the speaker is off, and reading it during the
 * first client render would be a hydration mismatch. The server snapshot is
 * always "on", React swaps in the real one after hydrating, and the value is
 * cached here so the snapshot is stable between renders.
 */
let cache: boolean | null = null;
const listeners = new Set<() => void>();

export function subscribeMuted(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function mutedSnapshot(): boolean {
  if (cache === null) cache = isMuted();
  return cache;
}

export function mutedServerSnapshot(): boolean {
  return false;
}

export function toggleMuted(next?: boolean) {
  cache = next ?? !mutedSnapshot();
  setMuted(cache);
  for (const fn of listeners) fn();
}
