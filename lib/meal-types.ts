/**
 * Shapes shared by the server and the browser.
 *
 * Without `import "server-only"`, unlike `meal-queries.ts` — the client
 * components that draw the calendar and the shopping list need these types and
 * the freshness thresholds, and importing them from the query layer would pull
 * a server-only module into the client bundle.
 */

export type Tier = "core" | "pantry" | "optional";
export type Window = "day0-2" | "early" | "mid" | "any";

export const WINDOW_LABEL: Record<Window, string> = {
  "day0-2": "first 2 days",
  early: "first week",
  mid: "up to ~12 days",
  any: "any time",
};

export type Recipe = {
  id: string;
  name: string;
  kind: "dinner" | "lunch" | "snack" | "special";
  serves: number | null;
  kcal: number | null;
  protein_g: number | null;
  method: string | null;
  window_when: Window;
  notes: string | null;
  batch_friendly: boolean;
  ingredient_count: number;
};

export type Item = {
  id: string;
  name: string;
  pack: string | null;
  category: string | null;
  tier: Tier;
  price_cents: number | null;
  keeps_days: number | null;
  notes: string | null;
  used_by: number;
};

export type PlanDay = {
  id: string;
  on_date: string;
  dinner: string | null;
  dinner_recipe_id: string | null;
  dinner_window: Window | null;
  lunch: string | null;
  kid_here: boolean;
  prep_day: boolean;
  notes: string | null;
  /** Nights since the delivery that supplies this day. Null before the first. */
  days_out: number | null;
  /** Set when a delivery lands on this date. */
  delivery_ordinal: number | null;
};

export type PlanLine = {
  id: string;
  order_ordinal: number;
  item_name: string;
  pack: string | null;
  tier: Tier;
  quantity: number;
  unit_price_cents: number;
  used_for: string | null;
  coverage_warning: string | null;
  quantity_is_a_guess: boolean;
};

export type Plan = {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  budget_cents: number;
  status: "draft" | "final";
  orders: { id: string; ordinal: number; delivers_on: string; store: string | null }[];
  days: PlanDay[];
  lines: PlanLine[];
};

/**
 * How a day reads, given how long since its box arrived.
 *
 * The thresholds are the recipe windows, so the calendar and the scheduler are
 * describing the same thing: a day in the "fresh" band is one where a
 * day0-2 dish is safe, "good" is where an early dish is, and so on. Three
 * colours, all already in the skin — no new palette for a new page.
 */
export function freshness(daysOut: number | null): {
  key: "arrival" | "fresh" | "good" | "thin" | "tail";
  ink: string;
  label: string;
} {
  if (daysOut === null || daysOut <= 0) {
    return { key: "arrival", ink: "text-[var(--me-phosphor)]", label: "box lands" };
  }
  if (daysOut <= 2) {
    return { key: "fresh", ink: "text-[var(--me-phosphor)]", label: `day ${daysOut} — anything goes` };
  }
  if (daysOut <= 7) {
    return { key: "good", ink: "text-me-ink", label: `day ${daysOut} — fresh produce still fine` };
  }
  if (daysOut <= 12) {
    return { key: "thin", ink: "text-me-gold", label: `day ${daysOut} — hardy produce only` };
  }
  return { key: "tail", ink: "text-me-live", label: `day ${daysOut} — frozen and stored` };
}

export const money = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
