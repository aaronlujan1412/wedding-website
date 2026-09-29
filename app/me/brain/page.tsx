import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Panel } from "@/components/me/Panel";
import { SignOutButton } from "@/components/me/SignOutButton";
import { currentBrainUser } from "@/lib/brain-user";

export const metadata: Metadata = {
  title: "Second Brain",
  robots: { index: false, follow: false },
};

/** Always live: what it renders depends on who is asking. */
export const dynamic = "force-dynamic";

/**
 * Placeholder hub. `proxy.ts` has already checked the cookie's signature to get
 * anyone this far; this re-reads it against the database, which is what catches
 * a deleted account or a revoked session.
 */
export default async function BrainHome() {
  const user = await currentBrainUser();

  /*
   * A signature the proxy accepted but the database rejects: the account was
   * deleted, or its sessions were revoked. Straight to the login rather than a
   * "you are signed out" panel, so a revoked session behaves exactly like no
   * session at all — one fewer state to think about, and the cookie gets
   * cleared on the way through.
   */
  if (!user) redirect("/me/login?next=/me/brain");

  return (
    <Panel title="second brain">
      <p className="text-[13px] text-me-ink">
        Signed in as <span className="text-me-gold">{user.username}</span>.
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-me-dim">
        Nothing is mirrored here yet — the vault, the inbox queue and search
        come next. This page exists to prove the gate works.
      </p>
      <div className="mt-4">
        <SignOutButton />
      </div>
    </Panel>
  );
}
