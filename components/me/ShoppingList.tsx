import { money, type PlanLine } from "@/lib/meal-types";

/**
 * The costed list, one block per delivery.
 *
 * Split by order rather than by store or category, because the order is the
 * thing a line belongs to: it decides when the item arrives, which decides
 * whether the dish it is for actually works. Category is how a supermarket is
 * arranged; the order is how this plan is arranged.
 *
 * "Used for" is the column that earns its place — it is why the line exists,
 * and it is what tells you a pack of chicken thighs is carrying three dinners
 * rather than one.
 */
export function ShoppingList({
  lines,
  orders,
  budgetCents,
}: {
  lines: PlanLine[];
  orders: { ordinal: number; delivers_on: string; store: string | null }[];
  budgetCents: number;
}) {
  if (!lines.length) {
    return (
      <p className="text-[13px] text-me-dim">
        Nothing to buy yet. Assign dinners to the calendar, then build the list.
      </p>
    );
  }

  const counted = lines.filter((l) => l.tier !== "optional");
  const total = counted.reduce((n, l) => n + l.unit_price_cents * l.quantity, 0);
  const optional = lines
    .filter((l) => l.tier === "optional")
    .reduce((n, l) => n + l.unit_price_cents * l.quantity, 0);

  const over = total > budgetCents;
  const guesses = lines.filter((l) => l.quantity_is_a_guess).length;

  return (
    <div className="space-y-4">
      {/* The budget reads as a sentence rather than a dashboard figure: what it
          comes to, against what, with what left. A number this important should
          say what it means. */}
      <p className="text-[13px] leading-relaxed text-me-ink">
        <span className={`font-dot text-[19px] ${over ? "text-me-live" : "text-me-gold"}`}>
          {money(total)}
        </span>{" "}
        of {money(budgetCents)}
        {over ? (
          <span className="text-me-live"> — {money(total - budgetCents)} over</span>
        ) : (
          <> — {money(budgetCents - total)} left</>
        )}
        {optional > 0 ? (
          <span className="text-me-dim">, plus {money(optional)} optional</span>
        ) : null}
        .
      </p>

      {guesses > 0 ? (
        <p className="text-[12px] leading-relaxed text-me-dim">
          {guesses === lines.length
            ? "Every line is"
            : `${guesses} of ${lines.length} lines are`}{" "}
          one pack, unchecked — the recipes don&apos;t record amounts yet, so the
          total is a floor rather than a forecast.
        </p>
      ) : null}

      {orders.map((order) => {
        const mine = lines.filter((l) => l.order_ordinal === order.ordinal);
        if (!mine.length) return null;
        const subtotal = mine
          .filter((l) => l.tier !== "optional")
          .reduce((n, l) => n + l.unit_price_cents * l.quantity, 0);

        return (
          <section key={order.ordinal}>
            <h3 className="flex flex-wrap items-baseline justify-between gap-x-3 border-b-2 border-me-edge-lo pb-1.5 font-dot text-[13px] text-me-gold">
              <span>
                Order {order.ordinal} — {longDate(order.delivers_on)}
                {order.store ? `, ${order.store}` : ""}
              </span>
              <span className="text-me-dim">
                {mine.length} {mine.length === 1 ? "line" : "lines"} · {money(subtotal)}
              </span>
            </h3>

            <div className="rail-scroll overflow-x-auto">
              <table className="mt-2 w-full min-w-[560px] text-[12px]">
                <thead>
                  <tr className="text-me-dim">
                    <th scope="col" className="pb-1.5 pr-3 text-left font-dot text-[11px] font-normal">
                      Item
                    </th>
                    <th scope="col" className="pb-1.5 pr-3 text-left font-dot text-[11px] font-normal">
                      Pack
                    </th>
                    <th scope="col" className="pb-1.5 pr-3 text-right font-dot text-[11px] font-normal">
                      Price
                    </th>
                    <th scope="col" className="pb-1.5 text-left font-dot text-[11px] font-normal">
                      Used for
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mine.map((line) => (
                    <tr key={line.id} className="border-t border-me-edge-lo align-top">
                      <td className="py-1.5 pr-3 text-me-ink">
                        {line.item_name}
                        {line.tier !== "core" ? (
                          <span className="ml-1.5 font-dot text-[10px] text-me-dim">
                            {line.tier}
                          </span>
                        ) : null}
                        {line.coverage_warning ? (
                          <span className="mt-0.5 block text-[11px] leading-snug text-me-live">
                            {line.coverage_warning}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-1.5 pr-3 text-me-dim">{line.pack ?? "—"}</td>
                      <td className="py-1.5 pr-3 text-right font-dot text-[12px] tabular-nums text-me-ink">
                        {money(line.unit_price_cents * line.quantity)}
                      </td>
                      <td className="py-1.5 text-me-dim">{line.used_for ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function longDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
