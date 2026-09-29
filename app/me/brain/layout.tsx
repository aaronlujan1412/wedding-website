/**
 * The SecondBrain's own frame.
 *
 * Same site, same skin — but no profile column. That card is the point of the
 * public pages and pure cost on a screen listing several thousand notes, so
 * these pages get the full width instead. A board's admin panel looked like
 * the board with the furniture cleared out, which is exactly this.
 *
 * The masthead, tabs and footer still come from `app/me/layout.tsx` above.
 */
export default function BrainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="space-y-3">{children}</div>;
}
