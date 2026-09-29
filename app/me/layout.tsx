import type { Metadata, Viewport } from "next";
import { BadgeStrip } from "@/components/me/Badge88";
import { Masthead } from "@/components/me/Masthead";
import { MeNav } from "@/components/me/MeNav";
import { Sidebar } from "@/components/me/Sidebar";

/**
 * Aaron's own site, parked at /me until it takes over `/`.
 *
 * It sits outside app/(site) on purpose, the way the honeymoon planner does:
 * the navbar, the footer and the RSVP modal belong to the wedding, and none of
 * them should follow a stranger onto a personal site. Nothing on the guest site
 * links here either — the address is the only way in — so the wedding stays
 * exactly as uncluttered as it is while it's still the live site.
 *
 * The shape is a 2004 portal on purpose: banner, ticker, tabs, a profile
 * column that follows you from page to page, and a row of buttons at the
 * bottom saying what the site is made of.
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

export default function MeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /* #me is the hook globals.css uses to paint the ground on <body>. Painting
       only this box leaves the tile short in the overscroll gutter and under
       the phone's URL bar. */
    <div id="me" className="tile-weave min-h-dvh font-forum text-me-ink">
      <div className="mx-auto w-full max-w-5xl space-y-3 px-3 py-4 sm:px-5 sm:py-6">
        <Masthead />
        <MeNav />

        {/* 232px is a sidebar width, not a fraction of the page: the profile
            card is a fixed object and the reading column should take the rest
            of whatever screen it finds. Below lg it stacks, card first. */}
        <div className="grid items-start gap-3 lg:grid-cols-[232px_minmax(0,1fr)]">
          <Sidebar />
          <main className="space-y-3">{children}</main>
        </div>

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
