import type { Metadata } from "next";
import { FirstDance } from "@/components/first-dance/FirstDance";
import { trainingWeek } from "@/lib/first-dance";

export const metadata: Metadata = {
  title: "First Dance",
  robots: { index: false, follow: false },
};

/**
 * Which week of the plan it is has to be settled on the server, or the first
 * client render disagrees with the HTML and the page fails hydration on any
 * day the build happened to straddle.
 */
export const dynamic = "force-dynamic";

/**
 * Outside app/(site) for the same reason the honeymoon planner is: the guest
 * navbar and footer are no use to the two people using this, and this page in
 * particular is read from several feet away while both of them are moving.
 */
export default function FirstDancePage() {
  return <FirstDance week={trainingWeek()} />;
}
