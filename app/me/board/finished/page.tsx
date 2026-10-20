import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Panel, Well } from "@/components/me/Panel";
import { FullWidth } from "@/components/me/WithSidebar";
import { ReviveButton } from "@/components/me/board/ReviveButton";
import { currentOwner } from "@/lib/site-user";
import { supabase } from "@/lib/supabase";

/**
 * Finished projects.
 *
 * One entry per archived project, each holding the whole document rather than
 * a link to it — these are short, and a list of titles you have to click
 * through is a list nobody reads. The reason this exists is the six-months-
 * later question, and that is answered by skimming, not by navigating.
 */

export const metadata: Metadata = { title: "Finished projects" };
export const dynamic = "force-dynamic";

export default async function FinishedPage() {
  if (!(await currentOwner())) redirect("/me/board");

  const { data: archives } = await supabase
    .from("board_archives")
    .select("*")
    .order("finished_at", { ascending: false });

  return (
    <FullWidth>
      <p className="px-1 text-[12px]">
        <Link
          href="/me/board"
          className="text-me-link underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-me-gold"
        >
          <span aria-hidden className="text-me-gold">
            &laquo;
          </span>{" "}
          Back to the board
        </Link>
      </p>

      {!archives?.length ? (
        <Panel title="finished projects">
          <p className="text-[13px] leading-relaxed text-me-dim">
            Nothing finished yet. Archiving a project from its settings writes
            it into one document and files it here.
          </p>
        </Panel>
      ) : (
        archives.map((archive) => (
          <Panel
            key={archive.id}
            title={`${archive.name} — finished ${archive.finished_at.slice(0, 10)}`}
          >
            <p className="mb-2 text-[12px] text-me-dim">
              {archive.card_count} card{archive.card_count === 1 ? "" : "s"}
              {archive.brain_path ? ` · filed at ${archive.brain_path}` : ""}
            </p>

            <Well>
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-forum text-[12px] leading-relaxed text-me-ink">
                {archive.summary}
              </pre>
            </Well>

            <div className="mt-2">
              <ReviveButton archiveId={archive.id} name={archive.name} />
            </div>
          </Panel>
        ))
      )}
    </FullWidth>
  );
}
