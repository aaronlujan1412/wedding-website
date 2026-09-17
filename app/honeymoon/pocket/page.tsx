import { redirect } from "next/navigation";

/** Like every planner page: decided per request, behind the host gate. */
export const dynamic = "force-dynamic";

/**
 * Pocket was the Itinerary drawn a second time for paper. It's one page now —
 * printing the Itinerary makes the pocket copy — so an old bookmark or a phone
 * that still has this tab open lands there.
 */
export default function PocketPage() {
  redirect("/honeymoon/itinerary");
}
