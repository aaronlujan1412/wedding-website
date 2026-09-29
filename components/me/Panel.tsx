/**
 * The module. Everything on this site is one of these: a raised box with a
 * title bar across the top, stacked down a sidebar or a column.
 *
 * The title bar is structural, not decorative — it is how you tell where one
 * thing stops and the next starts when the whole page is the same violet.
 */
export function Panel({
  title,
  children,
  className = "",
  bodyClassName = "p-3.5",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`bevel-out bg-me-panel shadow-[3px_3px_0_var(--color-me-edge-lo)] ${className}`}
    >
      {/* The masthead carries the site's h1, so every module is an h2. */}
      <h2 className="border-b-2 border-me-edge-lo bg-me-bar px-3 py-1.5 font-dot text-[15px] leading-none text-me-gold">
        {title}
      </h2>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** A sunken well: quoted text, a screen, anything the page is showing you. */
export function Well({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bevel-in bg-me-void p-3 ${className}`}>{children}</div>
  );
}
