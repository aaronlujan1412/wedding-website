import Link from "next/link";
import type { ReactNode } from "react";
import { CeremonyScript } from "@/components/schedule/CeremonyScript";
import { CEREMONY_START, ceremony } from "@/components/schedule/ceremony";
import { Lines } from "@/components/schedule/Lines";
import { MenuCard } from "@/components/schedule/MenuCard";
import { menu } from "@/components/schedule/menu";
import type { Role } from "@/components/schedule/roles";
import { visibleLines } from "@/components/schedule/timeline";
import type { Card, HelperView } from "./cards";
import { FaceAlbum } from "./FaceAlbum";
import type { FaceIndex } from "./faces";
import { HelperTabBar, HelperTabs } from "./HelperTabs";
import { HelperViews } from "./HelperViews";
import { cleanUpList, lodgeSetup, packingList } from "./lists";
import { ShotList } from "./ShotList";

/**
 * Every helper page around whatever's open: the heading and the role
 * buttons, which stay put while the page under them changes. The schedule is
 * when; this is how. All of it renders on the server, so the lists never
 * ship to the schedule's browser bundle.
 */
export function HelperShell({ children }: { children: ReactNode }) {
  return (
    <main
      id="helpers"
      className="mx-auto min-h-screen max-w-3xl px-6 pt-32 pb-24 max-md:pb-0 md:pt-40 print:max-w-none print:px-0 print:pt-0 print:pb-0"
    >
      <header className="mb-8 text-center print:mb-6">
        <p className="font-raleway text-xs uppercase tracking-[0.3em] text-primary">
          Helpers
        </p>
        <h1 className="mt-2 font-corinthia text-6xl text-pop md:text-7xl">
          Thank you
        </h1>
        <p className="mx-auto mt-2 max-w-xl font-garamond text-lg italic text-muted-foreground md:text-xl print:hidden">
          For helping us pull the day off.{" "}
          <Link
            href="/schedule"
            className="rounded-sm text-primary not-italic underline decoration-primary/40 underline-offset-[0.25em] hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            The schedule
          </Link>{" "}
          says when; these pages say how.
        </p>
      </header>

      <HelperViews />
      {children}
    </main>
  );
}

/** One tab of a helper page: the tabs, the card, and the phone's tab bar,
    which has to come last to settle above the footer. */
export function HelperPage({
  view,
  card,
  faces,
}: {
  view: HelperView;
  card: Card;
  faces: FaceIndex | null;
}) {
  return (
    <>
      <HelperTabs view={view} active={card.id} />
      <HelperCard card={card} view={view} faces={faces} />
      <HelperTabBar view={view} active={card.id} />
    </>
  );
}

/**
 * One card. `faces` is who's who, loaded only on a staff page that has
 * checked for the helpers' code; the shot list without it has no faces.
 */
function HelperCard({
  card,
  view,
  faces,
}: {
  card: Card;
  view: HelperView;
  faces: FaceIndex | null;
}) {
  const Icon = card.icon;
  return (
    // The main has no bottom padding on a phone, so the tab bar can sit
    // flush on the footer; the gap is the card's, for pages without a bar.
    <section aria-labelledby={`${card.id}-title`} className="max-md:pb-16">
      <h2
        id={`${card.id}-title`}
        className="flex items-center gap-3 border-b border-border pb-3 font-garamond text-3xl text-foreground md:text-4xl"
      >
        <Icon aria-hidden="true" className="size-6 shrink-0 text-pop2" strokeWidth={1.5} />
        {card.title}
      </h2>
      <CardBody card={card} role={view} faces={faces} />
    </section>
  );
}

/** What's on a card. `role` is null on the open page: everyone's copy. */
function CardBody({
  card,
  role,
  faces,
}: {
  card: Card;
  role: Role | null;
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
      return faces && <FaceAlbum faces={faces} />;
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
