import type { Metadata } from "next";
import { Panel, Well } from "@/components/me/Panel";
import { WithSidebar, FullWidth } from "@/components/me/WithSidebar";
import { Board } from "@/components/me/board/Board";
import { getBoard } from "@/lib/board-queries";
import { currentOwner } from "@/lib/site-user";

/**
 * The board.
 *
 * Dual-mode like every tool under /me: signed out it is a write-up of what the
 * thing is, signed in it is the thing. The decision is made here, before
 * anything fetches — `getBoard` returns null for a viewer who is not the
 * owner, so the public face is what is left rather than something that leaked.
 */

export const metadata: Metadata = {
  title: "Board",
  description:
    "A shared work queue for me and the agent I work with. The Kanban is the view; the job is context handoff.",
};

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const owner = await currentOwner();
  const board = owner ? await getBoard() : null;

  if (!board) {
    return (
      <WithSidebar>
        <Panel title="the board">
          <div className="me-prose">
            <p>
              A shared work queue for me and the agent I build things with. It
              looks like a Kanban board because that is the easiest way to see
              one, but the Kanban is not the point.
            </p>
            <p>
              The point is that a conversation with an AI starts from nothing
              every time. Ask it to pick up something you discussed last week
              and you are retyping the background before you get anywhere. So
              the background lives on the card: what was tried, what it found,
              what it is waiting on me to decide. A session reads the card and
              starts where the last one stopped.
            </p>
            <p>
              The agent writes to this board through an API. It can move cards
              and post what it found, freely and without asking. It cannot
              delete anything and it cannot declare anything finished — both of
              those raise a flag I clear when I get to it. There is also a lock,
              which is the version of that for a card I want left alone
              entirely.
            </p>
          </div>
        </Panel>
      </WithSidebar>
    );
  }

  return (
    <FullWidth>
      <Panel title={board.project.name} bodyClassName="p-2">
        {board.project.description ? (
          <p className="px-1 pb-2 text-[13px] text-me-dim">
            {board.project.description}
          </p>
        ) : null}
        <Board project={board.project} lanes={board.lanes} />
      </Panel>

      {board.flagged.length > 0 ? (
        <Panel title="waiting on you">
          <Well>
            <ul className="space-y-2">
              {board.flagged.map((card) => (
                <li key={card.id} className="text-[13px] leading-snug">
                  <span className="text-me-ink">{card.title}</span>
                  <span className="block text-[12px] text-me-live">
                    {card.review_note}
                  </span>
                </li>
              ))}
            </ul>
          </Well>
          <p className="mt-2 text-[12px] text-me-dim">
            Nothing here has happened. Each one is something Claude proposed and
            stopped at.
          </p>
        </Panel>
      ) : null}
    </FullWidth>
  );
}
