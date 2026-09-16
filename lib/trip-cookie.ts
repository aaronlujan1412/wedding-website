/**
 * Which trip the planner is looking at.
 *
 * Its own tiny module because both the queries and the trip actions need the
 * name, and importing a `"use server"` module for a constant would turn every
 * other export of it into a public POST endpoint.
 */
export const TRIP_COOKIE = "wedding_trip";
