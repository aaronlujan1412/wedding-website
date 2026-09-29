import type { Metadata } from "next";
import { Panel } from "@/components/me/Panel";
import { SecondBrainCaseStudy } from "@/components/me/SecondBrainCaseStudy";
import { FullWidth, WithSidebar } from "@/components/me/WithSidebar";
import { currentBrainUser } from "@/lib/brain-user";

export const metadata: Metadata = {
  title: "Second Brain",
  description:
    "A self-hosted retrieval service over ~3,400 markdown notes, served to any AI client over MCP.",
};

/** Always live: what it renders depends on who is asking. */
export const dynamic = "force-dynamic";

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
 * The second guarantee is structural and lives in the query layer: every
 * function that reads real note data checks the session itself, so a page
 * cannot reach it by mistake even if someone forgets this comment.
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

  return (
    <FullWidth>
      <Panel title="second brain">
        <p className="text-[13px] text-me-ink">
          Signed in as <span className="text-me-gold">{user.username}</span>.
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-me-dim">
          Nothing is mirrored here yet — the vault, the inbox queue and search
          come next. This page exists to prove the gate works.
        </p>
      </Panel>
    </FullWidth>
  );
}
