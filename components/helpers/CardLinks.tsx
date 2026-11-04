import Link from "next/link";
import type { Role } from "@/components/schedule/roles";
import { cn } from "@/lib/utils";
import { cardAnchor, cardById, hasCard, helpersHref, type CardLink } from "./cards";

/**
 * Links to helper cards, each a small tab with the card's icon. Only the
 * cards the role has: the family's copy of the ceremony doesn't point at a
 * shot list that isn't on their page.
 */
export function CardLinks({
  links,
  role,
  align = "start",
  className,
}: {
  links: CardLink[];
  role: Role;
  align?: "start" | "end" | "center";
  className?: string;
}) {
  const visible = links.flatMap((link) => {
    const card = cardById(link.card);
    return card && hasCard(card, role) ? [{ link, card }] : [];
  });
  if (visible.length === 0) return null;

  return (
    <ul
      className={cn(
        "flex flex-wrap gap-2",
        align === "end" && "justify-end",
        align === "center" && "justify-center",
        className,
      )}
    >
      {visible.map(({ link, card }) => {
        const Icon = card.icon;
        return (
          <li key={cardAnchor(link)}>
            <Link
              href={helpersHref(role, link)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 font-raleway text-sm text-primary transition-colors hover:border-primary/40 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:py-2.5"
            >
              <Icon aria-hidden="true" className="size-4 text-pop2" strokeWidth={1.75} />
              {card.title}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
