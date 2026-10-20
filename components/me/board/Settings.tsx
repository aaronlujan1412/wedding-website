"use client";

import { useState, useTransition } from "react";
import {
  updateProject,
  setProjectLock,
  createColumn,
  updateColumn,
  moveColumn,
  deleteColumn,
} from "@/app/actions/board";
import type { BoardColumn, BoardProject } from "@/lib/board-types";
import { LockGlyph, BarredGlyph } from "./glyphs";
import { INPUT, INPUT_INLINE, Field } from "./field";

/**
 * Project settings: the lock, the columns, and what the vault is asked for.
 *
 * The column list is the important half. `agent_can_enter` decides whether
 * Claude may move a card into a column on its own, and it is the single flag
 * the oversight model rests on — until this page existed it could only be set
 * by whatever seeded the project, which made the safety story an accident of
 * history rather than a decision anyone had made.
 */

export function Settings({
  project,
  columns,
  cardCounts,
}: {
  project: BoardProject;
  columns: BoardColumn[];
  cardCounts: Record<string, number>;
}) {
  return (
    <div className="space-y-5">
      <ProjectLock project={project} />
      <Details project={project} />
      <Columns project={project} columns={columns} cardCounts={cardCounts} />
    </div>
  );
}

function ProjectLock({ project }: { project: BoardProject }) {
  const [pending, startTransition] = useTransition();
  const locked = Boolean(project.locked_at);

  return (
    <section
      className={`${locked ? "bevel-out border-me-gold" : "bevel-in"} ${
        locked ? "bg-me-panel" : "bg-me-void"
      } p-2.5`}
    >
      <p className="flex items-center gap-1.5 text-[13px] text-me-ink">
        <LockGlyph />
        {locked
          ? "Locked. Claude cannot change anything on this project."
          : "Unlocked. Claude can move cards and post findings here."}
      </p>
      <p className="mt-1 text-[12px] leading-snug text-me-dim">
        A lock only stops the API. You can still do everything from these pages.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => void (await setProjectLock(project.id, !locked)))
        }
        className="mt-2 bevel-out bg-me-panel px-2.5 py-1 text-[12px] text-me-ink disabled:text-me-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
      >
        {locked ? "Unlock the project" : "Lock the project"}
      </button>
    </section>
  );
}

function Details({ project }: { project: BoardProject }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        setError(null);
        setSaved(false);
        startTransition(async () => {
          const result = await updateProject(project.id, {
            name: String(formData.get("name") ?? ""),
            description: String(formData.get("description") ?? ""),
            brain_tags: String(formData.get("brain_tags") ?? "")
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
          });
          if (result.error) setError(result.error);
          else setSaved(true);
        });
      }}
      className="space-y-3"
    >
      <Field label="Name" hint="What this project is called on the board.">
        <input name="name" defaultValue={project.name} className={INPUT} />
      </Field>

      <Field
        label="What this project is"
        hint="Claude reads this before picking up any card in it."
      >
        <textarea
          name="description"
          rows={2}
          defaultValue={project.description ?? ""}
          className={INPUT}
        />
      </Field>

      <Field
        label="Second Brain tags"
        hint="Comma separated. Opening a card pulls the vault notes carrying any of these, so Claude starts with the background instead of asking for it."
      >
        <input
          name="brain_tags"
          defaultValue={(project.brain_tags ?? []).join(", ")}
          placeholder="homelab, cachy, backups"
          className={INPUT}
        />
      </Field>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="bevel-out bg-me-bar px-2.5 py-1 text-[12px] text-me-gold disabled:text-me-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {error ? <span className="text-[12px] text-me-live">{error}</span> : null}
        {saved && !error ? (
          <span className="text-[12px] text-me-dim">Saved.</span>
        ) : null}
      </div>
    </form>
  );
}

function Columns({
  project,
  columns,
  cardCounts,
}: {
  project: BoardProject;
  columns: BoardColumn[];
  cardCounts: Record<string, number>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ error: string | null }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) setError(result.error);
    });
  }

  return (
    <section className="space-y-2">
      <h3 className="font-dot text-[11px] leading-none text-me-gold">Columns</h3>
      <p className="text-[12px] leading-snug text-me-dim">
        A column Claude cannot enter is one only you can move a card into. It
        raises a flag instead, and you accept it. Mark whichever column means
        finished.
      </p>

      <ul className="space-y-1.5">
        {columns.map((column, i) => (
          <li key={column.id} className="bevel-in bg-me-void p-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <input
                defaultValue={column.name}
                onBlur={(e) => {
                  const name = e.currentTarget.value.trim();
                  if (name && name !== column.name) {
                    run(() => updateColumn(column.id, { name }));
                  }
                }}
                className={`w-40 ${INPUT_INLINE}`}
              />
              <span className="text-[12px] text-me-dim">
                {cardCounts[column.id] ?? 0} cards
              </span>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  disabled={pending || i === 0}
                  onClick={() => run(() => moveColumn(column.id, "left"))}
                  aria-label={`Move ${column.name} left`}
                  className="px-1 text-[12px] text-me-dim hover:text-me-ink disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
                >
                  &larr;
                </button>
                <button
                  type="button"
                  disabled={pending || i === columns.length - 1}
                  onClick={() => run(() => moveColumn(column.id, "right"))}
                  aria-label={`Move ${column.name} right`}
                  className="px-1 text-[12px] text-me-dim hover:text-me-ink disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
                >
                  &rarr;
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => deleteColumn(column.id))}
                  className="text-[12px] text-me-dim hover:text-me-live focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
                >
                  Remove
                </button>
              </div>
            </div>

            <label className="mt-1.5 flex items-start gap-1.5 text-[12px] leading-snug text-me-ink">
              <input
                type="checkbox"
                checked={!column.agent_can_enter}
                disabled={pending}
                onChange={(e) =>
                  run(() =>
                    updateColumn(column.id, { agent_can_enter: !e.target.checked }),
                  )
                }
                className="mt-0.5"
              />
              <span className="flex items-center gap-1.5">
                {!column.agent_can_enter ? <BarredGlyph /> : null}
                Only I can move cards here
              </span>
            </label>
          </li>
        ))}
      </ul>

      {error ? <p className="text-[12px] text-me-live">{error}</p> : null}

      {adding ? (
        <form
          action={(formData) => {
            setAdding(false);
            run(() => createColumn(project.id, String(formData.get("name") ?? "")));
          }}
          className="flex gap-2"
        >
          <input
            name="name"
            autoFocus
            placeholder="Column name"
            className={`w-40 ${INPUT}`}
          />
          <button
            type="submit"
            className="bevel-out bg-me-bar px-2.5 py-1 text-[12px] text-me-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="text-[12px] text-me-dim hover:text-me-ink"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-[12px] text-me-dim hover:text-me-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-me-gold"
        >
          + Add a column
        </button>
      )}
    </section>
  );
}


