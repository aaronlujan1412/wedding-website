import type { Metadata } from "next";
import { HoneymoonBoard } from "@/components/honeymoon/HoneymoonBoard";
import { getTripBoard } from "@/lib/honeymoon-queries";

/** Host-only and always live — never prerender it with build-time rows. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Honeymoon",
  robots: { index: false, follow: false },
};

export default async function HoneymoonPage() {
  const board = await getTripBoard();
  return <HoneymoonBoard board={board} />;
}
