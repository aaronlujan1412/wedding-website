import type { Metadata } from "next";
import { TransitView } from "@/components/honeymoon/TransitView";
import { getTransitPage } from "@/lib/honeymoon-queries";

/** Host-only and always live — never prerender it with build-time rows. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Transit",
  robots: { index: false, follow: false },
};

export default async function TransitPage() {
  const { transit, legs, checklist, rate } = await getTransitPage();
  return (
    <TransitView
      transit={transit}
      legs={legs}
      checklist={checklist}
      rate={rate}
    />
  );
}
