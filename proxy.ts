import { NextResponse, type NextRequest } from "next/server";
import { HOST_COOKIE, isValidSessionToken } from "@/lib/admin-session";
import { BRAIN_COOKIE, readBrainToken } from "@/lib/brain-session";

/**
 * Gate for the back-of-house pages.
 *
 * Next 16 deprecated `middleware.ts`/`middleware()` in favour of
 * `proxy.ts`/`proxy()`, but the matcher export is still named `config` — NOT
 * `proxyConfig`, which some docs claim and which Next silently ignores. Getting
 * that wrong runs this on every route and sends `/hosts` into a redirect loop.
 *
 * Two gates, two sets of credentials, deliberately unconnected: the wedding's
 * shared host passphrase, and the SecondBrain's per-user accounts. A host
 * cookie must not open /me/brain, which is why they are signed with different
 * secrets rather than distinguished by a flag inside one token.
 *
 * Both checks here are signature-and-expiry only — no database, since this runs
 * on every matched request. Whether a brain account still exists, and whether
 * its session has been revoked since, is `lib/brain-user.ts`, which every page
 * and action behind this gate calls anyway. The proxy guards pages; actions
 * guard themselves.
 */

type Gate = {
  cookie: string;
  login: string;
  valid: (token: string | undefined) => Promise<boolean>;
};

const HOST: Gate = {
  cookie: HOST_COOKIE,
  login: "/hosts",
  valid: isValidSessionToken,
};

const BRAIN: Gate = {
  cookie: BRAIN_COOKIE,
  login: "/me/login",
  valid: async (token) => (await readBrainToken(token)) !== null,
};

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const gate = path.startsWith("/me/brain") ? BRAIN : HOST;

  if (await gate.valid(request.cookies.get(gate.cookie)?.value)) {
    return NextResponse.next();
  }

  const login = new URL(gate.login, request.url);
  login.searchParams.set("next", path);

  const response = NextResponse.redirect(login);
  // Drop an expired or tampered cookie so the next attempt starts clean.
  response.cookies.delete(gate.cookie);
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
    "/me/brain",
    "/me/brain/:path*",
  ],
};
