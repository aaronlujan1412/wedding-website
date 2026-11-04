import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cardById, cardsFor, hasCard } from "@/components/helpers/cards";
import { canSeeFaces, loadFaces } from "@/components/helpers/faces";
import { HelperCard } from "@/components/helpers/HelperView";
import { ROLES, roleById } from "@/components/schedule/roles";

/** Only a role's own cards exist as tabs; anything else is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return ROLES.flatMap((r) =>
    cardsFor(r.id).map((card) => ({ role: r.id, card: card.id })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ role: string; card: string }>;
}): Promise<Metadata> {
  const { role, card } = await params;
  // The title is what a texted link previews as, so it says whose and what.
  return {
    title: `${cardById(card)?.title} | ${roleById(role)?.label} | Savea and Aaron's Wedding`,
  };
}

/**
 * One tab of a role's helper page.
 *
 * Who's who and the shot list read the cookies, so those two render per
 * request; the faces are fetched only after the code checks out, never to be
 * hidden later. Every other tab is static.
 */
export default async function HelperCardPage({
  params,
}: {
  params: Promise<{ role: string; card: string }>;
}) {
  const { role, card: cardId } = await params;
  const info = roleById(role);
  const card = cardById(cardId);
  if (!info || !card || !hasCard(card, info.id)) notFound();

  const showsFaces =
    (card.id === "faces" || card.id === "shots") &&
    cardsFor(info.id).some((c) => c.id === "faces");
  const faces = showsFaces && (await canSeeFaces()) ? await loadFaces() : null;

  return <HelperCard card={card} role={info.id} faces={faces} />;
}
