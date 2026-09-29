import type { Metadata } from "next";
import { Panel, Well } from "@/components/me/Panel";
import {
  SB_RETRIEVAL,
  SB_SAFETY,
  SB_SPEC,
  type Decision,
} from "@/components/me/second-brain";

export const metadata: Metadata = {
  title: "Second Brain",
  description:
    "A self-hosted retrieval service over ~3,400 markdown notes, served to any AI client over MCP.",
};

/* Shown on the same screen as the avatar, in the same phosphor. */
const PIPELINE = `question
   +-- keyword search --+
   |                    +-- fuse -- 100 -- rerank -- diversify -- 8
   +-- vector search ---+`;

/**
 * One decision per quote box. Not numbered: these are reasons, and numbering
 * them would promise an order they don't have.
 */
function Decisions({ items }: { items: Decision[] }) {
  return (
    <ul className="space-y-3">
      {items.map((d) => (
        <li key={d.claim}>
          <Well>
            <h3 className="font-dot text-[14px] leading-snug text-me-gold">
              {d.claim}
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-me-ink">
              {d.because}
            </p>
          </Well>
        </li>
      ))}
    </ul>
  );
}

export default function SecondBrainPage() {
  return (
    <>
      <Panel title="second brain">
        <div className="me-prose">
          <p>
            Everything I&apos;ve worked out and didn&apos;t want to work out
            twice, kept as ~3,400 markdown notes and served to any AI client as
            a search tool it can call mid-answer.
          </p>
          <p>
            The premise is that the expensive part of knowing something is
            rediscovering it. A framework behaviour that took an afternoon to
            pin down is worth exactly one sentence six months later, and that
            sentence is never in the code.
          </p>
          <p>
            So each note is <strong>one claim</strong>, and the title is that
            claim written as a full sentence rather than a topic — &ldquo;X does
            Y, so Z&rdquo; rather than &ldquo;Docker notes&rdquo;. The body
            carries the detail that gets forgotten: the flag, the number, the
            exact error string. That format is the only reason retrieval works
            at this size; a vault of topic-shaped documents returns topic-shaped
            answers.
          </p>
        </div>
      </Panel>

      <Panel title="one search">
        {/* Its own scroller: the diagram is wider than a phone, and the page
            body must never scroll sideways. */}
        <div className="bevel-in rail-scroll overflow-x-auto bg-[var(--me-screen)] p-3">
          <pre className="w-max font-mono text-[11px] leading-relaxed text-[var(--me-phosphor)] sm:text-xs">
            {PIPELINE}
          </pre>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-me-ink">
          Six to eight seconds, nearly all of it the reranker. Eight results it
          has actually read beat thirty it hasn&apos;t.
        </p>
      </Panel>

      <Panel title="at a glance">
        <dl className="space-y-2.5">
          {SB_SPEC.map(([field, value]) => (
            <div key={field} className="sm:flex sm:gap-4">
              <dt className="font-dot text-[13px] text-me-gold sm:w-28 sm:shrink-0">
                {field.toLowerCase()}
              </dt>
              <dd className="text-[13px] text-me-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title="why the search is built this way">
        <Decisions items={SB_RETRIEVAL} />
      </Panel>

      <Panel title="why you can trust what it says">
        <Decisions items={SB_SAFETY} />
      </Panel>
    </>
  );
}
