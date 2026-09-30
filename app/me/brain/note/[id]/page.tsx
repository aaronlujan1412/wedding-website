import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Panel, Well } from "@/components/me/Panel";
import { FullWidth } from "@/components/me/WithSidebar";
import { getNote, resolveLinks } from "@/lib/brain-queries";
import { currentOwner } from "@/lib/site-user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Note",
  robots: { index: false, follow: false },
};

/** `[[Full title of another note]]` — the vault's cross-reference syntax. */
const WIKILINK = /\[\[([^\]]+)\]\]/g;

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await currentOwner())) redirect("/me/brain");

  const { id } = await params;
  const note = await getNote(id);
  if (!note) notFound();

  /*
   * Wikilinks are rewritten to ordinary markdown links BEFORE rendering, so
   * react-markdown needs no plugin and there is no second syntax to parse —
   * the same trick the honeymoon planner's notes tab uses for @mentions. A
   * slug with no note behind it keeps its brackets and stays plain text: this
   * vault has links to notes that were renamed or never written, and inventing
   * a dead link for them would be worse than showing what was typed.
   */
  const targets = [...note.body.matchAll(WIKILINK)].map((m) => m[1]);
  const links = await resolveLinks(targets);
  const body = note.body.replace(WIKILINK, (whole, target: string) => {
    const id = links.get(target);
    // Escape ] and ) so a title containing either can't break out of the link.
    const label = target.replace(/([[\]()])/g, "\\$1");
    return id ? `[${label}](/me/brain/note/${id})` : whole;
  });

  return (
    <FullWidth>
      <Panel title={note.bucket || "root"}>
        <h1 className="text-[15px] leading-snug text-me-gold">
          {note.title ?? note.path}
        </h1>

        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-dot text-[11px] text-me-dim">
          {note.confidence ? <span>{note.confidence}</span> : null}
          {note.tags.map((tag) => (
            <Link
              key={tag}
              href={`/me/brain/notes?tag=${encodeURIComponent(tag)}`}
              className="text-me-link underline"
            >
              #{tag}
            </Link>
          ))}
        </p>

        <div className="me-prose mt-4 max-w-[68ch] border-t-2 border-me-edge-lo pt-4">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              /* Merge react-markdown's own className rather than replacing it:
                 GFM marks a task list's ul and li, and dropping those classes
                 silently removes the bullets from every list with a checkbox
                 in it. */
              h1: ({ className, ...rest }) => (
                <h2 className={`${className ?? ""} font-dot text-[14px] text-me-gold`} {...rest} />
              ),
              h2: ({ className, ...rest }) => (
                <h2 className={`${className ?? ""} font-dot text-[14px] text-me-gold`} {...rest} />
              ),
              h3: ({ className, ...rest }) => (
                <h3 className={`${className ?? ""} font-dot text-[13px] text-me-gold`} {...rest} />
              ),
              ul: ({ className, ...rest }) => (
                <ul className={`${className ?? ""} list-disc space-y-1 pl-5`} {...rest} />
              ),
              ol: ({ className, ...rest }) => (
                <ol className={`${className ?? ""} list-decimal space-y-1 pl-5`} {...rest} />
              ),
              code: ({ className, ...rest }) => (
                <code
                  className={`${className ?? ""} bg-me-void px-1 py-0.5 font-mono text-[0.85em] text-[var(--me-phosphor)]`}
                  {...rest}
                />
              ),
              pre: ({ className, ...rest }) => (
                <pre
                  className={`${className ?? ""} bevel-in rail-scroll overflow-x-auto bg-[var(--me-screen)] p-3 font-mono text-[12px] text-[var(--me-phosphor)]`}
                  {...rest}
                />
              ),
              a: ({ className, ...rest }) => (
                <a className={`${className ?? ""} text-me-link underline`} {...rest} />
              ),
              blockquote: ({ className, ...rest }) => (
                <blockquote
                  className={`${className ?? ""} border-l-2 border-me-edge-hi pl-3 text-me-dim`}
                  {...rest}
                />
              ),
            }}
          >
            {body}
          </ReactMarkdown>
        </div>
      </Panel>

      <Panel title="where this came from">
        <Well>
          <dl className="space-y-2 text-[12px]">
            <div>
              <dt className="font-dot text-me-dim">file</dt>
              <dd className="break-all text-me-ink">{note.path}</dd>
            </div>
            {note.source ? (
              <div>
                <dt className="font-dot text-me-dim">source</dt>
                <dd className="text-me-ink">{note.source}</dd>
              </div>
            ) : null}
            <div>
              <dt className="font-dot text-me-dim">mirrored</dt>
              <dd className="text-me-ink">
                {new Date(note.synced_at).toLocaleString()}
              </dd>
            </div>
          </dl>
        </Well>
        <p className="mt-3 text-[12px] leading-relaxed text-me-dim">
          This is a copy. The note itself lives in the vault on the homelab box,
          and editing happens there — in Obsidian, or through the revision queue.
        </p>
      </Panel>
    </FullWidth>
  );
}
