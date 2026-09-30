"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RecipeDetail } from "@/lib/meal-queries";

/**
 * The view you cook from.
 *
 * Two jobs, and only two: hold the screen awake, and be readable from across a
 * worktop with your hands full. Everything that edits lives on the other view —
 * a form field beside a hot pan is a thing to knock, not a thing to use.
 *
 * WHY THE SCREEN. The method sits on the site's own CRT — the same
 * `--me-screen` and `--me-phosphor` the vault's note bodies use, and the same
 * monitor the sidebar sprite draws. A cook view IS a screen you prop up, so the
 * one piece of the skin that already means "text on a screen" is the honest
 * place to spend this page's boldness. Nothing else here is new.
 */

/**
 * Keep the display on while this is mounted.
 *
 * The sentinel is released by the browser EVERY time the page is hidden — tab
 * switch, lock, another app — and is not reinstated on the way back, so a lock
 * taken once holds until the first time you look away and never again. Which is
 * precisely when a cook needs it. Hence the visibilitychange re-request.
 */
function useWakeLock() {
  const [state, setState] = useState<"off" | "on" | "unsupported">("off");
  const sentinel = useRef<WakeLockSentinel | null>(null);

  /*
   * Returns the new state rather than setting it. `set-state-in-effect` is an
   * error in this repo, and rightly: a setState reached synchronously from an
   * effect body cascades a render before the first one has painted. Handing the
   * answer back means every setState below happens in a `.then`, after an
   * await, which is a different render pass entirely.
   */
  const acquire = useCallback(async (): Promise<"off" | "on" | "unsupported"> => {
    if (!("wakeLock" in navigator)) return "unsupported";
    try {
      sentinel.current = await navigator.wakeLock.request("screen");
      return "on";
    } catch {
      // Refused: not a secure context, or the tab is not visible yet. Not
      // something to interrupt cooking over.
      return "off";
    }
  }, []);

  useEffect(() => {
    let alive = true;

    const take = () => {
      void acquire().then((next) => {
        if (!alive) return;
        setState(next);
        // The browser can drop the lock for its own reasons — battery saver,
        // or the page being hidden. Saying so beats an indicator that lies.
        sentinel.current?.addEventListener(
          "release",
          () => {
            if (alive) setState("off");
          },
          { once: true },
        );
      });
    };

    take();

    /*
     * The sentinel is released EVERY time the page is hidden — tab switch, lock
     * screen, another app — and is not reinstated on the way back. A lock taken
     * once therefore holds until the first time you look away and never again,
     * which is exactly when a cook needs it.
     */
    const onVisible = () => {
      if (document.visibilityState === "visible") take();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel.current?.release().catch(() => {});
      sentinel.current = null;
    };
  }, [acquire]);

  return state;
}

export function CookView({ recipe }: { recipe: RecipeDetail }) {
  const wake = useWakeLock();

  /*
   * Ticks are in the head, not the database. This is mise en place — what is
   * already in the bowl — and it is true for the next forty minutes, not for
   * the dish. Storing it would mean every cook started with somebody else's
   * ticks still on.
   */
  const [done, setDone] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setDone((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Several lines is a method; one line is a hint, and numbering a single hint
  // would dress a note up as a procedure.
  const steps = (recipe.method ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const stats: [string, string][] = [
    ["serves", recipe.serves ? String(recipe.serves) : "—"],
    ["kcal", recipe.kcal ? String(recipe.kcal) : "—"],
    ["protein", recipe.protein_g ? `${recipe.protein_g}g` : "—"],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <dl className="flex gap-5">
          {stats.map(([label, value]) => (
            <div key={label}>
              <dt className="font-dot text-[11px] leading-none text-me-dim">{label}</dt>
              <dd className="mt-1 font-dot text-[19px] leading-none text-me-gold tabular-nums">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <p className="flex items-center gap-1.5 text-[12px]">
          <span
            aria-hidden
            className={`inline-block size-2 rounded-full ${
              wake === "on" ? "bg-[var(--me-phosphor)]" : "bg-me-edge-hi"
            }`}
          />
          <span className={wake === "on" ? "text-[var(--me-phosphor)]" : "text-me-dim"}>
            {wake === "on"
              ? "Screen staying on"
              : wake === "unsupported"
                ? "This browser won't hold the screen awake"
                : "Screen may sleep"}
          </span>
        </p>
      </div>

      <section>
        <h3 className="border-b-2 border-me-edge-lo pb-1.5 font-dot text-[13px] text-me-gold">
          what goes in
        </h3>

        {recipe.ingredients.length ? (
          <ul className="mt-1">
            {recipe.ingredients.map((ingredient) => {
              const ticked = done.has(ingredient.item_id);
              return (
                <li
                  key={ingredient.item_id}
                  className="border-t border-me-edge-lo first:border-t-0"
                >
                  {/* Big rows and a big box: this is tapped with the back of a
                      knuckle, by somebody holding something. */}
                  <label
                    className={`flex cursor-pointer items-center gap-3 py-2.5 text-[15px] ${
                      ticked ? "text-me-dim line-through opacity-60" : "text-me-ink"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={ticked}
                      onChange={() => toggle(ingredient.item_id)}
                      className="size-5 shrink-0 accent-[var(--color-me-gold)]"
                    />
                    <span className="min-w-0 flex-1">
                      {ingredient.name}
                      {ingredient.optional ? (
                        <span className="ml-2 font-dot text-[11px] text-me-dim">optional</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-dot text-[12px] text-me-dim tabular-nums">
                      {ingredient.quantity
                        ? `${ingredient.quantity}${ingredient.unit ? ` ${ingredient.unit}` : ""}`
                        : (ingredient.pack ?? "")}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-[14px] leading-relaxed text-me-ink">
            No ingredients recorded, so this dish puts nothing on a shopping
            list. Add them in edit mode.
          </p>
        )}
      </section>

      <section>
        <h3 className="border-b-2 border-me-edge-lo pb-1.5 font-dot text-[13px] text-me-gold">
          how
        </h3>

        {steps.length > 1 ? (
          <ol className="bevel-in mt-1 space-y-2.5 bg-[var(--me-screen)] p-3.5 text-[15px] leading-relaxed text-[var(--me-phosphor)]">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span aria-hidden className="shrink-0 font-dot tabular-nums opacity-60">
                  {i + 1}
                </span>
                <span className="min-w-0">{step}</span>
              </li>
            ))}
          </ol>
        ) : steps.length === 1 ? (
          <p className="bevel-in mt-1 bg-[var(--me-screen)] p-3.5 text-[15px] leading-relaxed text-[var(--me-phosphor)]">
            {steps[0]}
          </p>
        ) : (
          <p className="mt-2 text-[14px] leading-relaxed text-me-ink">
            Nothing written down yet. Edit mode takes a method a line at a time,
            and each line shows up here as a step.
          </p>
        )}

        {recipe.notes ? (
          <p className="mt-2.5 text-[14px] leading-relaxed text-me-dim">{recipe.notes}</p>
        ) : null}
      </section>
    </div>
  );
}
