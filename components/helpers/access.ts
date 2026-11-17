import "server-only";

import { cookies } from "next/headers";
import { HOST_COOKIE, isValidSessionToken } from "@/lib/admin-session";
import { HELPER_COOKIE, isValidHelperToken } from "@/lib/helper-session";

/**
 * Whether this browser can open the staff helper pages: it was given the
 * helpers' code, or it's a host's. One code for all three pages, so this
 * doesn't ask which.
 */
export async function hasHelperAccess() {
  const store = await cookies();
  const [helper, host] = await Promise.all([
    isValidHelperToken(store.get(HELPER_COOKIE)?.value),
    isValidSessionToken(store.get(HOST_COOKIE)?.value),
  ]);
  return helper || host;
}
