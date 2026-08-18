import { NextResponse, type NextRequest } from "next/server";
import { HOST_COOKIE, isValidSessionToken } from "@/lib/admin-session";

/**
 * Gate for the guest ledger.
 *
 * Next 16 deprecated `middleware.ts`/`middleware()` in favour of
 * `proxy.ts`/`proxy()`, but the matcher export is still named `config` — NOT
 * `proxyConfig`, which some docs claim and which Next silently ignores. Getting
 * that wrong runs this on every route and sends `/hosts` into a redirect loop.
 */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(HOST_COOKIE)?.value;

  if (await isValidSessionToken(token)) {
    return NextResponse.next();
  }

  const login = new URL("/hosts", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);

  const response = NextResponse.redirect(login);
  // Drop an expired or tampered cookie so the next attempt starts clean.
  response.cookies.delete(HOST_COOKIE);
  return response;
}

export const config = {
  matcher: ["/rsvp-list", "/rsvp-list/:path*"],
};
