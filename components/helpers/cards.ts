import {
  Camera,
  CookingPot,
  Package,
  ScrollText,
  Sparkles,
  Users,
  Warehouse,
} from "lucide-react";
import type { Role } from "@/components/schedule/roles";
import { joinNames } from "@/components/schedule/timeline";

/**
 * The helper pages, a card at a time. The schedule says when; a card says
 * how — the shot list, the buffet, what goes in which box — so a role's
 * schedule can stay a schedule. Like an entry, a card is tagged with the
 * roles that need it. Each card is its own tab, `/helpers/<role>/<card>`,
 * so what you came for is the page rather than somewhere down it.
 *
 * `short` names the tab on a phone, where five full titles don't fit.
 *
 * This is only the index: what each card is called and who it's for. The
 * schedule links to cards, and it's a client component, so what's ON each
 * card lives with its data and is drawn by `HelperView` on the server.
 */
export const CARDS = [
  {
    id: "packing",
    title: "The packing list",
    short: "Packing",
    icon: Package,
    roles: ["setup-crew"],
  },
  {
    id: "lodge-setup",
    title: "Setting up the lodge",
    short: "Lodge",
    icon: Warehouse,
    roles: ["setup-crew"],
  },
  {
    id: "food",
    title: "The buffet",
    short: "Buffet",
    icon: CookingPot,
    roles: ["coordinator", "setup-crew"],
  },
  {
    // The one card behind a code: photos of family and friends, named.
    id: "faces",
    title: "Who’s who",
    short: "Who’s who",
    icon: Users,
    roles: ["photographers", "coordinator"],
  },
  {
    id: "shots",
    title: "The shot list",
    short: "Shots",
    icon: Camera,
    roles: ["photographers", "coordinator"],
  },
  {
    id: "ceremony",
    title: "The ceremony script",
    short: "Ceremony",
    icon: ScrollText,
    roles: ["officiant", "coordinator", "wedding-party", "family", "photographers"],
  },
  {
    id: "clean-up",
    title: "The clean-up list",
    short: "Clean-up",
    icon: Sparkles,
    roles: ["coordinator", "setup-crew", "wedding-party", "family"],
  },
] as const;

export type Card = (typeof CARDS)[number];
export type CardId = Card["id"];

export function cardById(id: string): Card | undefined {
  return CARDS.find((c) => c.id === id);
}

export function hasCard(card: Card, role: Role) {
  return (card.roles as readonly Role[]).includes(role);
}

/** A role's cards, in the order the day needs them. */
export function cardsFor(role: Role) {
  return CARDS.filter((card) => hasCard(card, role));
}

/** "the shot list and the ceremony script", to finish a sentence with. */
export function describeCards(cards: readonly Card[]) {
  return joinNames(
    cards.map((c) => c.title.charAt(0).toLowerCase() + c.title.slice(1)),
  );
}

/** A link from the schedule to a card, or to one part of it. */
export type CardLink = { card: CardId; section?: string };

/** The id a part of a card is anchored at on its tab. */
export function cardAnchor({ card, section }: CardLink) {
  return section ? `${card}-${section}` : card;
}

/** `/helpers/<role>` (which opens the first tab), a card's tab, or a part
    of one. */
export function helpersHref(role: Role, link?: CardLink) {
  if (!link) return `/helpers/${role}`;
  const tab = `/helpers/${role}/${link.card}`;
  return link.section ? `${tab}#${cardAnchor(link)}` : tab;
}
