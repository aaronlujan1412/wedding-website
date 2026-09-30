"use client";

import { useActionState, useOptimistic, useTransition } from "react";
import { clearBought, setBought } from "@/app/actions/meals";
import { money, type PlanLine } from "@/lib/meal-types";

/**
 * The list you actually shop from.
 *
 * Three things shape it, and all three come from using one rather than reading
 * one:
 *
 * **Split by order, then by store.** The order decides when a thing arrives,
 * which decides whether the dish it is for still works — that is the planning
 * question. But standing in a shop, the only question is what else is in this
 * shop, so the store is the inner grouping. The old workbook did the same.
 *
 * **Optional is a separate list, below, not counted.** Mixed in, it inflates
 * the total you are trying to keep under $800 and makes every line look equally
 * required. It is the things you would like, and it belongs after the things
 * you need.
 *
 * **Ticking is instant.** A shopping list is used one-handed, in a shop, on a
 * bad connection. `useOptimistic` flips the box on tap and lets the write land
 * whenever it lands; a round trip per item would make the list feel broken.
 */

type Order = {
  id: string;
  ordinal: number;
  delivers_on: string;
  store: string | null;
};

export function ShoppingList({
  lines,
  orders,
  budgetCents,
}: {
  lines: PlanLine[];
  orders: Order[];
  budgetCents: number;
}) {
  /*
   * Ticks are held here rather than per row so a whole order can be cleared in
   * one gesture and every box answers at once.
   */
  const [ticked, tick] = useOptimistic(
    new Set(lines.filter((l) => l.bought_at).map((l) => l.id)),
    (current: Set<string>, change: { ids: string[]; bought: boolean }) => {
      const next = new Set(current);
      for (const id of change.ids) {
        if (change.bought) next.add(id);
        else next.delete(id);
      }
      return next;
    },
  );

  if (!lines.length) {
    return (
      <p className="text-[13px] text-me-dim">
        Nothing to buy yet. Assign dinners to the calendar, then build the list.
      </p>
    );
  }

  const counted = lines.filter((l) => l.tier !== "optional");
  const optional = lines.filter((l) => l.tier === "optional");
  const total = counted.reduce((n, l) => n + l.unit_price_cents * l.quantity, 0);
  const extra = optional.reduce((n, l) => n + l.unit_price_cents * l.quantity, 0);

  const over = total > budgetCents;
  const guesses = lines.filter((l) => l.quantity_is_a_guess).length;
  const left = counted.filter((l) => !ticked.has(l.id)).length;

  return (
    <div className="space-y-5">
      <div>
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
          .
        </p>

        {/* What is left to put in the basket, which is the number that matters
            while you are in the shop rather than while you are planning. */}
        <p className="mt-1 text-[13px] text-me-dim">
          {left === 0
            ? "Everything ticked off."
            : `${left} of ${counted.length} still to get.`}
        </p>

        {guesses > 0 ? (
          <p className="mt-2 text-[12px] leading-relaxed text-me-dim">
            {guesses === lines.length
              ? "Every line is"
              : `${guesses} of ${lines.length} lines are`}{" "}
            one pack, unchecked — the recipes don&apos;t record amounts yet, so
            the total is a floor rather than a forecast.
          </p>
        ) : null}
      </div>

      {orders.map((order) => (
        <OrderBlock
          key={order.id}
          order={order}
          lines={counted.filter((l) => l.order_ordinal === order.ordinal)}
          ticked={ticked}
          tick={tick}
        />
      ))}

      {optional.length ? (
        <section className="border-t-2 border-me-edge-lo pt-4">
          <h3 className="font-dot text-[13px] text-me-dim">
            If there&apos;s room — {money(extra)}, not counted
          </h3>
          <p className="mt-1.5 text-[12px] leading-relaxed text-me-dim">
            Snack variety and upgrades. Left out of the total on purpose, so the
            budget is what the month actually needs.
          </p>
          <div className="mt-2.5">
            <Lines lines={optional} ticked={ticked} tick={tick} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function OrderBlock({
  order,
  lines,
  ticked,
  tick,
}: {
  order: Order;
  lines: PlanLine[];
  ticked: Set<string>;
  tick: (change: { ids: string[]; bought: boolean }) => void;
}) {
  const [, clear] = useActionState(clearBought, { error: null, note: null });
  const [, start] = useTransition();

  if (!lines.length) return null;

  const subtotal = lines.reduce((n, l) => n + l.unit_price_cents * l.quantity, 0);
  const done = lines.filter((l) => ticked.has(l.id)).length;

  // Grouped by where you buy it, with anything unassigned last rather than
  // under a heading that pretends to be a shop.
  const stores = [...new Set(lines.map((l) => l.store ?? ""))].sort((a, b) =>
    a === "" ? 1 : b === "" ? -1 : a.localeCompare(b),
  );

  return (
    <section>
      <h3 className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b-2 border-me-edge-lo pb-1.5">
        <span className="font-dot text-[13px] text-me-gold">
          Order {order.ordinal} — {longDate(order.delivers_on)}
        </span>
        <span className="flex items-center gap-3 font-dot text-[11px] text-me-dim">
          <span>
            {done}/{lines.length} · {money(subtotal)}
          </span>
          {done > 0 ? (
            <button
              type="button"
              onClick={() =>
                start(() => {
                  tick({ ids: lines.map((l) => l.id), bought: false });
                  const data = new FormData();
                  data.set("order_id", order.id);
                  clear(data);
                })
              }
              className="rounded-xs text-me-link underline underline-offset-2 hover:text-me-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
            >
              clear ticks
            </button>
          ) : null}
        </span>
      </h3>

      {stores.map((store) => (
        <div key={store || "unassigned"} className="mt-2.5">
          {stores.length > 1 ? (
            <p className="mb-1 font-dot text-[11px] text-me-dim">
              {store || "no shop set"}
            </p>
          ) : null}
          <Lines
            lines={lines.filter((l) => (l.store ?? "") === store)}
            ticked={ticked}
            tick={tick}
          />
        </div>
      ))}
    </section>
  );
}

function Lines({
  lines,
  ticked,
  tick,
}: {
  lines: PlanLine[];
  ticked: Set<string>;
  tick: (change: { ids: string[]; bought: boolean }) => void;
}) {
  const [, toggle] = useActionState(setBought, { error: null, note: null });
  const [, start] = useTransition();

  return (
    <ul>
      {lines.map((line) => {
        const done = ticked.has(line.id);
        return (
          <li key={line.id} className="border-t border-me-edge-lo first:border-t-0">
            <label
              className={`flex cursor-pointer items-start gap-3 py-2 ${
                done ? "opacity-45" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={done}
                onChange={(event) => {
                  const bought = event.currentTarget.checked;
                  start(() => {
                    tick({ ids: [line.id], bought });
                    const data = new FormData();
                    data.set("line_id", line.id);
                    data.set("bought", String(bought));
                    toggle(data);
                  });
                }}
                className="mt-0.5 size-4 shrink-0 accent-[var(--color-me-gold)]"
              />

              <span className="min-w-0 flex-1">
                <span
                  className={`flex flex-wrap items-baseline gap-x-2 text-[13px] ${
                    done ? "text-me-dim line-through" : "text-me-ink"
                  }`}
                >
                  {line.quantity !== 1 ? (
                    <span className="font-dot text-me-gold">{line.quantity}×</span>
                  ) : null}
                  {line.item_name}
                  {line.pack ? (
                    <span className="text-[12px] text-me-dim">{line.pack}</span>
                  ) : null}
                </span>

                {line.coverage_warning ? (
                  <span className="mt-0.5 block text-[11px] leading-snug text-me-live">
                    {line.coverage_warning}
                  </span>
                ) : null}
                {line.notes ? (
                  <span className="mt-0.5 block text-[11px] leading-snug text-me-dim">
                    {line.notes}
                  </span>
                ) : null}
                {line.used_for ? (
                  <span className="mt-0.5 block text-[11px] leading-snug text-me-dim">
                    {line.used_for}
                  </span>
                ) : null}
              </span>

              <span className="shrink-0 font-dot text-[12px] tabular-nums text-me-dim">
                {money(line.unit_price_cents * line.quantity)}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function longDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
