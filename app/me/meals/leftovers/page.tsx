import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Panel } from "@/components/me/Panel";
import { Leftovers } from "@/components/me/Leftovers";
import { FullWidth } from "@/components/me/WithSidebar";
import { getLeftovers } from "@/lib/meal-queries";
import { currentUser } from "@/lib/site-user";

export const metadata: Metadata = { title: "Leftovers", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LeftoversPage() {
  if (!(await currentUser())) redirect("/me/meals");
  const rows = await getLeftovers();

  return (
    <FullWidth>
      <Panel title="leftovers">
        <Leftovers rows={rows} />
      </Panel>
    </FullWidth>
  );
}
