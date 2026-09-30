"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { setDinner, toggleDayTag } from "@/app/actions/meal-library";
import { FIELD } from "@/components/me/form-bits";
import type { PlanDay } from "@/lib/meal-types";

/**
 * A day, opened.
 *
 * The cell is the button: tapping it opens everything you can say about that
 * day. It used to be a bare <select> of thirty-five dishes sitting in a grid
 * square — unsearchable, and at 14% of a calendar's width it showed about
 * four characters of any dish's name.
 *
 * A DIALOG, not a popover. The calendar lives inside a horizontally scrolling
 * container, and anything absolutely positioned inside that gets clipped by it
 * — the same containing-block rule that had `sr-only` labels dragging the page
 * sideways. A modal escapes the question entirely, and on a phone it is the
 * better shape anyway: the thing you are choosing gets the screen.
 *
 * `<dialog showModal>` rather than a hand-rolled overlay, for Escape, the focus
 * trap and an inert background without writing any of the three.
 */
export function DayEditor({
  day,
  options,
  dayTypes,
}: {
  day: PlanDay;
  options: { id: string; name: string }[];
  dayTypes: string[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  const shown = query.trim()
    ? options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  function choose(id: string | null) {
    start(async () => {
      const data = new FormData();
      data.set("day_id", day.id);
      if (id) data.set("dinner_recipe_id", id);
      await setDinner({ error: null, note: null }, data);
      setOpen(false);
      setQuery("");
    });
  }

  function toggle(tag: string) {
    start(async () => {
      const data = new FormData();
      data.set("day_id", day.id);
      data.set("tag", tag);
      await toggleDayTag({ error: null, note: null }, data);
    });
  }

  const label = day.dinner ?? "add a dinner";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full rounded-xs text-left text-[12px] leading-snug underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold ${
          day.dinner ? "text-me-link hover:text-me-ink" : "text-me-dim hover:text-me-ink"
        }`}
      >
        {label}
      </button>

      {day.tags.length ? (
        <p className="mt-1 font-dot text-[10px] leading-snug text-me-gold">
          {day.tags.join("  ")}
        </p>
      ) : null}

      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          // Clicking the backdrop closes. The dialog element itself fills the
          // backdrop's hit area, so the target being the dialog (rather than
          // anything inside it) is what "outside" means here.
          if (event.target === dialog.current) setOpen(false);
        }}
        className="bevel-out m-auto w-[min(30rem,92vw)] bg-me-panel p-0 text-me-ink backdrop:bg-black/60"
      >
        {/* Contents only while open. There is one of these per day, so a
            month renders thirty-one — and each carries the whole dish list,
            which would put a thousand list items in the DOM of a page nobody
            has clicked yet. */}
        {open ? (
          <>
        <h2 className="border-b-2 border-me-edge-lo bg-me-bar px-3 py-1.5 font-dot text-[14px] leading-none text-me-gold">
          {longDate(day.on_date)}
        </h2>

        <div className="space-y-3 p-3">
          <section>
            <label className="flex flex-col gap-1">
              <span className="font-dot text-[11px] text-me-dim">what kind of day</span>
              <TypeRow
                current={day.tags}
                known={dayTypes}
                onToggle={toggle}
                busy={pending}
              />
            </label>
          </section>

          <section>
            <label className="flex flex-col gap-1">
              <span className="font-dot text-[11px] text-me-dim">dinner</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="search"
                autoFocus
                placeholder="souvlaki, crunchwrap…"
                className={FIELD}
              />
            </label>

            <ul className="bevel-in mt-2 max-h-64 overflow-y-auto bg-me-void">
              {shown.map((option) => (
                <li key={option.id} className="border-t border-me-edge-lo first:border-t-0">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => choose(option.id)}
                    className={`block w-full px-2.5 py-2 text-left text-[13px] hover:bg-me-bar focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-me-gold ${
                      option.id === day.dinner_recipe_id ? "text-me-gold" : "text-me-ink"
                    }`}
                  >
                    {option.name}
                    {option.id === day.dinner_recipe_id ? (
                      <span className="ml-2 font-dot text-[10px]">on this day</span>
                    ) : null}
                  </button>
                </li>
              ))}
              {!shown.length ? (
                <li className="px-2.5 py-2 text-[12px] text-me-dim">
                  No dish matches that.
                </li>
              ) : null}
            </ul>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="bevel-out bg-me-bar px-3 py-1.5 font-dot text-[12px] leading-none text-me-ink hover:bg-me-edge-hi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold active:bevel-in"
            >
              done
            </button>
            {day.dinner_recipe_id ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => choose(null)}
                className="rounded-xs font-dot text-[11px] text-me-dim underline underline-offset-2 hover:text-me-live focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
              >
                no dinner this day
              </button>
            ) : null}
            <span className="ml-auto text-[11px] text-me-dim">
              Rebuild the list after changing dinners.
            </span>
          </div>
        </div>
          </>
        ) : null}
      </dialog>
    </>
  );
}

/**
 * The kinds of day, and room to invent one.
 *
 * Types already in use come first as chips, because after the first week of a
 * month the answer is nearly always one you have used before. The text box is
 * for the other times, and what it adds becomes a chip for every day after it.
 */
function TypeRow({
  current,
  known,
  onToggle,
  busy,
}: {
  current: string[];
  known: string[];
  onToggle: (tag: string) => void;
  busy: boolean;
}) {
  const [fresh, setFresh] = useState("");
  const all = [...new Set([...known, ...current])].sort();

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {all.map((tag) => {
        const on = current.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            aria-pressed={on}
            disabled={busy}
            onClick={() => onToggle(tag)}
            className={`border px-2 py-1 font-dot text-[11px] leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold ${
              on
                ? "border-me-gold bg-me-gold/15 text-me-gold"
                : "border-me-edge-lo text-me-dim hover:border-me-edge-hi hover:text-me-ink"
            }`}
          >
            {tag}
          </button>
        );
      })}

      <input
        value={fresh}
        onChange={(event) => setFresh(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          const tag = fresh.trim();
          if (!tag) return;
          onToggle(tag);
          setFresh("");
        }}
        placeholder="new kind…"
        aria-label="Add a kind of day"
        className={`${FIELD} w-28 !text-[11px]`}
      />
    </span>
  );
}

function longDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
