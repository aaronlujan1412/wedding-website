"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navFor } from "@/components/me/nav";
import { signOut } from "@/app/actions/auth";

/**
 * The tabs, and who you are.
 *
 * A client component only because it marks where you are. The session is read
 * on the server and handed down — nothing here is allowed to decide for itself
 * whether someone is signed in.
 *
 * "You are here" is a pressed button rather than a coloured label, because on
 * a page built entirely out of bevels the raised/sunk pair already means
 * available/engaged, and a second way of saying it would be one too many.
 */
export function MeNav({
  username,
  role,
}: {
  username: string | null;
  role: "owner" | "meals" | null;
}) {
  const pathname = usePathname();

  const TAB =
    "px-3 py-1.5 font-dot text-[14px] leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold";

  return (
    <nav
      aria-label="Site"
      className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap"
    >
      {navFor(role).map((item) => {
        const active =
          item.href === "/me"
            ? pathname === "/me"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`${TAB} ${
              active
                ? "bevel-in bg-me-void text-me-gold"
                : "bevel-out bg-me-bar text-me-ink hover:bg-me-edge-hi"
            }`}
          >
            {item.label}
          </Link>
        );
      })}

      {/* Pushed to the far end, the way a board put your account controls
          opposite its board list. */}
      <span className="ml-auto flex items-center gap-2">
        {username ? (
          <>
            <span className="font-dot text-[12px] text-me-dim">
              <span aria-hidden className="mr-1.5 text-me-live">
                ●
              </span>
              {username}
            </span>
            {/* A form, not a link: signing out is a write, and a GET that logs
                you out can be triggered by anything able to make your browser
                fetch a URL. */}
            <form action={signOut}>
              <button
                type="submit"
                className={`${TAB} bevel-out bg-me-bar text-me-ink hover:bg-me-edge-hi`}
              >
                sign out
              </button>
            </form>
          </>
        ) : (
          /* Carries where you are, so signing in puts you back rather than
             somewhere this component picked. Without it the login falls back
             to a default, which for a `meals` account was the one tool it
             cannot open. */
          <Link
            href={`/me/login?next=${encodeURIComponent(pathname)}`}
            className={`${TAB} bevel-out bg-me-bar text-me-ink hover:bg-me-edge-hi`}
          >
            sign in
          </Link>
        )}
      </span>
    </nav>
  );
}
