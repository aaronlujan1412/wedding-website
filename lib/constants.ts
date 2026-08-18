export const isSongRequestOpen = new Date() < new Date("2026-10-01");

export const WEDDING_DATE = new Date("2026-12-01T00:00:00");

/** Whole days between today and the wedding. Negative once the day has passed. */
export function daysUntilWedding(now = new Date()) {
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((WEDDING_DATE.getTime() - startOfToday.getTime()) / msPerDay);
}
