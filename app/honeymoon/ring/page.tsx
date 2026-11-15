import type { Metadata } from "next";
import { RingView } from "@/components/honeymoon/RingView";
import { getRingPage } from "@/lib/honeymoon-queries";

/** Host-only and always live — never prerender it with build-time rows. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ring",
  robots: { index: false, follow: false },
};

export default async function RingPage() {
  const { songs, bouts } = await getRingPage();

  return <RingView songs={songs} bouts={bouts} />;
}
