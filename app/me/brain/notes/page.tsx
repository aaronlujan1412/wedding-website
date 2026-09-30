import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Panel } from "@/components/me/Panel";
import { NoteList } from "@/components/me/NoteList";
import { SearchBox } from "@/components/me/SearchBox";
import { FullWidth } from "@/components/me/WithSidebar";
import { getTags, searchNotes } from "@/lib/brain-queries";
import { currentOwner } from "@/lib/site-user";

export const metadata: Metadata = {
  title: "Notes",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PER_PAGE = 25;

type Params = {
  q?: string;
  bucket?: string;
  tag?: string;
  staged?: string;
  page?: string;
};

/** Keeps the filters you already set while changing one of them. */
function withParams(current: Params, changes: Params): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...changes })) {
    if (value) next.set(key, value);
  }
  const query = next.toString();
  return query ? `/me/brain/notes?${query}` : "/me/brain/notes";
}

/**
 * Browse and search, which on this vault are the same screen with the query
 * box empty or full.
 *
 * Signed out there is nothing to show — a list of note titles IS the private
 * part — so this route redirects rather than rendering a second face. The
 * public story lives on /me/brain, which is the page worth linking to anyway.
 */
export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  if (!(await currentOwner())) redirect("/me/brain");

  const params = await searchParams;
  const staged = params.staged === "1";
  const page = Math.max(1, Number(params.page) || 1);

  const [{ notes, total }, tags] = await Promise.all([
    searchNotes({
      query: params.q,
      bucket: params.bucket,
      tag: params.tag,
      staged,
      limit: PER_PAGE,
      offset: (page - 1) * PER_PAGE,
    }),
    getTags(24),
  ]);

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const filtered = Boolean(params.q || params.bucket || params.tag);

  return (
    <FullWidth>
      <Panel title={staged ? "inbox" : "notes"}>
        <SearchBox defaultValue={params.q ?? ""} />

        <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-me-dim">
          <span>
            {total.toLocaleString()} {total === 1 ? "note" : "notes"}
            {params.bucket ? ` in ${params.bucket}` : ""}
            {params.tag ? ` tagged #${params.tag}` : ""}
            {params.q ? ` matching “${params.q}”` : ""}
          </span>
          {filtered ? (
            <Link
              href={staged ? "/me/brain/notes?staged=1" : "/me/brain/notes"}
              className="text-me-link underline"
            >
              clear
            </Link>
          ) : null}
          <Link
            href={staged ? "/me/brain/notes" : "/me/brain/notes?staged=1"}
            className="text-me-link underline"
          >
            {staged ? "back to the brain" : "show the inbox"}
          </Link>
        </p>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
        <Panel title={params.q ? "results" : "all notes"}>
          <NoteList
            notes={notes}
            empty={
              params.q
                ? "No note matches that, by word or by fragment."
                : "Nothing here yet."
            }
          />

          {pages > 1 ? (
            <nav
              aria-label="Pages"
              className="mt-4 flex items-center justify-between gap-3 border-t-2 border-me-edge-lo pt-3"
            >
              {page > 1 ? (
                <Link
                  href={withParams(params, { page: String(page - 1) })}
                  className="bevel-out bg-me-bar px-3 py-1.5 font-dot text-[13px] leading-none text-me-ink hover:bg-me-edge-hi"
                >
                  &laquo; back
                </Link>
              ) : (
                <span />
              )}
              <span className="font-dot text-[12px] text-me-dim">
                page {page} of {pages}
              </span>
              {page < pages ? (
                <Link
                  href={withParams(params, { page: String(page + 1) })}
                  className="bevel-out bg-me-bar px-3 py-1.5 font-dot text-[13px] leading-none text-me-ink hover:bg-me-edge-hi"
                >
                  next &raquo;
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </Panel>

        <Panel title="tags">
          <ul className="flex flex-wrap gap-x-3 gap-y-1.5 text-[12px]">
            {tags.map(({ tag, count }) => (
              <li key={tag}>
                <Link
                  href={withParams(params, {
                    tag: params.tag === tag ? undefined : tag,
                    page: undefined,
                  })}
                  className={
                    params.tag === tag
                      ? "text-me-gold underline"
                      : "text-me-link underline"
                  }
                >
                  #{tag}
                </Link>
                <span className="ml-1 text-me-dim">{count}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </FullWidth>
  );
}
