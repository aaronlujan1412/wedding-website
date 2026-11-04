import type { Metadata } from "next";
import Link from "next/link";
import { cardsFor, describeCards } from "@/components/helpers/cards";
import { ROLES, scheduleHref } from "@/components/schedule/roles";

export const metadata: Metadata = {
  title: "Helpers | Savea and Aaron's Wedding",
};

/** Every role with a helper page, beside its schedule. */
export default function HelpersPage() {
  const roles = ROLES.flatMap((role) => {
    const cards = cardsFor(role.id);
    return cards.length > 0 ? [{ role, cards }] : [];
  });

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 pt-40 pb-24">
      <header className="text-center">
        <p className="font-raleway text-xs uppercase tracking-[0.3em] text-primary">
          Helpers
        </p>
        <h1 className="mt-3 font-corinthia text-7xl text-pop md:text-8xl">
          Thank you
        </h1>
        <p className="mx-auto mt-4 max-w-xl font-garamond text-xl italic text-muted-foreground md:text-2xl">
          For helping us pull the day off. Your schedule says when, and your
          helper page says how.
        </p>
      </header>

      <ul className="mt-14 divide-y divide-border border-y border-border">
        {roles.map(({ role, cards }) => (
          <li
            key={role.id}
            className="flex items-baseline justify-between gap-6 py-5"
          >
            <div>
              <Link
                href={`/helpers/${role.id}`}
                className="rounded-sm font-garamond text-2xl text-foreground underline decoration-border underline-offset-[0.25em] hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {role.label}
              </Link>
              <p className="mt-1 font-raleway text-sm text-muted-foreground">
                {capitalize(describeCards(cards))}
              </p>
            </div>
            <Link
              href={scheduleHref(role.id)}
              className="shrink-0 rounded-sm font-raleway text-sm text-primary underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Schedule
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
