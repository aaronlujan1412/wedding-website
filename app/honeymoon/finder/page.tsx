import type { Metadata } from "next";
import { FinderView } from "@/components/honeymoon/FinderView";
import { getFinderPage } from "@/lib/honeymoon-queries";

/** Host-only and always live — never prerender it with build-time rows. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lodging finder",
  robots: { index: false, follow: false },
};

export default async function FinderPage() {
  const { routes, decided, rate } = await getFinderPage();
  return <FinderView routes={routes} decided={decided} rate={rate} />;
}
