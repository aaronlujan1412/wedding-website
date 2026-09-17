import { PlannerBar } from "@/components/honeymoon/PlannerBar";
import { SectionTabBar } from "@/components/honeymoon/SectionTabs";

/**
 * Shared frame for every honeymoon tab: the planner bar, once, and the phone's
 * bottom tab bar. Pages render only their own content underneath. Neither bar
 * prints, so the itinerary prints as just its sheets.
 *
 * This sits outside app/(site), so none of the guest site's chrome — navbar,
 * footer, RSVP modal — is drawn here.
 */
export default function HoneymoonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PlannerBar />
      {/* Clears the fixed bar on top and, on a phone, the tab bar along the
          bottom. */}
      <div className="px-4 pt-[calc(var(--spacing-planner-bar)+0.5rem)] pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-[calc(var(--spacing-planner-bar)+1rem)] sm:pb-16 print:px-0 print:pt-0 print:pb-0">
        {children}
      </div>
      <SectionTabBar />
    </>
  );
}
