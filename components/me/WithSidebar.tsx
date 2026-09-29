import { Sidebar } from "@/components/me/Sidebar";

/**
 * The public shape: profile card beside the reading column.
 *
 * Opt-in per page rather than baked into the layout, because the signed-in
 * tools want the whole width — a 232px card is the point of a portfolio page
 * and pure cost on a screen listing several thousand notes.
 *
 * 232px is a sidebar width, not a fraction of the page: the card is a fixed
 * object and the column beside it should take whatever screen it finds. Below
 * lg it stacks, card first.
 */
export function WithSidebar({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid items-start gap-3 lg:grid-cols-[232px_minmax(0,1fr)]">
      <Sidebar />
      <main className="space-y-3">{children}</main>
    </div>
  );
}

/** The signed-in shape: no card, full width, same spacing rhythm. */
export function FullWidth({ children }: { children: React.ReactNode }) {
  return <main className="space-y-3">{children}</main>;
}
