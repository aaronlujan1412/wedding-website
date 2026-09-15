import type { Metadata } from "next";
import { LodgingView } from "@/components/honeymoon/LodgingView";
import { getLodgingPage } from "@/lib/honeymoon-queries";

/** Host-only and always live — never prerender it with build-time rows. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lodging",
  robots: { index: false, follow: false },
};

export default async function LodgingPage() {
  const { stays, legs, flights, checklist, rate } = await getLodgingPage();
  // eslint-disable-next-line react-hooks/purity -- a dynamic page's render time is exactly what's wanted
  const renderedAt = Date.now();
  return (
    <LodgingView
      stays={stays}
      legs={legs}
      flights={flights}
      checklist={checklist}
      rate={rate}
      renderedAt={renderedAt}
    />
  );
}
