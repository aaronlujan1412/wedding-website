import { notFound, redirect } from "next/navigation";
import { cardsFor, helpersHref } from "@/components/helpers/cards";
import { ROLES, roleById } from "@/components/schedule/roles";

/** Only roles with a card have a page; anything else is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return ROLES.filter((r) => cardsFor(r.id).length > 0).map((r) => ({
    role: r.id,
  }));
}

/** `/helpers/<role>` is the link the schedule gives out; it opens the
    role's first tab. */
export default async function RoleHelperPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  const info = roleById(role);
  const first = info && cardsFor(info.id)[0];
  if (!info || !first) notFound();

  redirect(helpersHref(info.id, { card: first.id }));
}
