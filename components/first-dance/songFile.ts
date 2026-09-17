"use client";

/**
 * The song, on this device.
 *
 * The file is never uploaded. It is picked from disk, held as a Blob in
 * IndexedDB so it survives a reload, and played from an object URL — so the two
 * of you each point the page at your own copy and nothing about a purchased
 * track ends up in the repo, in a bucket, or on a public URL. `public/` in
 * particular would be served to anyone who guessed the filename, since
 * `proxy.ts` guards pages and not static assets.
 *
 * Calibration lives in localStorage rather than here: it is two numbers, and it
 * is keyed to the file it was measured against so that swapping in a new edit
 * doesn't silently keep the old downbeat.
 */

const DB_NAME = "first-dance";
const STORE = "audio";
const KEY = "song";
const CALIBRATION_KEY = "first-dance:calibration";

export type Calibration = {
  /** Which file this was measured against. */
  name: string;
  size: number;
  /** Seconds into the file where E1 beat 1 lands. */
  anchor: number;
  /** Measured, which is not necessarily the 70 the sheet assumes. */
  bpm: number;
};

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function run<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
) {
  return new Promise<T>((resolve, reject) => {
    void openDb().then((db) => {
      const request = work(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => {
        resolve(request.result);
        db.close();
      };
      request.onerror = () => {
        reject(request.error);
        db.close();
      };
    }, reject);
  });
}

/** Every call is best-effort: a private window can refuse IndexedDB outright,
 *  and a page that still works without a remembered file is the right failure. */
export async function saveSong(file: File) {
  try {
    await run("readwrite", (store) => store.put(file, KEY));
  } catch {
    // Not remembered. It still plays for this session.
  }
}

export async function loadSong(): Promise<File | null> {
  try {
    const found = await run<File | undefined>("readonly", (store) =>
      store.get(KEY),
    );
    return found instanceof File ? found : null;
  } catch {
    return null;
  }
}

export async function forgetSong() {
  try {
    await run("readwrite", (store) => store.delete(KEY));
  } catch {
    // Nothing to forget.
  }
}

export function readCalibration(file: File | null): Calibration | null {
  if (!file) return null;
  try {
    const raw = localStorage.getItem(CALIBRATION_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Calibration;
    // A different file means a different downbeat. Measuring once and then
    // dropping in a recut edit is exactly how a sheet goes quietly wrong.
    if (saved.name !== file.name || saved.size !== file.size) return null;
    return saved;
  } catch {
    return null;
  }
}

export function writeCalibration(value: Calibration) {
  try {
    localStorage.setItem(CALIBRATION_KEY, JSON.stringify(value));
  } catch {
    // Storage blocked. The calibration holds for this session.
  }
}

/**
 * Least squares through the taps: the slope is one beat, the intercept is the
 * downbeat they tapped first. Fitting both at once means a track that is not
 * exactly 70 — and a live-played one never is — still lines up at 4:00 rather
 * than only at the top.
 */
export function fitTaps(taps: number[]) {
  if (taps.length < 4) return null;
  const n = taps.length;
  const meanIndex = (n - 1) / 2;
  const meanTime = taps.reduce((sum, t) => sum + t, 0) / n;

  let covariance = 0;
  let variance = 0;
  taps.forEach((time, index) => {
    covariance += (index - meanIndex) * (time - meanTime);
    variance += (index - meanIndex) ** 2;
  });
  if (variance === 0) return null;

  const period = covariance / variance;
  // 30–200bpm. Outside that they mistapped, and a wild fit would move every
  // time on the sheet without looking obviously wrong.
  if (!Number.isFinite(period) || period < 0.3 || period > 2) return null;

  return { anchor: meanTime - period * meanIndex, bpm: 60 / period };
}
