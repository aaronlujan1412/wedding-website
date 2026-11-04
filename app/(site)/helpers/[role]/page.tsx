import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cardsFor } from "@/components/helpers/cards";
import { canSeeFaces, loadFaces } from "@/components/helpers/faces";
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

/**
 * A role's lists and notes. Its schedule is `/schedule/<role>`.
 *
 * A page with who's who reads the cookies, so it renders per request; the
 * faces are fetched only after the code checks out, never to be hidden later.
 */
export default async function RoleHelperPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  const info = roleById(role);
  if (!info) notFound();

  const hasFaces = cardsFor(info.id).some((card) => card.id === "faces");
  const faces = hasFaces && (await canSeeFaces()) ? await loadFaces() : null;

  return <HelperView role={info.id} faces={faces} />;
}
