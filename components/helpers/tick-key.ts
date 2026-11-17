/**
 * A checklist line's key in `helper_ticks`: its text after the texts of the
 * lines it sits under, "Savea and Aaron’s car › Mugs". Text rather than
 * position, so adding a line never moves a tick onto a different one.
 *
 * Its own file because `Lines` draws the boxes and is in the schedule's
 * client bundle; the lists themselves aren't, and mustn't come along.
 */
export function tickKey(path: readonly string[]) {
  return path.join(" › ");
}
