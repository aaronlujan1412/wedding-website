// Clock arithmetic on `HH:MM` strings. Times stay strings all the way to the
// screen: a Date would drag a time zone into a schedule that only ever
// happens in one place.

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function addMinutes(time: string, minutes: number) {
  const total = toMinutes(time) + minutes;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "4:15", for a column of times where the meridiem goes without saying. */
export function formatClock(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}`;
}

/** "4:15 PM" */
export function formatTime(time: string) {
  return `${formatClock(time)} ${Number(time.slice(0, 2)) < 12 ? "AM" : "PM"}`;
}
