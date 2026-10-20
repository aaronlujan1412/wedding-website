/**
 * Which project the board is looking at.
 *
 * Its own tiny module for the same reason `trip-cookie.ts` is: both the
 * queries and the board actions need the name, and importing a `"use server"`
 * module for a constant would turn every other export of it into a public POST
 * endpoint.
 */
export const BOARD_COOKIE = "me_board_project";
