import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Panel } from "@/components/me/Panel";
import { WithSidebar } from "@/components/me/WithSidebar";
import { BrainLoginForm } from "@/components/me/BrainLoginForm";
import { currentBrainUser } from "@/lib/brain-user";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

/** Always live: it branches on a cookie, so a cached copy would be wrong. */
export const dynamic = "force-dynamic";

/**
 * The way into the SecondBrain.
 *
 * It cannot go behind `proxy.ts` — the proxy redirects here, so gating it would
 * loop — which is why it checks the session itself, exactly as `/hosts` does.
 */
export default async function BrainLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = safeRedirectPath(next, "/me/brain");

  // Already signed in: no reason to show a form. Straight through.
  if (await currentBrainUser()) redirect(target);

  return (
    <WithSidebar>
      <Panel title="sign in">
      <p className="mb-4 text-[13px] leading-relaxed text-me-ink">
        The notes behind here are the whole vault, so this one is a real
        account rather than the site&apos;s shared passphrase.
      </p>
      <BrainLoginForm next={target} />
      </Panel>
    </WithSidebar>
  );
}
