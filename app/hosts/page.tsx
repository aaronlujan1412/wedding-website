import type { Metadata } from "next";
import { HostLoginForm } from "@/components/hosts/HostLoginForm";
import { safeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Hosts",
  robots: { index: false, follow: false },
};

export default async function HostsPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
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
