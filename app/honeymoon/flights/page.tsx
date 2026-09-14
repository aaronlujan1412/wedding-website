import type { Metadata } from "next";
import { FlightsView } from "@/components/honeymoon/FlightsView";
import { getFlightsPage } from "@/lib/honeymoon-queries";

/** Host-only and always live — never prerender it with build-time rows. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Flights",
  robots: { index: false, follow: false },
};

export default async function FlightsPage() {
  const { flights, checklist, rate } = await getFlightsPage();
  // eslint-disable-next-line react-hooks/purity -- a dynamic page's render time is exactly what's wanted
  const renderedAt = Date.now();
  return (
    <FlightsView
      flights={flights}
      checklist={checklist}
      rate={rate}
      renderedAt={renderedAt}
    />
  );
}
