import { Navbar } from "@/components/NavBar/NavBar";
import { Footer } from "@/components/Footer";
import { RsvpProvider } from "@/components/rsvp/RsvpProvider";

/**
 * The guest site's chrome: navbar, footer, and the RSVP modal the navbar's
 * button opens. Shared by the (site) layout and the root 404, which renders
 * outside every route group and would otherwise be a dead end.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <RsvpProvider>
      <Navbar />
      {children}
      <Footer />
    </RsvpProvider>
  );
}
