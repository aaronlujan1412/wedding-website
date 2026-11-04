import Link from "next/link";
import type { ReactNode } from "react";
import { CeremonyScript } from "@/components/schedule/CeremonyScript";
import { CEREMONY_START, ceremony } from "@/components/schedule/ceremony";
import { Lines } from "@/components/schedule/Lines";
import { MenuCard } from "@/components/schedule/MenuCard";
import { menu } from "@/components/schedule/menu";
import { roleById, scheduleHref, type Role } from "@/components/schedule/roles";
import { visibleLines } from "@/components/schedule/timeline";
import { CardLinks } from "./CardLinks";
import { cardsFor, type Card } from "./cards";
import { FaceAlbum } from "./FaceAlbum";
import type { FaceIndex } from "./faces";
import { cleanUpList, lodgeSetup, packingList } from "./lists";
import { ShotList } from "./ShotList";
import { UnlockFaces } from "./UnlockFaces";

/**
 * A role's helper page: every card tagged with the role, in the order the
 * day needs them. The schedule is when; this is how. It's a server
 * component, so the lists on it never ship to the schedule's browser bundle.
 *
 * `faces` is who's who, loaded only once the page has checked for the
 * helpers' code. Null draws the code form in its place.
 */
export function HelperView({
  role,
  faces,
}: {
  role: Role;
  faces: FaceIndex | null;
}) {
  const cards = cardsFor(role);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 pt-40 pb-24 print:max-w-none print:px-0 print:pt-0 print:pb-0">
      <header className="mb-14 text-center md:mb-20 print:mb-8">
        <p className="font-raleway text-xs uppercase tracking-[0.3em] text-primary">
          Helpers
        </p>
        <h1 className="mt-3 font-corinthia text-7xl text-pop md:text-8xl">
          {roleById(role)?.label}
        </h1>
        <p className="mx-auto mt-4 max-w-xl font-garamond text-xl italic text-muted-foreground md:text-2xl">
          The lists and notes behind{" "}
          <Link
            href={scheduleHref(role)}
            className="rounded-sm text-primary not-italic underline decoration-primary/40 underline-offset-[0.25em] hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            your schedule
          </Link>
          .
        </p>

        {cards.length > 1 && (
          <CardLinks
            links={cards.map((card) => ({ card: card.id }))}
            role={role}
            align="center"
            className="mt-10 print:hidden"
          />
        )}
      </header>

      <div id="helpers" className="space-y-20">
        {cards.map((card) => (
          <CardSection key={card.id} card={card}>
            <CardBody card={card} role={role} faces={faces} />
          </CardSection>
        ))}
      </div>

      <p className="mt-24 text-center font-garamond text-lg text-muted-foreground print:hidden">
        Helping out more than one way?{" "}
        <Link
          href="/helpers"
          className="rounded-sm text-primary underline decoration-primary/40 underline-offset-[0.25em] hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Every helper’s page
        </Link>
      </p>
    </main>
  );
}

/** A card's heading and anchor. Printed, each card starts its own sheet, so
    the buffet can be handed to whoever's in the kitchen. */
function CardSection({ card, children }: { card: Card; children: ReactNode }) {
  const Icon = card.icon;
  return (
    <section
      id={card.id}
      aria-labelledby={`${card.id}-title`}
      className="scroll-mt-24 print:break-before-page print:first:break-before-auto"
    >
      <h2
        id={`${card.id}-title`}
        className="flex items-center gap-3 border-b border-border pb-3 font-garamond text-3xl text-foreground md:text-4xl"
      >
        <Icon aria-hidden="true" className="size-6 shrink-0 text-pop2" strokeWidth={1.5} />
        {card.title}
      </h2>
      {children}
    </section>
  );
}

function CardBody({
  card,
  role,
  faces,
}: {
  card: Card;
  role: Role;
  faces: FaceIndex | null;
}): ReactNode {
  switch (card.id) {
    case "packing":
      return <Lines lines={visibleLines(packingList, role)} />;
    case "lodge-setup":
      return <Lines lines={visibleLines(lodgeSetup, role)} />;
    case "food":
      return <MenuCard stations={menu} />;
    case "faces":
      return faces ? <FaceAlbum faces={faces} /> : <UnlockFaces />;
    case "shots":
      return <ShotList role={role} faces={faces} />;
    case "ceremony":
      return (
        <CeremonyScript start={CEREMONY_START} segments={ceremony} role={role} />
      );
    case "clean-up":
      return <Lines lines={visibleLines(cleanUpList, role)} kind="checklist" />;
  }
}
