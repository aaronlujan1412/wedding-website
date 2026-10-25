import Link from "next/link";

/** `?plan=new`: the tab for a month that doesn't exist yet. */
export const NEW_PLAN = "new";

/**
 * The months, oldest first, and a way to start another.
 *
 * Plan used to show one month — the latest — and offered "start a month" only
 * while there were none, so once October existed there was no way to make
 * November. Quiet text in `ToolTabs`' manner, because it sits right under
 * them and is the same kind of choice one level down.
 */
export function PlanTabs({
  plans,
  current,
}: {
  /** Newest first, as `listPlans` returns them. */
  plans: { id: string; name: string }[];
  /** A plan id, or `NEW_PLAN`. */
  current: string;
}) {
  return (
    <nav aria-label="Months" className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
      {plans.toReversed().map((plan) => (
        <Tab key={plan.id} href={`/me/meals/settings?plan=${plan.id}`} active={plan.id === current}>
          {plan.name.toLowerCase()}
        </Tab>
      ))}
      <Tab href={`/me/meals/settings?plan=${NEW_PLAN}`} active={current === NEW_PLAN}>
        + new month
      </Tab>
    </nav>
  );
}

function Tab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-xs font-dot text-[12px] leading-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-me-gold ${
        active ? "text-me-gold underline underline-offset-4" : "text-me-dim hover:text-me-ink"
      }`}
    >
      {children}
    </Link>
  );
}
