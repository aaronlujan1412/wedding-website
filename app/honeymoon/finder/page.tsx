import { redirect } from "next/navigation";

/** Like every planner page: decided per request, behind the host gate. */
export const dynamic = "force-dynamic";

/**
 * The finder was the trip's nights drawn a fourth time, on a tab of its own.
 * Its routes are rows on the Lodging strip now, and its places are options in
 * the list of nights, so an old bookmark lands there.
 */
export default function FinderPage() {
  redirect("/honeymoon/lodging");
}
