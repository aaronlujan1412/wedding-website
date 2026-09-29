import type { Metadata } from "next";
import Link from "next/link";
import { Panel, Well } from "@/components/me/Panel";
import { NoteList } from "@/components/me/NoteList";
import { SearchBox } from "@/components/me/SearchBox";
import { SecondBrainCaseStudy } from "@/components/me/SecondBrainCaseStudy";
import { FullWidth, WithSidebar } from "@/components/me/WithSidebar";
import { getBrainStats, getRecentNotes } from "@/lib/brain-queries";
import { currentBrainUser } from "@/lib/brain-user";

export const metadata: Metadata = {
  title: "Second Brain",
  description:
    "A self-hosted retrieval service over ~3,400 markdown notes, served to any AI client over MCP.",
};

/** Always live: what it renders depends on who is asking. */
export const dynamic = "force-dynamic";

/** "3 minutes ago", down to the unit that still means something. */
function since(iso: string | null): string {
  if (!iso) return "never";
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const [value, unit] =
    seconds < 90
      ? [seconds, "second"]
      : seconds < 5400
        ? [seconds / 60, "minute"]
        : seconds < 129600
          ? [seconds / 3600, "hour"]
          : [seconds / 86400, "day"];
  const n = Math.round(value);
  return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
}

/**
 * One route, two faces.
 *
 * Signed out this is a portfolio page — what the thing is and why it is built
 * that way — and a demo will go under the write-up later. Signed in it is the
 * tool itself. Same URL either way, so a link to it works for anybody.
 *
 * THE RULE THAT KEEPS THIS SAFE: branch first, fetch second. Never fetch real
 * rows and then decide whether to render them. React 19's dev mode ships
 * server-component props to the browser as debug data, so
 * `const notes = await getNotes(); return user ? <Real/> : <Demo/>` would put
 * every one of those notes in the page payload of a page nobody signed in to.
 * The vault is behind this, so that is not a theoretical tidiness point.
 *
 * The second guarantee is structural and lives in `lib/brain-queries.ts`: every
 * function that reads a note checks the session itself, so a page cannot reach
 * one by mistake even if someone forgets this comment.
 */
export default async function BrainPage() {
  const user = await currentBrainUser();

  if (!user) {
    return (
      <WithSidebar>
        <SecondBrainCaseStudy />
      </WithSidebar>
    );
  }

  const [stats, recent] = await Promise.all([getBrainStats(), getRecentNotes(6)]);

  return (
    <FullWidth>
      <Panel title="search the brain">
        <SearchBox autoFocus />
        <p className="mt-2.5 text-[12px] text-me-dim">
          Keyword and substring, both at once — so a stemmed word and a literal
          like <code className="text-me-ink">pam_faillock</code> both land.
        </p>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <Panel title="recently changed">
          <NoteList notes={recent} empty="Nothing mirrored yet." />
          <Link
            href="/me/brain/notes"
            className="mt-3 inline-block text-[13px] text-me-link underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
          >
            <span aria-hidden className="text-me-gold">
              &raquo;
            </span>{" "}
            browse everything
          </Link>
        </Panel>

        <div className="space-y-3">
          <Panel title="the vault">
            {stats ? (
              <>
                <p className="font-dot text-[26px] leading-none text-me-gold">
                  {stats.total.toLocaleString()}
                </p>
                <p className="mt-1 font-dot text-[11px] text-me-dim">
                  notes mirrored
                </p>

                <dl className="mt-3 space-y-1.5 border-t-2 border-me-edge-lo pt-3 text-[12px]">
                  {stats.buckets.map(({ bucket, count }) => (
                    <div key={bucket} className="flex justify-between gap-3">
                      <dt>
                        <Link
                          href={`/me/brain/notes?bucket=${encodeURIComponent(bucket)}`}
                          className="text-me-link underline"
                        >
                          {bucket || "root"}
                        </Link>
                      </dt>
                      <dd className="tabular-nums text-me-dim">{count}</dd>
                    </div>
                  ))}
                </dl>

                <p className="mt-3 border-t-2 border-me-edge-lo pt-3 font-dot text-[11px] text-me-dim">
                  synced {since(stats.lastSynced)}
                </p>
              </>
            ) : (
              <p className="text-[13px] text-me-dim">Couldn&apos;t read the mirror.</p>
            )}
          </Panel>

          <Panel title="inbox">
            {stats && stats.staged > 0 ? (
              <Well>
                <p className="font-dot text-[22px] leading-none text-me-gold">
                  {stats.staged}
                </p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-me-ink">
                  {stats.staged === 1 ? "note is" : "notes are"} waiting to be
                  let into the brain.
                </p>
                <Link
                  href="/me/brain/inbox"
                  className="mt-2 inline-block text-[12px] text-me-link underline"
                >
                  <span aria-hidden className="text-me-gold">
                    &raquo;
                  </span>{" "}
                  review them
                </Link>
              </Well>
            ) : (
              <p className="text-[13px] text-me-dim">
                Nothing staged. Notes land here when the workstation files them
                or an agent writes one.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </FullWidth>
  );
}
