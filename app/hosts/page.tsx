import type { Metadata } from "next";
import { cookies } from "next/headers";
import { HostLoginForm } from "@/components/hosts/HostLoginForm";
import { HostHub } from "@/components/hosts/HostHub";
import { HOST_COOKIE, isValidSessionToken } from "@/lib/admin-session";
import { getHostSummary } from "@/lib/host-summary";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Hosts",
  robots: { index: false, follow: false },
};

/**
 * Doubles as the login screen and, once signed in, the hub the back-of-house
 * pages hang off. It cannot go behind `proxy.ts` — the proxy redirects here,
 * so gating it would loop — which is why it checks the session itself.
 */
export default async function HostsPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const store = await cookies();
  if (await isValidSessionToken(store.get(HOST_COOKIE)?.value)) {
    const summary = await getHostSummary();
    return <HostHub {...summary} />;
  }

  const { next } = await searchParams;
  const target = safeRedirectPath(next);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 pt-40 pb-24">
      <p className="font-raleway text-xs uppercase tracking-[0.3em] text-muted-foreground">
        Back of house
      </p>
      <h1 className="mt-2 font-corinthia text-6xl text-pop">Hosts only</h1>
      <p className="mt-3 font-garamond text-lg leading-relaxed text-foreground/90">
        The guest ledger holds everyone&apos;s phone numbers, so it stays behind
        a passphrase.
      </p>

      <HostLoginForm next={target} />
    </main>
  );
}
