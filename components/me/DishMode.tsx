import Link from "next/link";

/**
 * Which of a dish's two faces you are on.
 *
 * Cook is the default and the address: `/recipes/<id>`. Edit is a place you go
 * on purpose, `/recipes/<id>/edit` — the same split the address bar already
 * understands, so a dish propped on the counter can be bookmarked and comes
 * back cooking rather than editing.
 */
export function DishMode({ id, mode }: { id: string; mode: "cook" | "edit" }) {
  const tabs = [
    ["cook", `/me/meals/recipes/${id}`],
    ["edit", `/me/meals/recipes/${id}/edit`],
  ] as const;

  return (
    <nav aria-label="Dish view" className="flex flex-wrap items-center gap-1.5">
      {tabs.map(([name, href]) => (
        <Link
          key={name}
          href={href}
          aria-current={mode === name ? "page" : undefined}
          className={`bevel-out px-3 py-1.5 font-dot text-[12px] leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold ${
            mode === name
              ? "bg-me-edge-hi text-me-gold"
              : "bg-me-bar text-me-ink hover:bg-me-edge-hi"
          }`}
        >
          {name}
        </Link>
      ))}
      <Link
        href="/me/meals/recipes"
        className="ml-auto text-[12px] text-me-link underline underline-offset-2 hover:text-me-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
      >
        all dishes
      </Link>
    </nav>
  );
}
