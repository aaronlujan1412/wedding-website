"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { HOST_COOKIE, isValidSessionToken } from "@/lib/admin-session";
import type { Lane, Planner } from "@/components/honeymoon/types";

/**
 * Sending a finder proposal into a planner's lane.
 *
 * A proposal is never adopted on anyone's behalf: this only ever makes an
 * ordinary suggestion in someone's lane, which then goes through the lodging
 * tab like any other idea. Decided is refused by the Postgres function, not
 * just by the UI.
 */

async function isHost() {
  const store = await cookies();
  return isValidSessionToken(store.get(HOST_COOKIE)?.value);
}

const DENIED = { data: null, error: "Not authorised." };

function refresh() {
  // The new stays show on the Lodging tab and the board's bands as well as here.
  revalidatePath("/honeymoon", "layout");
}

function sendError(error: { message: string }): string {
  if (error.message.includes("no longer exists")) {
    return "That proposal is gone — the finder has published a newer set. Reload the page.";
  }
  if (error.message.includes("not straight to Decided")) {
    return "Proposals go to a planner's lane first, then get adopted from Lodging.";
  }
  return error.message;
}

/** Copy every stay of one route into a lane as suggestions. */
export async function sendRouteToLane(routeId: string, lane: Lane, planner: Planner) {
  if (!(await isHost())) return DENIED;
  if (lane === "decided") return { data: null, error: "Pick a planner's lane, not Decided." };

  const { data, error } = await supabase.rpc("send_trip_route_proposal", {
    p_route: routeId,
    p_lane: lane,
    p_planner: planner,
  });
  if (error) return { data: null, error: sendError(error) };

  refresh();
  return { data, error: null };
}

/** Copy a single proposed stay into a lane, for taking one night's idea. */
export async function sendStayToLane(stayId: string, lane: Lane, planner: Planner) {
  if (!(await isHost())) return DENIED;
  if (lane === "decided") return { data: null, error: "Pick a planner's lane, not Decided." };

  const { data, error } = await supabase.rpc("send_trip_stay_proposal", {
    p_stay: stayId,
    p_lane: lane,
    p_planner: planner,
  });
  if (error) return { data: null, error: sendError(error) };

  refresh();
  return { data, error: null };
}
