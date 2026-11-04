import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { cardsFor } from "@/components/helpers/cards";
import { HelperShell } from "@/components/helpers/HelperView";
import { roleById } from "@/components/schedule/roles";

/** The heading and tabs every one of a role's cards shares, so switching
    tabs swaps only the card. */
export default async function RoleHelperLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  const info = roleById(role);
  if (!info || cardsFor(info.id).length === 0) notFound();

  return <HelperShell role={info.id}>{children}</HelperShell>;
}
