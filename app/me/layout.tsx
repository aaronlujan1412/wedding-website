import type { Metadata, Viewport } from "next";
import { BadgeStrip } from "@/components/me/Badge88";
import { Masthead } from "@/components/me/Masthead";
import { MeNav } from "@/components/me/MeNav";
import { currentUser } from "@/lib/site-user";

/**
 * Aaron's own site, parked at /me until it takes over `/`.
 *
 * It sits outside app/(site) on purpose, the way the honeymoon planner does:
 * the navbar, the footer and the RSVP modal belong to the wedding, and none of
 * them should follow a stranger onto a personal site. Nothing on the guest site
 * links here either, so the wedding stays exactly as uncluttered as it is while
 * it's still the live site.
 *
 * The shape is a 2004 portal on purpose: banner, ticker, tabs, and a row of
 * buttons at the bottom saying what the site is made of.
 *
 * Pages under here are dual-mode. Signed out they are a portfolio — what each
 * tool is and why it is built that way. Signed in they are the tools. Which
 * one you get is decided per page, never here: this layout only needs to know
 * whether to draw "sign in" or your name.
 *
 * Reading the session makes every page under /me dynamic. That is a real cost
 * and it is worth it — the alternative is a client-side auth check that flashes
 * the wrong nav on first paint, on a site with one reader.
 *
 * When this becomes the front door, the move is a folder rename and dropping
 * the `robots` line below.
 */
export const metadata: Metadata = {
  title: { default: "Aaron Lujan", template: "%s · Aaron Lujan" },
  description: "Software engineer. This is my corner of it.",
  // Unlisted while the wedding is the site people are actually visiting.
  robots: { index: false, follow: false },
};

/** A dark page under a light phone status bar looks like a rendering bug. */
export const viewport: Viewport = {
  themeColor: "#150d2b",
  colorScheme: "dark",
};

export default async function MeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  return (
    /* #me is the hook globals.css uses to paint the ground on <body>. Painting
       only this box leaves the tile short in the overscroll gutter and under
       the phone's URL bar. */
    <div id="me" className="tile-weave min-h-dvh font-forum text-me-ink">
      <div className="mx-auto w-full max-w-5xl space-y-3 px-3 py-4 sm:px-5 sm:py-6">
        <Masthead />
        <MeNav username={user?.username ?? null} />

        {children}

        <footer className="bevel-out bg-me-panel p-3.5 shadow-[3px_3px_0_var(--color-me-edge-lo)]">
          <BadgeStrip />
          <p className="mt-3 text-[11px] text-me-dim">
            Built by hand. No trackers, no cookies, no newsletter.
          </p>
        </footer>
      </div>
    </div>
  );
}
