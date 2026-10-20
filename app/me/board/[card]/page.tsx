import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Panel, Well } from "@/components/me/Panel";
import { FullWidth } from "@/components/me/WithSidebar";
import { Thread } from "@/components/me/board/Thread";
import { ReviewBanner, CardControls } from "@/components/me/board/CardActions";
import { getCard, getThread, getProjectById } from "@/lib/board-queries";
import { currentOwner } from "@/lib/site-user";
import { supabase } from "@/lib/supabase";

/**
 * One card, opened the way a forum opens a thread: its own page, with the
 * posts down it and a way back to the index.
 *
 * A page rather than a dialog because a thread is a reading surface — it grows
 * every time Claude works on the card, and the whole point is that it stays
 * readable months later. A dialog would cramp it, and a card's URL is worth
 * having anyway.
 *
 * Signed out this redirects rather than showing a public face. The board's
 * index explains what the tool is; one card out of context explains nothing
 * and would only leak what is on it.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ card: string }>;
}): Promise<Metadata> {
  const { card: id } = await params;
  const card = await getCard(id);
  return { title: card ? card.title : "Card" };
}

export default async function CardPage({
  params,
}: {
  params: Promise<{ card: string }>;
}) {
  if (!(await currentOwner())) redirect("/me/board");

  const { card: id } = await params;
  const card = await getCard(id);
  if (!card) notFound();

  const [thread, project, { data: columns }] = await Promise.all([
    getThread(id),
    // The card's own project. Reading "the current project" here would check
    // the lock on whichever board was last opened, which is the wrong answer
    // the moment there are two.
    getProjectById(card.project_id),
    supabase
      .from("board_columns")
      .select("*")
      .eq("project_id", card.project_id)
      .order("position"),
  ]);

  const column = columns?.find((c) => c.id === card.column_id);
  // Where an accepted "this is done" sends the card: the first column the
  // agent cannot enter. On the seeded set that is Done, and naming it by its
  // flag rather than its key means a renamed column still works.
  const doneColumn = columns?.find((c) => !c.agent_can_enter);

  const openQuestions = thread.filter(
    (t) => t.kind === "question" && t.status === "open",
  ).length;

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

      <Panel title={card.title}>
        {card.summary ? (
          <Well className="mb-3">
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-me-ink">
              {card.summary}
            </p>
            <p className="mt-1.5 font-dot text-[11px] leading-none text-me-dim">
              where this stands
            </p>
          </Well>
        ) : null}

        {card.body ? (
          <p className="mb-3 whitespace-pre-wrap text-[13px] leading-relaxed text-me-ink">
            {card.body}
          </p>
        ) : null}

        <p className="mb-3 flex flex-wrap items-baseline gap-x-2 text-[12px] text-me-dim">
          {column ? <span className="text-me-gold">{column.name}</span> : null}
          {card.labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </p>

        <CardControls card={card} />
      </Panel>

      {card.review_kind ? (
        <ReviewBanner card={card} doneColumn={doneColumn} />
      ) : null}

      <Panel
        title={
          openQuestions > 0
            ? `thread — ${openQuestions} waiting on you`
            : "thread"
        }
      >
        <Thread items={thread} cardId={card.id} projectId={card.project_id} />
      </Panel>

      {project?.locked_at ? (
        <p className="px-1 text-[12px] text-me-gold">
          This project is locked — Claude cannot change anything on it.
        </p>
      ) : null}
    </FullWidth>
  );
}
