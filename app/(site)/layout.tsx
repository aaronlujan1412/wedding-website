import { SiteChrome } from "@/components/SiteChrome";

/**
 * The guest site's layout. The honeymoon planner sits outside this group on
 * purpose — two people planning a trip have no use for "Travel, Schedule,
 * RSVP", and the guest bar cost the planner a sixth of every screen.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteChrome>{children}</SiteChrome>;
}
