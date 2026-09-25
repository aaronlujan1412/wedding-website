import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { HOST_COOKIE, isValidSessionToken } from "@/lib/admin-session";
import { paperUrl } from "@/lib/trip-papers";

/**
 * Opens one confirmation PDF.
 *
 * The link in the page is this stable path rather than a signed URL, so it
 * still works on a tab that has been open all afternoon and nothing long-lived
 * is sitting in the HTML. The signature is minted here, per click, and lasts
 * minutes.
 *
 * It sits under `/honeymoon` so `proxy.ts` already guards it, and checks the
 * cookie again anyway — the proxy guards pages, and this is the one place a
 * private bucket becomes a URL anyone could forward.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const store = await cookies();
  if (!(await isValidSessionToken(store.get(HOST_COOKIE)?.value))) {
    return new NextResponse("Not authorised.", { status: 401 });
  }

  const { id } = await params;
  const url = await paperUrl(id);
  if (!url) return new NextResponse("No such paper.", { status: 404 });

  return NextResponse.redirect(url);
}
