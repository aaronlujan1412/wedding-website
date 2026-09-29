import { NextResponse, type NextRequest } from "next/server";
import { HOST_COOKIE, isValidSessionToken } from "@/lib/admin-session";

/**
 * Gate for the wedding's back-of-house pages.
 *
 * Next 16 deprecated `middleware.ts`/`middleware()` in favour of
 * `proxy.ts`/`proxy()`, but the matcher export is still named `config` — NOT
 * `proxyConfig`, which some docs claim and which Next silently ignores. Getting
 * that wrong runs this on every route and sends `/hosts` into a redirect loop.
 *
 * Note what is NOT listed below: /me and the tools under it.
 * Those pages render for everybody — signed out they are a write-up of what
 * the tool is, signed in they are the tool — so a redirect at the door would
 * defeat the point. Their gate is the data layer instead: every function that
 * reads real rows checks the session itself (`lib/site-user.ts`), and every
 * page decides which face to draw BEFORE it fetches anything. That is the same
 * rule this file has always followed for actions — the proxy guards pages, and
 * anything that touches data guards itself.
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
  matcher: [
    "/rsvp-list",
    "/rsvp-list/:path*",
    "/photo-review",
    "/photo-review/:path*",
    "/honeymoon",
    "/honeymoon/:path*",
    "/first-dance",
  ],
};
