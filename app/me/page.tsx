import Link from "next/link";
import { Panel } from "@/components/me/Panel";
import { ME_LINKS, isExternal } from "@/components/me/links";

/** The rest of the site, said in the order you'd want to read it. */
const PAGES = [
  {
    href: "/me/about",
    label: "About me",
    blurb:
      "How I got here and how I think about building things, which is mostly: work out what the data really is first.",
  },
  {
    href: "/me/second-brain",
    label: "Second Brain",
    blurb:
      "3,400 notes and the search service I wrote to get at them. The longest thing on this site, and the one I'd read.",
  },
];

export default function MePage() {
  return (
    <>
      <Panel title="welcome">
        <div className="me-prose">
          <p>
            I like the unglamorous parts: the data model, the edge case, the
            thing that still has to work in a year. Angular and C# by trade;
            lately TypeScript, Next.js and Postgres.
          </p>
          <p>
            This site is built the way sites were when I first liked being on
            one — a banner, a ticker, a profile card that follows you around,
            and a row of buttons at the bottom telling you what it runs on.
            None of that is a joke at the era&apos;s expense. It was a good way
            to make a page feel like it belonged to somebody.
          </p>
        </div>
      </Panel>

      <Panel title="what's here">
        <ul className="space-y-3">
          {PAGES.map((page) => (
            <li key={page.href}>
              <Link
                href={page.href}
                className="text-[13px] text-me-link underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
              >
                <span aria-hidden className="text-me-gold">
                  &raquo;
                </span>{" "}
                {page.label}
              </Link>
              <p className="mt-1 text-[13px] leading-relaxed text-me-ink">
                {page.blurb}
              </p>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="elsewhere">
        <ul className="space-y-2.5">
          {ME_LINKS.map((link) => (
            <li key={link.href} className="flex flex-wrap items-baseline gap-x-2">
              <a
                href={link.href}
                {...(isExternal(link.href)
                  ? { target: "_blank", rel: "noreferrer" }
                  : {})}
                className="text-[13px] text-me-link underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
              >
                <span aria-hidden className="text-me-gold">
                  &raquo;
                </span>{" "}
                {link.label}
              </a>
              <span className="text-[12px] break-all text-me-dim">
                {link.detail}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
