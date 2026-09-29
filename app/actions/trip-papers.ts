"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { HOST_COOKIE, isValidSessionToken } from "@/lib/admin-session";
import { currentTripId } from "@/lib/honeymoon-queries";
import { removePaper, savePaper } from "@/lib/trip-papers";

async function isHost() {
  const store = await cookies();
  return isValidSessionToken(store.get(HOST_COOKIE)?.value);
}

const DENIED = { data: null, error: "Not authorised." };

function refresh() {
  // Papers show wherever the thing they confirm shows, itinerary included.
  revalidatePath("/honeymoon", "layout");
}

/**
 * `owner` is the key of the thing this confirms — `stay:<id>` today. It is
 * never trusted to carry a trip: that is resolved server-side, the same as
 * every other planner write.
 */
export async function uploadPaper(owner: string, formData: FormData) {
  if (!(await isHost())) return DENIED;

  const trip = await currentTripId();
  if (!trip) {
    return { data: null, error: "There's no trip yet. Make one first." };
  }

  const result = await savePaper(trip, owner, formData);
  if (result.data) refresh();
  return result;
}

export async function deletePaper(id: string) {
  if (!(await isHost())) return DENIED;

  const error = await removePaper(id);
  if (!error) refresh();
  return { data: error ? null : { id }, error };
}
