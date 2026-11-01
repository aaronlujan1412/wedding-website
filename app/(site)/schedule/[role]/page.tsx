import type { Metadata } from "next";
import { ScheduleView } from "@/components/schedule/ScheduleView";
import { ROLES, roleById } from "@/components/schedule/roles";

/** Only the roles in `ROLES` exist; any other `/schedule/<x>` is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return ROLES.map((r) => ({ role: r.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ role: string }>;
}): Promise<Metadata> {
  const { role } = await params;
  const label = roleById(role)?.label;
  // The title is what a texted link previews as, so it says whose it is.
  return { title: `${label} schedule | Savea and Aaron's Wedding` };
}

/**
 * A role's view of the day. `ScheduleView` reads the role from the URL
 * rather than from these params, because switching views in the page
 * rewrites the URL without navigating here.
 */
export default function RoleSchedulePage() {
  return <ScheduleView />;
}
