import type { Song } from "./types";

/**
 * What a song is, as far as the Ring cares.
 *
 * Kept out of bouts.ts because arcade.ts needs these too, and arcade.ts is
 * already imported by bouts.ts — putting them in either one would make the
 * two import each other.
 */

/**
 * How much music the party has room for, from the wedding schedule: cocoa hour
 * runs from the doors at 15:00 to the ceremony at 16:15, and dinner and
 * dancing from the grand entrance at 17:00 to the send-off at 21:00.
 *
 * Constants rather than read from `components/schedule`, which would pull the
 * whole ceremony script into this tab's bundle for two numbers. If the day's
 * times move, these move with them.
 */
export const MUSIC_MINUTES = 75 + 240;

/**
 * Nobody has timed 140 songs. Three and a half minutes is about what a pop
 * song runs, so the line this draws is an estimate, and the page says so.
 */
export const SONG_MINUTES = 3.5;

/** How many songs fit: the row the cut line is drawn under. */
export const SETLIST = Math.floor(MUSIC_MINUTES / SONG_MINUTES);

/**
 * A title split into the song and the version of it.
 *
 * Only a trailing parenthetical counts as a version — "Fearless (Taylor's
 * Version)", "Teenage Dream (Katy Perry cover)", "(feat. Rivers Cuomo)". The
 * arena draws the name big and the version small, and two cards with the same
 * name are the same song twice.
 */
export function titleParts(title: string): {
  name: string;
  version: string | null;
} {
  const match = /^(.+?)\s*\(([^()]+)\)\s*$/.exec(title);
  return match
    ? { name: match[1], version: match[2] }
    : { name: title, version: null };
}

function fold(text: string): string {
  return text.trim().toLowerCase();
}

/** Two versions of one song — "Wi$h Li$t" and its wedding piano cover. */
export function sameSong(a: Song, b: Song): boolean {
  return fold(titleParts(a.title).name) === fold(titleParts(b.title).name);
}

export function sameArtist(a: Song, b: Song): boolean {
  return fold(a.artist) === fold(b.artist);
}

/** One line per song, the way a playlist search box wants it. */
export function setlistText(songs: Song[]): string {
  return songs.map((song) => `${song.title} — ${song.artist}`).join("\n");
}
