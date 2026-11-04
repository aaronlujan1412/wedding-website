import Link from "next/link";
import type { ReactNode } from "react";
import { CeremonyScript } from "@/components/schedule/CeremonyScript";
import { CEREMONY_START, ceremony } from "@/components/schedule/ceremony";
import { Lines } from "@/components/schedule/Lines";
import { MenuCard } from "@/components/schedule/MenuCard";
import { menu } from "@/components/schedule/menu";
import { roleById, scheduleHref, type Role } from "@/components/schedule/roles";
import { visibleLines } from "@/components/schedule/timeline";
import type { Card } from "./cards";
import { FaceAlbum } from "./FaceAlbum";
import type { FaceIndex } from "./faces";
import { HelperTabBar, HelperTabs } from "./HelperTabs";
import { cleanUpList, lodgeSetup, packingList } from "./lists";
import { ShotList } from "./ShotList";
import { UnlockFaces } from "./UnlockFaces";

/**
 * A role's helper page around whichever card is open: the heading and the
 * tabs, which stay put while the card under them changes. The schedule is
 * when; this is how. All of it renders on the server, so the lists never
 * ship to the schedule's browser bundle.
 */
export function HelperShell({ role, children }: { role: Role; children: ReactNode }) {
  return (
    <main
      id="helpers"
      className="mx-auto min-h-screen max-w-3xl px-6 pt-32 pb-24 max-md:pb-0 md:pt-40 print:max-w-none print:px-0 print:pt-0 print:pb-0"
    >
      <header className="mb-10 text-center md:mb-12 print:mb-6">
        <p className="font-raleway text-xs uppercase tracking-[0.3em] text-primary">
          Helpers
        </p>
        <h1 className="mt-2 font-corinthia text-6xl text-pop md:text-7xl">
          {roleById(role)?.label}
        </h1>
        <p className="mx-auto mt-2 max-w-xl font-garamond text-lg italic text-muted-foreground md:text-xl print:hidden">
          The lists and notes behind{" "}
          <Link
            href={scheduleHref(role)}
            className="rounded-sm text-primary not-italic underline decoration-primary/40 underline-offset-[0.25em] hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            your schedule
          </Link>
          .
        </p>
      </header>

      <HelperTabs role={role} />
      {children}

      <p className="mt-24 text-center font-garamond text-lg text-muted-foreground print:hidden">
        Helping out more than one way?{" "}
        <Link
          href="/helpers"
          className="rounded-sm text-primary underline decoration-primary/40 underline-offset-[0.25em] hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Every helper’s page
        </Link>
      </p>

      <HelperTabBar role={role} />
    </main>
  );
}

/**
 * One card, as its tab. `faces` is who's who, loaded only once the page has
 * checked for the helpers' code; null draws the code form in its place.
 */
export function HelperCard({
  card,
  role,
  faces,
}: {
  card: Card;
  role: Role;
  faces: FaceIndex | null;
}) {
  const Icon = card.icon;
  return (
    <section aria-labelledby={`${card.id}-title`}>
      <h2
        id={`${card.id}-title`}
        className="flex items-center gap-3 border-b border-border pb-3 font-garamond text-3xl text-foreground md:text-4xl"
      >
        <Icon aria-hidden="true" className="size-6 shrink-0 text-pop2" strokeWidth={1.5} />
        {card.title}
      </h2>
      <CardBody card={card} role={role} faces={faces} />
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
