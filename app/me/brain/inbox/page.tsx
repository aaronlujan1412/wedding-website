import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Panel, Well } from "@/components/me/Panel";
import { InboxCard } from "@/components/me/InboxCard";
import { FullWidth } from "@/components/me/WithSidebar";
import { getDecisionLog, getInbox } from "@/lib/brain-queries";
import { currentBrainUser } from "@/lib/brain-user";

export const metadata: Metadata = {
  title: "Inbox",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The review queue.
 *
 * The vault's rule is that a note becomes part of the brain only when a human
 * moves it. This page is that human, at a distance: approving writes to a queue
 * the homelab box drains on its next check, and the box is still the only thing
 * that touches a file.
 *
 * Nothing here is public — a list of what is waiting to be let in is as private
 * as the notes themselves — so signed out this redirects to the write-up
 * instead of rendering a second face.
 */
export default async function InboxPage() {
  if (!(await currentBrainUser())) redirect("/me/brain");

  const [queue, log] = await Promise.all([getInbox(), getDecisionLog(20)]);
  const waiting = queue.filter((entry) => !entry.pending);

  return (
    <FullWidth>
      <Panel title="inbox">
        <p className="text-[13px] leading-relaxed text-me-ink">
          {queue.length === 0 ? (
            <>
              Nothing staged. Notes land here when the workstation files them or
              an agent writes one, and they stay out of search until you let
              them in.
            </>
          ) : (
            <>
              {queue.length} {queue.length === 1 ? "note" : "notes"} staged,{" "}
              {waiting.length} still to decide. Approving moves the file into a
              bucket; rejecting moves it to <code>_rejected/</code>. Neither
              deletes anything.
            </>
          )}
        </p>
      </Panel>

      {queue.length > 0 ? (
        <Panel title="waiting on you">
          <div className="space-y-3">
            {queue.map((entry) => (
              <InboxCard key={entry.id} entry={entry} />
            ))}
          </div>
        </Panel>
      ) : null}

      {log.length > 0 ? (
        <Panel title="decided">
          <ul className="space-y-2">
            {log.map((decision) => (
              <li key={decision.id}>
                <Well>
                  <p className="text-[13px] leading-snug text-me-ink">
                    {decision.note_title ?? decision.path}
                  </p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-dot text-[11px]">
                    <span
                      className={
                        decision.decision === "approve"
                          ? "text-me-gold"
                          : "text-me-dim"
                      }
                    >
                      {decision.decision === "approve"
                        ? `approved → ${decision.destination}`
                        : "rejected"}
                    </span>
                    <span
                      className={
                        decision.state === "failed"
                          ? "text-me-live"
                          : "text-me-dim"
                      }
                    >
                      {decision.state === "applied"
                        ? "done"
                        : decision.state === "failed"
                          ? `failed — ${decision.error}`
                          : "waiting for the box"}
                    </span>
                    <span className="text-me-dim">
                      {new Date(decision.decided_at).toLocaleString()}
                    </span>
                  </p>
                </Well>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </FullWidth>
  );
}
