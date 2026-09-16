"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  Bold,
  CheckSquare,
  Italic,
  Link2,
  List,
  Plus,
  Strikethrough,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  deleteNote,
  deleteNotebook,
  saveNote,
  saveNotebook,
} from "@/app/actions/honeymoon";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  SHEET,
  SHEET_FOOTER,
  SelectField,
  TextInput,
} from "./FormParts";
import {
  BOARD_NOTEBOOK,
  noteTitle,
  notePreview,
  notebookAccent,
  notebookTint,
  type Attached,
} from "./notes";
import { PLANNERS, eachDay, formatDayLong } from "./trip";
import { useLiveRefresh } from "./useLiveRefresh";
import type { Note, Notebook, Planner, Trip } from "./types";

/**
 * Somewhere to write that isn't attached to anything.
 *
 * Every other tab starts from a thing — a flight, a night, a card — and hangs
 * text off it. This one starts from the writing. A notebook says whose it is
 * so no note has to be labelled, and the last notebook on the row is the one
 * nobody writes in: the notes already left on days, cards and bookings, which
 * is where they were all going before this tab existed.
 *
 * There is one host login, so an owner colours a notebook rather than locking
 * it. Both of them can open both.
 */
export function NotesView({
  trip,
  notebooks,
  notes: seeded,
  attached,
}: {
  trip: Trip | null;
  notebooks: Notebook[];
  notes: Note[];
  attached: Attached[];
}) {
  // Same mirror as the board: server rows are the truth, adopted during render
  // when they change, with local edits landing instantly in between.
  const [notes, setNotes] = useState(seeded);
  const [seededFrom, setSeededFrom] = useState(seeded);
  if (seededFrom !== seeded) {
    setSeededFrom(seeded);
    setNotes(seeded);
  }

  const [notebookId, setNotebookId] = useState(
    () => notebooks[0]?.id ?? BOARD_NOTEBOOK,
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState<Notebook | "new" | null>(null);
  const [, startTransition] = useTransition();

  // A refresh mid-sentence would take the words out from under her.
  useLiveRefresh(dirty || editing !== null);

  const notebook = notebooks.find((n) => n.id === notebookId) ?? null;
  const onBoard = notebookId === BOARD_NOTEBOOK;
  const inBook = notes.filter((n) => n.notebook_id === notebookId);
  const open = notes.find((n) => n.id === openId) ?? null;
  const days = trip ? eachDay(trip.starts_on, trip.ends_on) : [];

  function keep(saved: Note) {
    setNotes((prev) =>
      prev.some((n) => n.id === saved.id)
        ? prev.map((n) => (n.id === saved.id ? saved : n))
        : [saved, ...prev],
    );
  }

  /**
   * Opening a note also closes the one before it — and a note opened and left
   * untouched is thrown away rather than kept as an "Untitled" nobody wrote.
   */
  function openNote(id: string | null) {
    const leaving = notes.find((n) => n.id === openId);
    if (leaving && !leaving.title.trim() && !leaving.body.trim()) {
      setNotes((prev) => prev.filter((n) => n.id !== leaving.id));
      startTransition(async () => {
        await deleteNote(leaving.id);
      });
    }
    setOpenId(id);
  }

  function startNote() {
    if (onBoard) return;
    startTransition(async () => {
      const { data } = await saveNote(null, notebookId, {
        title: "",
        body: "",
      });
      if (data) {
        keep(data);
        openNote(data.id);
      }
    });
  }

  return (
    <main className="mx-auto mt-10 w-full max-w-6xl">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-border pb-3">
        <h2 className="font-garamond text-3xl text-foreground">
          {onBoard ? "Written on the board" : (notebook?.name ?? "Notes")}
        </h2>
        <p className="font-mono text-[0.7rem] tracking-wide text-muted-foreground tabular-nums slashed-zero">
          {onBoard
            ? `${attached.length} ${attached.length === 1 ? "note" : "notes"} on days, cards and bookings`
            : `${inBook.length} ${inBook.length === 1 ? "note" : "notes"}`}
        </p>
      </div>

      <nav
        aria-label="Notebooks"
        className="rail-scroll mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {notebooks.map((book) => {
          const on = book.id === notebookId;
          return (
            <button
              key={book.id}
              type="button"
              aria-current={on ? "true" : undefined}
              onClick={() => {
                setNotebookId(book.id);
                openNote(null);
              }}
              onDoubleClick={() => setEditing(book)}
              style={
                on
                  ? {
                      backgroundColor: notebookTint(book.owner),
                      borderColor: notebookAccent(book.owner),
                      color: notebookAccent(book.owner),
                    }
                  : undefined
              }
              className={cn(
                "flex-none rounded-full border px-4 py-1.5 font-raleway text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                on
                  ? "font-semibold"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {book.name}
            </button>
          );
        })}

        <button
          type="button"
          aria-current={onBoard ? "true" : undefined}
          onClick={() => {
            setNotebookId(BOARD_NOTEBOOK);
            openNote(null);
          }}
          title="Notes written on days, cards, hotels, rides and flights"
          className={cn(
            "flex-none rounded-full border border-dashed px-4 py-1.5 font-raleway text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            onBoard
              ? "border-primary bg-secondary font-semibold text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          On the board
        </button>

        <button
          type="button"
          onClick={() => setEditing("new")}
          aria-label="New notebook"
          title="New notebook"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
        </button>
      </nav>

      {notebook && !onBoard && (
        <p className="mt-2 font-garamond text-sm text-muted-foreground italic">
          {notebook.owner
            ? `${PLANNERS[notebook.owner].label}'s notebook. `
            : "Both of yours. "}
          <button
            type="button"
            onClick={() => setEditing(notebook)}
            className="rounded-sm underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Rename it
          </button>
        </p>
      )}

      <div className="mt-5 gap-6 lg:flex">
        {/* On a phone the list is the page until a note is opened. */}
        <div className={cn("lg:w-72 lg:flex-none", open && "max-lg:hidden")}>
          {onBoard ? (
            <AttachedList attached={attached} />
          ) : (
            <>
              <button
                type="button"
                onClick={startNote}
                className="flex w-full items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 font-raleway text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                Write a note
              </button>

              {inBook.length === 0 ? (
                <p className="mt-4 font-garamond text-sm text-muted-foreground/80 italic">
                  Nothing in here yet.
                </p>
              ) : (
                <ol className="mt-3 space-y-1.5">
                  {inBook.map((note) => (
                    <li key={note.id}>
                      <button
                        type="button"
                        onClick={() => openNote(note.id)}
                        className={cn(
                          "w-full rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                          note.id === openId
                            ? "border-primary/50 bg-card"
                            : "border-border/70 hover:border-primary/30",
                        )}
                      >
                        <p className="truncate font-raleway text-sm font-medium text-foreground">
                          {noteTitle(note)}
                        </p>
                        {notePreview(note) && (
                          <p className="mt-0.5 truncate font-garamond text-sm text-muted-foreground">
                            {notePreview(note)}
                          </p>
                        )}
                        <p className="mt-1 font-mono text-[0.6rem] text-muted-foreground/80 tabular-nums slashed-zero">
                          {when(note.updated_at)}
                          {note.on_date && (
                            <> · {formatDayLong(note.on_date)}</>
                          )}
                        </p>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </div>

        {!onBoard && (
          <div className={cn("min-w-0 flex-1", !open && "max-lg:hidden")}>
            {open ? (
              <NoteEditor
                // Switching notes remounts the form rather than reseeding it.
                key={open.id}
                note={open}
                days={days}
                onDirty={setDirty}
                onSaved={keep}
                onClose={() => openNote(null)}
                onDeleted={(id) => {
                  setNotes((prev) => prev.filter((n) => n.id !== id));
                  setOpenId(null);
                  setDirty(false);
                }}
              />
            ) : (
              <div className="flex h-full min-h-72 items-center justify-center rounded-lg border border-dashed border-border">
                <p className="px-6 text-center font-garamond text-lg text-muted-foreground/80 italic">
                  Pick a note, or write a new one.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <NotebookDialog
        editing={editing}
        counts={notes.reduce<Record<string, number>>((all, note) => {
          all[note.notebook_id] = (all[note.notebook_id] ?? 0) + 1;
          return all;
        }, {})}
        onClose={() => setEditing(null)}
        onGone={(id) => {
          setNotes((prev) => prev.filter((n) => n.notebook_id !== id));
          setNotebookId(
            notebooks.find((b) => b.id !== id)?.id ?? BOARD_NOTEBOOK,
          );
          setOpenId(null);
          setEditing(null);
        }}
      />
    </main>
  );
}

/** "Just now", then a time, then a date once it isn't today. */
function when(iso: string): string {
  const at = new Date(iso);
  const mins = Math.round((Date.now() - at.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const today = new Date().toDateString() === at.toDateString();
  return today
    ? at.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : at.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type Draft = { title: string; body: string; on_date: string };

/**
 * One note, open.
 *
 * It saves itself a second after the typing stops, and again when it loses
 * focus or is closed — a note you have to remember to save is a note you lose.
 * If the row changed underneath in the meantime, the server keeps both
 * versions rather than letting one window overwrite the other.
 */
function NoteEditor({
  note,
  days,
  onDirty,
  onSaved,
  onClose,
  onDeleted,
}: {
  note: Note;
  days: string[];
  onDirty: (dirty: boolean) => void;
  onSaved: (note: Note) => void;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Draft>({
    title: note.title,
    body: note.body,
    on_date: note.on_date ?? "",
  });
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(note.updated_at);
  const [merged, setMerged] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [, startTransition] = useTransition();

  const box = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(draft);
  const dirty = useRef(false);
  const version = useRef(note.updated_at);

  async function save(state: Draft) {
    if (timer.current) clearTimeout(timer.current);
    dirty.current = false;
    setSaving(true);
    const { data } = await saveNote(
      note.id,
      note.notebook_id,
      { title: state.title, body: state.body, on_date: state.on_date || null },
      version.current,
    );
    setSaving(false);
    if (!data) return;
    // The other window had written to it; the server kept both.
    if (data.body !== state.body) {
      setDraft((prev) => ({ ...prev, body: data.body }));
      latest.current = { ...latest.current, body: data.body };
      setMerged(true);
    }
    version.current = data.updated_at;
    setSavedAt(data.updated_at);
    onSaved(data);
    onDirty(false);
  }

  function change(next: Partial<Draft>) {
    const state = { ...latest.current, ...next };
    latest.current = state;
    dirty.current = true;
    setDraft(state);
    setMerged(false);
    onDirty(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(state), 1000);
  }

  // Closing the note, or leaving the tab, is a save.
  useEffect(() => {
    return () => {
      if (!dirty.current) return;
      if (timer.current) clearTimeout(timer.current);
      void saveNote(
        note.id,
        note.notebook_id,
        {
          title: latest.current.title,
          body: latest.current.body,
          on_date: latest.current.on_date || null,
        },
        version.current,
      );
    };
  }, [note.id, note.notebook_id]);

  /** Wraps the selection, or drops the marks in ready to type between. */
  function wrap(before: string, after = before) {
    const el = box.current;
    if (!el) return;
    const { selectionStart: from, selectionEnd: to, value } = el;
    const picked = value.slice(from, to);
    const body =
      value.slice(0, from) + before + picked + after + value.slice(to);
    change({ body });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(
        from + before.length,
        from + before.length + picked.length,
      );
    });
  }

  /** Puts a mark at the head of every line the selection touches. */
  function prefix(mark: string) {
    const el = box.current;
    if (!el) return;
    const { selectionStart: from, selectionEnd: to, value } = el;
    const start = value.lastIndexOf("\n", from - 1) + 1;
    const end =
      value.indexOf("\n", to) === -1 ? value.length : value.indexOf("\n", to);
    const lines = value
      .slice(start, end)
      .split("\n")
      .map((line) =>
        line.startsWith(mark) ? line.slice(mark.length) : mark + line,
      );
    const body = value.slice(0, start) + lines.join("\n") + value.slice(end);
    change({ body });
    requestAnimationFrame(() => el.focus());
  }

  function keys(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(e.metaKey || e.ctrlKey)) return;
    const key = e.key.toLowerCase();
    if (key === "b") {
      e.preventDefault();
      wrap("**");
    } else if (key === "i") {
      e.preventDefault();
      wrap("_");
    } else if (key === "k") {
      e.preventDefault();
      wrap("[", "](https://)");
    }
  }

  return (
    <article className="rounded-lg border border-border bg-card">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={() => {
            if (dirty.current) void save(latest.current);
            onClose();
          }}
          aria-label="Back to the notes"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-ring lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        </button>

        <div className="flex rounded-full border border-border p-0.5">
          {(["write", "read"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={(mode === "read") === reading}
              onClick={() => setReading(mode === "read")}
              className={cn(
                "min-h-8 rounded-full px-3 font-raleway text-[0.65rem] tracking-[0.15em] uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                (mode === "read") === reading
                  ? "bg-secondary text-primary"
                  : "text-muted-foreground",
              )}
            >
              {mode === "write" ? "Write" : "Read"}
            </button>
          ))}
        </div>

        {!reading && (
          <div className="flex items-center gap-0.5">
            <Mark label="Bold" onClick={() => wrap("**")} hint="⌘B">
              <Bold className="h-3.5 w-3.5" strokeWidth={2.25} />
            </Mark>
            <Mark label="Italic" onClick={() => wrap("_")} hint="⌘I">
              <Italic className="h-3.5 w-3.5" strokeWidth={2.25} />
            </Mark>
            <Mark label="Strikethrough" onClick={() => wrap("~~")}>
              <Strikethrough className="h-3.5 w-3.5" strokeWidth={2.25} />
            </Mark>
            <Mark
              label="Link"
              onClick={() => wrap("[", "](https://)")}
              hint="⌘K"
            >
              <Link2 className="h-3.5 w-3.5" strokeWidth={2.25} />
            </Mark>
            <Mark label="Bullets" onClick={() => prefix("- ")}>
              <List className="h-3.5 w-3.5" strokeWidth={2.25} />
            </Mark>
            <Mark label="Checkbox" onClick={() => prefix("- [ ] ")}>
              <CheckSquare className="h-3.5 w-3.5" strokeWidth={2.25} />
            </Mark>
          </div>
        )}

        <p className="ml-auto font-mono text-[0.6rem] text-muted-foreground tabular-nums slashed-zero">
          {saving ? "Saving…" : savedAt ? `Saved ${when(savedAt)}` : ""}
        </p>

        <button
          type="button"
          onClick={() => {
            if (!confirming) {
              setConfirming(true);
              return;
            }
            startTransition(async () => {
              await deleteNote(note.id);
              onDeleted(note.id);
            });
          }}
          onBlur={() => setConfirming(false)}
          className={cn(
            "flex h-8 items-center gap-1 rounded-md px-2 font-raleway text-[0.65rem] transition-colors focus-visible:outline-2 focus-visible:outline-ring",
            confirming
              ? "bg-warn/10 text-warn"
              : "text-muted-foreground hover:text-warn",
          )}
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          {confirming ? "Delete it?" : "Delete"}
        </button>
      </header>

      {merged && (
        <p className="border-b border-border bg-pending/5 px-4 py-2 font-garamond text-sm text-pending">
          This note changed in another window while you were writing. Both
          versions are in here — the other one is below the line.
        </p>
      )}

      <div className="px-4 pt-3 pb-4 sm:px-6">
        <input
          value={draft.title}
          onChange={(e) => change({ title: e.target.value })}
          onBlur={() => dirty.current && void save(latest.current)}
          placeholder="Title"
          aria-label="Title"
          className="w-full bg-transparent font-garamond text-2xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />

        <div className="mt-1 flex flex-wrap items-center gap-2 border-b border-border/70 pb-3">
          <label className="font-raleway text-[0.65rem] tracking-[0.15em] text-muted-foreground uppercase">
            About a day
          </label>
          <select
            value={draft.on_date}
            onChange={(e) => change({ on_date: e.target.value })}
            className="rounded-md border border-border bg-card px-2 py-1 font-mono text-[0.7rem] text-foreground tabular-nums slashed-zero focus-visible:outline-2 focus-visible:outline-ring"
          >
            <option value="">No day — keep it loose</option>
            {days.map((day) => (
              <option key={day} value={day}>
                {formatDayLong(day)}
              </option>
            ))}
          </select>
          {draft.on_date && (
            <Link
              href={`/honeymoon?day=${draft.on_date}`}
              className="font-raleway text-[0.65rem] text-primary underline-offset-4 hover:underline"
            >
              Open that day
            </Link>
          )}
        </div>

        {reading ? (
          <div className="mt-4 min-h-72">
            {draft.body.trim() ? (
              <NoteBody
                body={draft.body}
                onTick={(line) =>
                  change({ body: toggleTask(draft.body, line) })
                }
              />
            ) : (
              <p className="font-garamond text-lg text-muted-foreground/70 italic">
                Nothing written yet.
              </p>
            )}
          </div>
        ) : (
          <textarea
            ref={box}
            value={draft.body}
            onChange={(e) => change({ body: e.target.value })}
            onBlur={() => dirty.current && void save(latest.current)}
            onKeyDown={keys}
            placeholder="Write anything. **bold**, _italic_, - lists, - [ ] checkboxes."
            aria-label="Note"
            className="mt-4 min-h-72 w-full resize-y bg-transparent font-garamond text-lg leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          />
        )}
      </div>
    </article>
  );
}

function Mark({
  label,
  hint,
  onClick,
  children,
}: {
  label: string;
  hint?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={hint ? `${label} (${hint})` : label}
      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
    >
      {children}
    </button>
  );
}

/**
 * Ticks the nth checkbox in the note, counting the way they're drawn. Read
 * view checkboxes are the note itself, not a preview of it: a packing list you
 * can't tick is a picture of a packing list.
 */
export function toggleTask(body: string, nth: number): string {
  let seen = -1;
  return body
    .split("\n")
    .map((line) => {
      if (!/^\s*[-*+]\s+\[[ xX]\]/.test(line)) return line;
      seen += 1;
      if (seen !== nth) return line;
      return line.replace(
        /^(\s*[-*+]\s+\[)([ xX])(\])/,
        (_, open, mark, close) =>
          mark === " " ? `${open}x${close}` : `${open} ${close}`,
      );
    })
    .join("\n");
}

/**
 * A note, read. The planner sets prose in Garamond, so markdown lands in the
 * same voice as the rest of the trip rather than a document viewer's.
 *
 * Every class merges with the one react-markdown supplies rather than
 * replacing it — GFM marks a task list's own `ul` and `li`, and spreading its
 * props over the styles dropped the bullets from every list with a checkbox
 * in it.
 */
export function NoteBody({
  body,
  onTick,
}: {
  body: string;
  /** Left out where the note is only being shown, as in the board notebook. */
  onTick?: (nth: number) => void;
}) {
  const box = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={box}
      className="max-w-[68ch] font-garamond text-lg leading-relaxed text-foreground"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ className, ...props }) => (
            <h3
              className={cn(
                "mt-5 mb-1 font-raleway text-lg font-semibold first:mt-0",
                className,
              )}
              {...props}
            />
          ),
          h2: ({ className, ...props }) => (
            <h4
              className={cn(
                "mt-5 mb-1 font-raleway text-base font-semibold first:mt-0",
                className,
              )}
              {...props}
            />
          ),
          h3: ({ className, ...props }) => (
            <h5
              className={cn(
                "mt-4 mb-1 font-raleway text-sm font-semibold tracking-wide first:mt-0",
                className,
              )}
              {...props}
            />
          ),
          p: ({ className, ...props }) => (
            <p className={cn("my-2 first:mt-0", className)} {...props} />
          ),
          ul: ({ className, ...props }) => (
            <ul
              className={cn("my-2 list-disc space-y-1 pl-5", className)}
              {...props}
            />
          ),
          ol: ({ className, ...props }) => (
            <ol
              className={cn("my-2 list-decimal space-y-1 pl-5", className)}
              {...props}
            />
          ),
          li: ({ className, ...props }) => (
            <li
              className={cn(
                "leading-snug",
                // Only the ticked lines lose their bullet — the plain ones in
                // the same list keep theirs.
                className?.includes("task-list-item") && "-ml-5 list-none",
                className,
              )}
              {...props}
            />
          ),
          input: ({ className, ...props }) => (
            <input
              {...props}
              type="checkbox"
              disabled={!onTick}
              // Counted off the page rather than the markdown: which box was
              // clicked is a question the DOM can answer exactly.
              onChange={(e) => {
                const boxes = Array.from(
                  box.current?.querySelectorAll('input[type="checkbox"]') ?? [],
                );
                const nth = boxes.indexOf(e.currentTarget);
                if (nth >= 0) onTick?.(nth);
              }}
              className={cn(
                "mr-2 h-3.5 w-3.5 translate-y-px accent-ready",
                onTick && "cursor-pointer",
                className,
              )}
            />
          ),
          a: ({ href, className, ...props }) => (
            <a
              href={href}
              target={href?.startsWith("/") ? undefined : "_blank"}
              rel="noreferrer"
              className={cn(
                "text-primary underline underline-offset-4",
                className,
              )}
              {...props}
            />
          ),
          blockquote: ({ className, ...props }) => (
            <blockquote
              className={cn(
                "my-3 border-l-2 border-border pl-3 text-muted-foreground italic",
                className,
              )}
              {...props}
            />
          ),
          code: ({ className, ...props }) => (
            <code
              className={cn(
                "rounded-sm bg-secondary px-1 font-mono text-[0.85em]",
                className,
              )}
              {...props}
            />
          ),
          hr: () => <hr className="my-4 border-border" />,
          del: ({ className, ...props }) => (
            <del
              className={cn("text-muted-foreground", className)}
              {...props}
            />
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}

/** The built-in notebook: notes living on days, cards and bookings. */
function AttachedList({ attached }: { attached: Attached[] }) {
  if (attached.length === 0) {
    return (
      <p className="font-garamond text-sm text-muted-foreground/80 italic">
        Nothing written on a day, a card or a booking yet.
      </p>
    );
  }

  return (
    <ol className="grid gap-2 lg:w-[52rem] lg:grid-cols-2">
      {attached.map((note) => (
        <li key={note.key}>
          <Link
            href={note.href}
            className="block rounded-md border border-border/70 px-3 py-2 transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <p className="flex items-baseline gap-2">
              <span className="font-raleway text-[0.6rem] tracking-[0.15em] text-muted-foreground uppercase">
                {note.where}
              </span>
              <span className="truncate font-raleway text-sm font-medium text-foreground">
                {note.title}
              </span>
            </p>
            <p className="mt-1 line-clamp-3 font-garamond text-sm text-muted-foreground">
              {note.note}
            </p>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** "Together" as a select value, since Radix reserves the empty string. */
const SHARED = "__together__";

/** Making a notebook, renaming one, or getting rid of one. */
function NotebookDialog({
  editing,
  counts,
  onClose,
  onGone,
}: {
  editing: Notebook | "new" | null;
  counts: Record<string, number>;
  onClose: () => void;
  onGone: (id: string) => void;
}) {
  return (
    <Dialog open={editing !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn(SHEET, "sm:max-w-sm")}>
        {/* Keyed on what's being edited, so opening another notebook starts
            from that notebook rather than the last one's half-typed name. */}
        {editing && (
          <NotebookForm
            key={editing === "new" ? "new" : editing.id}
            book={editing === "new" ? null : editing}
            held={editing === "new" ? 0 : (counts[editing.id] ?? 0)}
            onClose={onClose}
            onGone={onGone}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function NotebookForm({
  book,
  held,
  onClose,
  onGone,
}: {
  book: Notebook | null;
  /** How many notes would go with it. */
  held: number;
  onClose: () => void;
  onGone: (id: string) => void;
}) {
  const [name, setName] = useState(book?.name ?? "");
  // A Radix select item can't carry an empty string, so shared has a name of
  // its own here — the same trick as the pile's `__pool__` on the card form.
  const [owner, setOwner] = useState<Planner | typeof SHARED>(
    book?.owner ?? SHARED,
  );
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, startTransition] = useTransition();

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-garamond text-2xl">
          {book ? "This notebook" : "A new notebook"}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-3 px-1">
        <Field label="Name">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </Field>
        <Field
          label="Whose"
          hint="Only the colour and the label. You can both open all of them."
        >
          <SelectField
            value={owner}
            onChange={(v) => setOwner(v as Planner | typeof SHARED)}
            options={[
              { value: SHARED, label: "Together" },
              { value: "savea", label: PLANNERS.savea.label },
              { value: "aaron", label: PLANNERS.aaron.label },
            ]}
          />
        </Field>
        {error && <p className="font-garamond text-sm text-warn">{error}</p>}
      </div>

      <DialogFooter className={SHEET_FOOTER}>
        {book && (
          <button
            type="button"
            onClick={() => {
              if (!confirming) {
                setConfirming(true);
                return;
              }
              startTransition(async () => {
                const { error: failed } = await deleteNotebook(book.id);
                if (failed) setError(failed);
                else onGone(book.id);
              });
            }}
            className={cn(
              "mr-auto rounded-md px-2 py-1 font-raleway text-xs transition-colors",
              confirming
                ? "bg-warn/10 text-warn"
                : "text-muted-foreground hover:text-warn",
            )}
          >
            {confirming
              ? held > 0
                ? `Delete it and ${held} ${held === 1 ? "note" : "notes"}?`
                : "Delete it?"
              : "Delete"}
          </button>
        )}
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={() =>
            startTransition(async () => {
              const { error: failed } = await saveNotebook(
                book?.id ?? null,
                name,
                owner === SHARED ? null : owner,
              );
              if (failed) setError(failed);
              else onClose();
            })
          }
          disabled={saving}
        >
          {book ? "Save" : "Make it"}
        </Button>
      </DialogFooter>
    </>
  );
}
