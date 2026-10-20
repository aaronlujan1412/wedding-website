"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { chooseProject, createProject } from "@/app/actions/board";
import type { BoardProject } from "@/lib/board-types";
import { LockGlyph } from "./glyphs";

/**
 * Which board you are looking at, and how to start another.
 *
 * Drawn as one row of names rather than a dropdown. A select hides what else
 * exists behind a click, and on a site with a handful of projects the whole
 * set fits on a line — the same reasoning that makes the tool tabs above it
 * plain text instead of a menu.
 *
 * Renders nothing when there is only one project and nothing to switch to; a
 * chooser with one option is furniture.
 */

export function ProjectBar({
  current,
  projects,
}: {
  current: BoardProject;
  projects: BoardProject[];
}) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const others = projects.filter((p) => p.id !== current.id);
  const alone = others.length === 0;

  if (alone && !adding) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
        <SettingsLink />
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-[12px] text-me-dim hover:text-me-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-me-gold"
        >
          + New project
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {!adding ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
          {projects.map((project) => {
            const active = project.id === current.id;
            return (
              <button
                key={project.id}
                type="button"
                disabled={pending || active}
                onClick={() =>
                  startTransition(async () => void (await chooseProject(project.slug)))
                }
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-1 rounded-xs font-dot text-[12px] leading-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-me-gold ${
                  active
                    ? "text-me-gold underline underline-offset-4"
                    : "text-me-dim hover:text-me-ink"
                }`}
              >
                {project.locked_at ? <LockGlyph /> : null}
                {project.name}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-[12px] text-me-dim hover:text-me-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-me-gold"
          >
            + New
          </button>

          <span className="ml-auto">
            <SettingsLink />
          </span>
        </div>
      ) : (
        <form
          action={(formData) => {
            setError(null);
            const name = String(formData.get("name") ?? "");
            startTransition(async () => {
              const result = await createProject(name);
              if (result.error) setError(result.error);
              else setAdding(false);
            });
          }}
          className="flex flex-wrap items-center gap-2 px-1"
        >
          <input
            name="name"
            autoFocus
            placeholder="What is this project?"
            className="w-56 bevel-in bg-me-void px-2 py-1 text-[13px] text-me-ink placeholder:text-me-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
          />
          <button
            type="submit"
            disabled={pending}
            className="bevel-out bg-me-bar px-2.5 py-1 text-[12px] text-me-gold disabled:text-me-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
          >
            {pending ? "Creating…" : "Create"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setError(null);
            }}
            className="text-[12px] text-me-dim hover:text-me-ink"
          >
            Cancel
          </button>
          {error ? (
            <span className="text-[12px] text-me-live">{error}</span>
          ) : (
            <span className="text-[12px] text-me-dim">
              It starts with Backlog, Next up, In progress and Done.
            </span>
          )}
        </form>
      )}
    </div>
  );
}

function SettingsLink() {
  return (
    <Link
      href="/me/board/settings"
      className="text-[12px] text-me-dim hover:text-me-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-me-gold"
    >
      Settings
    </Link>
  );
}
