import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  STAFF_ROLES,
  cardsOn,
  helpersHref,
  isStaff,
} from "@/components/helpers/cards";
import { HelperPage } from "@/components/helpers/HelperView";

/*
 * The segment after `/helpers` is one of two things, because Next allows one
 * dynamic name per level: a tab of the open page (`/helpers/food`), or a
 * staff role's page (`/helpers/coordinator`), whose tabs are a level down.
 * Card ids and staff role ids never overlap; anything else is a 404.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return [
    ...cardsOn(null).map((card) => ({ slug: card.id })),
    ...STAFF_ROLES.map((role) => ({ slug: role.id })),
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const card = cardsOn(null).find((c) => c.id === slug);
  return {
    title: `${card?.title ?? "Helpers"} | Helpers | Savea and Aaron's Wedding`,
  };
}

/** A tab of the open page, or the way into a staff role's: its first tab,
    which asks for the code if it hasn't been given. */
export default async function HelperSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (isStaff(slug)) {
    redirect(helpersHref(slug, { card: cardsOn(slug)[0].id }));
  }

  const card = cardsOn(null).find((c) => c.id === slug);
  if (!card) notFound();

  return <HelperPage view={null} card={card} faces={null} />;
}
