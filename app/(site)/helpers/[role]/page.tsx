import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cardsFor } from "@/components/helpers/cards";
import { HelperView } from "@/components/helpers/HelperView";
import { ROLES, roleById } from "@/components/schedule/roles";

/** Only roles with a card have a page; anything else is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return ROLES.filter((r) => cardsFor(r.id).length > 0).map((r) => ({
    role: r.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ role: string }>;
}): Promise<Metadata> {
  const { role } = await params;
  const label = roleById(role)?.label;
  return { title: `${label} helper page | Savea and Aaron's Wedding` };
}

/** A role's lists and notes. Its schedule is `/schedule/<role>`. */
export default async function RoleHelperPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  const info = roleById(role);
  if (!info) notFound();

  return <HelperView role={info.id} />;
}
