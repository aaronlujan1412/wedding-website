import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasHelperAccess } from "@/components/helpers/access";
import {
  STAFF_ROLES,
  cardById,
  cardsOn,
  describeCards,
  isStaff,
} from "@/components/helpers/cards";
import { loadFaces } from "@/components/helpers/faces";
import { HelperPage } from "@/components/helpers/HelperView";
import { hasTicks, loadTicks } from "@/components/helpers/ticks";
import { UnlockHelpers } from "@/components/helpers/UnlockHelpers";
import { roleById } from "@/components/schedule/roles";

/** Only a staff role's own cards exist as tabs; anything else is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return STAFF_ROLES.flatMap((role) =>
    cardsOn(role.id).map((card) => ({ slug: role.id, card: card.id })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; card: string }>;
}): Promise<Metadata> {
  const { slug, card } = await params;
  // The title is what a texted link previews as, so it says whose and what.
  return {
    title: `${cardById(card)?.title} | ${roleById(slug)?.label} | Savea and Aaron's Wedding`,
  };
}

/**
 * One tab of a staff role's helper page, behind the helpers' code.
 *
 * Every tab here reads the cookies, so it renders per request, and it checks
 * the code before it draws anything: locked, the page is the form and the
 * names of its tabs, nothing from the cards. The faces are fetched only
 * after that, never to be hidden later.
 */
export default async function StaffCardPage({
  params,
}: {
  params: Promise<{ slug: string; card: string }>;
}) {
  const { slug, card: cardId } = await params;
  const cards = isStaff(slug) ? cardsOn(slug) : [];
  const card = cards.find((c) => c.id === cardId);
  if (!isStaff(slug) || !card) notFound();

  if (!(await hasHelperAccess())) {
    return <UnlockHelpers contents={describeCards(cards)} />;
  }

  const [faces, ticks] = await Promise.all([
    card.id === "faces" || card.id === "shots" ? loadFaces() : null,
    hasTicks(card.id) ? loadTicks(card.id) : null,
  ]);

  return <HelperPage view={slug} card={card} faces={faces} ticks={ticks} />;
}
