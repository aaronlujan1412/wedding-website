const SONG_REQUESTS_CLOSE = "2026-10-01T00:00:00";

/** Groups whose song requests close later than everyone else's, by group id. */
const SONG_REQUEST_EXTENSIONS: Record<number, string> = {
  21: "2026-11-01T00:00:00", // Caleb and Acoya: their invite never arrived in the mail
  23: "2026-11-01T00:00:00", // ":)" (Caitlyn and Colten)
};

export function isSongRequestOpen(groupId: number | null, now = new Date()) {
  const closes =
    (groupId !== null && SONG_REQUEST_EXTENSIONS[groupId]) ||
    SONG_REQUESTS_CLOSE;
  return now < new Date(closes);
}

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
