"use client";

import { useActionState, useMemo, useOptimistic, useState, useTransition } from "react";
import {
  addExtrasTab,
  clearBought,
  removeFromTab,
  setBought,
  setLineQuantity,
} from "@/app/actions/meals";
import { TabItems } from "@/components/me/TabItems";
import { EMPTY_MEAL, FIELD, Submit } from "@/components/me/form-bits";
import { money, type Item, type PlanLine, type PlanOrder } from "@/lib/meal-types";

/**
 * The list you actually shop from.
 *
 * **One tab per shop.** One order is sixty-odd lines; two of them plus the
 * optional list is a page you scroll past rather than shop from, and a shopping
 * list is used one-handed, in a shop, which is the worst possible place to be
 * hunting for the thing you are standing in front of. A tab is one trip.
 *
 * **Tabs you make are your own.** A delivery is a box that arrives on a date;
 * an extras tab is somewhere to collect snacks by hand. The generator never
 * touches those lines — see `addToTab`.
 *
 * **Optional is counted separately, wherever it sits.** The budget question is
 * "what does the month need", and tier is what answers it. A tab says where you
 * buy a thing, not whether it counts — so an optional line is out of the total
 * on a delivery tab and on a snacks tab alike.
 *
 * **Ticking is instant.** `useOptimistic` flips the box on tap and lets the
 * write land whenever it lands; a round trip per item would make the list feel
 * broken on a bad connection.
 */

export function ShoppingList({
  planId,
  lines,
  orders,
  items,
  budgetCents,
}: {
  planId: string;
  lines: PlanLine[];
  orders: PlanOrder[];
  /** The price book, for adding things to a tab by hand. */
  items: Item[];
  budgetCents: number;
}) {
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

  /*
   * Quantities are optimistic for the same reason ticks are: the buttons are
   * tapped in a shop, and a round trip per press would make them feel stuck.
   * The base is the server's own numbers, so once a write lands the overlay
   * falls away rather than having to be cleared.
   */
  const [quantities, bump] = useOptimistic(
    new Map(lines.map((l) => [l.id, l.quantity])),
    (current: Map<string, number>, change: { id: string; quantity: number }) =>
      new Map(current).set(change.id, change.quantity),
  );

  /*
   * One list with the optimistic numbers already in it, so every subtotal on
   * the page is computed from the same figures the rows are showing. Threading
   * a `quantityOf()` helper through four components instead would have left
   * four chances for one of them to use the stale number.
   */
  const shown = useMemo(
    () => lines.map((l) => ({ ...l, quantity: quantities.get(l.id) ?? l.quantity })),
    [lines, quantities],
  );

  /*
   * Which tab is open is local state, not a URL parameter. Every tick is a
   * server action and a revalidate, so the URL would be rewritten under the
   * shopper several times a minute; local state rides through a re-render
   * untouched, which is what you want when the phone is in one hand.
   */
  const [openId, setOpenId] = useState<string | null>(orders[0]?.id ?? null);
  const open = orders.find((o) => o.id === openId) ?? orders[0] ?? null;

  const counted = useMemo(() => shown.filter((l) => l.tier !== "optional"), [shown]);
  const total = counted.reduce((n, l) => n + l.unit_price_cents * l.quantity, 0);
  const over = total > budgetCents;
  const left = counted.filter((l) => !ticked.has(l.id)).length;
  const guesses = shown.filter((l) => l.quantity_is_a_guess).length;

  if (!lines.length && orders.length <= 2) {
    return (
      <p className="text-[13px] text-me-dim">
        Nothing to buy yet. Assign dinners to the calendar, then build the list.
      </p>
    );
  }

  return (
    <div className="space-y-4">
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
        <p className="mt-1 text-[13px] text-me-dim">
          {left === 0
            ? "Everything ticked off."
            : `${left} of ${counted.length} still to get, across ${orders.length} tabs.`}
        </p>
        {guesses > 0 ? (
          <p className="mt-2 text-[12px] leading-relaxed text-me-dim">
            {guesses === shown.length
              ? "Every line is"
              : `${guesses} of ${shown.length} lines are`}{" "}
            one pack, unchecked — the recipes don&apos;t record amounts yet, so
            the total is a floor rather than a forecast.
          </p>
        ) : null}
      </div>

      <TabStrip
        planId={planId}
        orders={orders}
        lines={shown}
        ticked={ticked}
        openId={open?.id ?? null}
        onOpen={setOpenId}
      />

      {open ? (
        <TabPanel
          key={open.id}
          order={open}
          lines={shown.filter((l) => l.order_id === open.id)}
          items={items}
          ticked={ticked}
          tick={tick}
          bump={bump}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function TabStrip({
  planId,
  orders,
  lines,
  ticked,
  openId,
  onOpen,
}: {
  planId: string;
  orders: PlanOrder[];
  lines: PlanLine[];
  ticked: Set<string>;
  openId: string | null;
  onOpen: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [state, add] = useActionState(addExtrasTab, EMPTY_MEAL);

  return (
    <div className="space-y-1.5">
      {/* Real tabs: a tablist of buttons, so arrow keys and screen readers
          behave, and the open one is joined to the panel below it. */}
      <div role="tablist" aria-label="Shopping tabs" className="flex flex-wrap items-end gap-1">
        {orders.map((order) => {
          const mine = lines.filter((l) => l.order_id === order.id);
          const done = mine.filter((l) => ticked.has(l.id)).length;
          const isOpen = order.id === openId;

          return (
            <button
              key={order.id}
              role="tab"
              type="button"
              aria-selected={isOpen}
              onClick={() => onOpen(order.id)}
              className={`border-2 px-2.5 py-1.5 font-dot text-[12px] leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold ${
                isOpen
                  ? "border-me-edge-lo border-b-me-panel bg-me-panel text-me-gold"
                  : "border-transparent bg-me-bar text-me-dim hover:text-me-ink"
              }`}
            >
              {tabName(order)}
              {mine.length ? (
                <span className="ml-1.5 tabular-nums opacity-70">
                  {done}/{mine.length}
                </span>
              ) : null}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          aria-expanded={adding}
          className="rounded-xs px-2 py-1.5 font-dot text-[12px] leading-none text-me-link hover:text-me-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
        >
          {adding ? "cancel" : "+ tab"}
        </button>
      </div>

      {adding ? (
        <form
          action={(data) => {
            add(data);
            setAdding(false);
          }}
          className="flex flex-wrap items-center gap-2 border-t-2 border-me-edge-lo pt-2"
        >
          <input type="hidden" name="plan_id" value={planId} />
          <label className="sr-only" htmlFor="tab-name">
            Tab name
          </label>
          <input
            id="tab-name"
            name="name"
            placeholder="Snacks"
            autoFocus
            required
            className={`${FIELD} w-44`}
          />
          <Submit busy="adding…">add tab</Submit>
          <span className="text-[12px] text-me-dim">
            A tab of your own — pick what goes on it from the price book.
          </span>
        </form>
      ) : null}

      {state.error ? <p className="text-[12px] text-me-live">{state.error}</p> : null}
    </div>
  );
}

/** "Order 1 — Tue, Sep 29", or whatever you called your own tab. */
function tabName(order: PlanOrder) {
  if (order.kind === "extras") return order.name ?? "Extras";
  return `Order ${order.ordinal}`;
}

/* ------------------------------------------------------------------ */

function TabPanel({
  order,
  lines,
  items,
  ticked,
  tick,
  bump,
}: {
  order: PlanOrder;
  lines: PlanLine[];
  items: Item[];
  ticked: Set<string>;
  tick: (change: { ids: string[]; bought: boolean }) => void;
  bump: (change: { id: string; quantity: number }) => void;
}) {
  const [, clear] = useActionState(clearBought, EMPTY_MEAL);
  const [, start] = useTransition();

  const counted = lines.filter((l) => l.tier !== "optional");
  const optional = lines.filter((l) => l.tier === "optional");
  const subtotal = counted.reduce((n, l) => n + l.unit_price_cents * l.quantity, 0);
  const extra = optional.reduce((n, l) => n + l.unit_price_cents * l.quantity, 0);
  const done = lines.filter((l) => ticked.has(l.id)).length;

  return (
    <section
      role="tabpanel"
      aria-label={tabName(order)}
      className="border-2 border-me-edge-lo p-3"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b-2 border-me-edge-lo pb-1.5">
        <span className="font-dot text-[13px] text-me-gold">
          {order.kind === "extras"
            ? (order.name ?? "Extras")
            : `Order ${order.ordinal} — ${longDate(order.delivers_on)}`}
        </span>
        <span className="flex items-center gap-3 font-dot text-[11px] text-me-dim">
          <span className="tabular-nums">
            {done}/{lines.length} · {money(subtotal + extra)}
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
      </header>

      {counted.length ? (
        <ByStore lines={counted} ticked={ticked} tick={tick} bump={bump} />
      ) : order.kind === "extras" ? null : (
        <p className="mt-2 text-[13px] text-me-dim">Nothing on this order.</p>
      )}

      {optional.length ? (
        <section className="mt-3 border-t-2 border-me-edge-lo pt-2.5">
          <h3 className="font-dot text-[13px] text-me-dim">
            If there&apos;s room — {money(extra)}, not counted
          </h3>
          <p className="mt-1 text-[12px] leading-relaxed text-me-dim">
            Left out of the budget on purpose, so the total is what the month
            actually needs.
          </p>
          <div className="mt-2">
            <ByStore lines={optional} ticked={ticked} tick={tick} bump={bump} />
          </div>
        </section>
      ) : null}

      {order.kind === "extras" ? (
        <TabItems order={order} items={items} onList={lines.map((l) => l.id)} />
      ) : null}
    </section>
  );
}

/** Grouped by where you buy it, with anything unassigned last. */
function ByStore({
  lines,
  ticked,
  tick,
  bump,
}: {
  lines: PlanLine[];
  ticked: Set<string>;
  tick: (change: { ids: string[]; bought: boolean }) => void;
  bump: (change: { id: string; quantity: number }) => void;
}) {
  const stores = [...new Set(lines.map((l) => l.store ?? ""))].sort((a, b) =>
    a === "" ? 1 : b === "" ? -1 : a.localeCompare(b),
  );

  return (
    <>
      {stores.map((store) => (
        <div key={store || "unassigned"} className="mt-2.5">
          {stores.length > 1 ? (
            <p className="mb-1 font-dot text-[11px] text-me-dim">{store || "no shop set"}</p>
          ) : null}
          <Lines
            lines={lines.filter((l) => (l.store ?? "") === store)}
            ticked={ticked}
            tick={tick}
            bump={bump}
          />
        </div>
      ))}
    </>
  );
}

function Lines({
  lines,
  ticked,
  tick,
  bump,
}: {
  lines: PlanLine[];
  ticked: Set<string>;
  tick: (change: { ids: string[]; bought: boolean }) => void;
  bump: (change: { id: string; quantity: number }) => void;
}) {
  const [, toggle] = useActionState(setBought, EMPTY_MEAL);
  const [, drop] = useActionState(removeFromTab, EMPTY_MEAL);
  const [, setQuantity] = useActionState(setLineQuantity, EMPTY_MEAL);
  const [, start] = useTransition();

  function nudge(line: PlanLine, quantity: number) {
    start(() => {
      bump({ id: line.id, quantity });
      const data = new FormData();
      data.set("line_id", line.id);
      data.set("quantity", String(quantity));
      setQuantity(data);
    });
  }

  return (
    <ul>
      {lines.map((line) => {
        const done = ticked.has(line.id);
        return (
          <li key={line.id} className="border-t border-me-edge-lo first:border-t-0">
            <label
              className={`flex cursor-pointer items-start gap-3 py-2 ${done ? "opacity-45" : ""}`}
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
                  {line.quantity !== 1 && line.generated ? (
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

              {/* Only on lines somebody put there. A generated line's amount
                  is recomputed from the menu on every rebuild, so a number
                  typed here would vanish with nothing to say it had — and a
                  generated line removed here would simply come back, which
                  reads as the button being broken. Both controls are absent
                  rather than disabled: a greyed button invites a click and
                  explains nothing. */}
              {!line.generated ? (
                <span className="flex shrink-0 items-center gap-0.5">
                  {/* Stops at one. Zero is "take it off the list", which is
                      what × is for — and it would fail the quantity-positive
                      constraint, giving a database error where somebody
                      expected a shopping list. */}
                  <Step
                    label={`One fewer ${line.item_name}`}
                    disabled={line.quantity <= 1}
                    onPress={() => nudge(line, line.quantity - 1)}
                  >
                    −
                  </Step>
                  <span className="min-w-[1.6rem] text-center font-dot text-[13px] tabular-nums text-me-gold">
                    {line.quantity}
                  </span>
                  <Step
                    label={`One more ${line.item_name}`}
                    onPress={() => nudge(line, line.quantity + 1)}
                  >
                    +
                  </Step>
                  <button
                    type="button"
                    aria-label={`Remove ${line.item_name}`}
                    onClick={(event) => {
                      event.preventDefault();
                      const data = new FormData();
                      data.set("line_id", line.id);
                      start(() => drop(data));
                    }}
                    className="ml-1 rounded-xs px-1 font-dot text-[13px] leading-none text-me-dim hover:text-me-live focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
                  >
                    ×
                  </button>
                </span>
              ) : null}
            </label>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * One press of a quantity control.
 *
 * `preventDefault` because every row is a <label> wrapping its checkbox, so a
 * click anywhere inside it — these buttons included — would otherwise tick the
 * item off as well as change its amount.
 *
 * 28px square: these are tapped in a shop, one-handed, and a 16px target is
 * one you miss.
 */
function Step({
  children,
  label,
  onPress,
  disabled = false,
}: {
  children: React.ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={(event) => {
        event.preventDefault();
        onPress();
      }}
      className="bevel-out size-7 bg-me-bar font-dot text-[13px] leading-none text-me-ink hover:bg-me-edge-hi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold active:bevel-in disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function longDate(iso: string | null) {
  if (!iso) return "no date";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
