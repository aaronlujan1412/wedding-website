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
 * roles that need it, and each card is its own tab, so what you came for is
 * the page rather than somewhere down it.
 *
 * Which page a card is on comes from those tags (`cardsOn`): the staff roles
 * each have a page of their own behind the helpers' code, and every other
 * role shares the open one.
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
    // Photos of family and friends, named. Staff roles only, so never on
    // the open page.
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

/**
 * The roles with a job of their own on the day, each with a helper page
 * behind the helpers' code: `/helpers/<role>`. `label` is how the open page
 * asks ("Photographer?"). The ids can't be card ids too — the two share the
 * URL segment after `/helpers`.
 */
export const STAFF_ROLES = [
  { id: "photographers", label: "Photographer" },
  { id: "coordinator", label: "Coordinator" },
  { id: "officiant", label: "Officiant" },
] as const satisfies readonly { id: Role; label: string }[];

export type StaffRole = (typeof STAFF_ROLES)[number]["id"];

export function isStaff(id: string): id is StaffRole {
  return STAFF_ROLES.some((r) => r.id === id);
}

/**
 * A helper page: a staff role's, or null for the open one at `/helpers`,
 * which every other role shares — the setup crew, the wedding party and the
 * family. Null for "nobody in particular", as on the schedule.
 */
export type HelperView = StaffRole | null;

/** Which page a schedule role's links go to. */
export function helperViewOf(role: Role): HelperView {
  return isStaff(role) ? role : null;
}

/** A page's tabs. The open page has every card a non-staff role needs. */
export function cardsOn(view: HelperView): Card[] {
  return view
    ? cardsFor(view)
    : CARDS.filter((card) =>
        (card.roles as readonly Role[]).some((role) => !isStaff(role)),
      );
}

/** A link from the schedule to a card, or to one part of it. */
export type CardLink = { card: CardId; section?: string };

/** The id a part of a card is anchored at on its tab. */
export function cardAnchor({ card, section }: CardLink) {
  return section ? `${card}-${section}` : card;
}

/** A helper page (which opens its first tab), a card's tab on it, or a part
    of one: `/helpers/food`, `/helpers/coordinator/food#…`. */
export function helpersHref(view: HelperView, link?: CardLink) {
  const page = view ? `/helpers/${view}` : "/helpers";
  if (!link) return page;
  const tab = `${page}/${link.card}`;
  return link.section ? `${tab}#${cardAnchor(link)}` : tab;
}
