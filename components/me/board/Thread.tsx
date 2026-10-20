"use client";

import { useState, useTransition } from "react";
import { answerQuestion, dropQuestion, addNote } from "@/app/actions/board";
import type { BoardThreadItem, ThreadOption } from "@/lib/board-types";

/**
 * A card's thread, read as a forum thread: posts down the page, oldest first,
 * each one saying who wrote it.
 *
 * The open questions are the point. Everything else is history Claude left
 * behind, which matters only when you want to know how something got decided;
 * a question is the one thing here waiting on a person, so it is the one thing
 * drawn in the alert pink and given buttons.
 *
 * An answered question keeps its answer directly beneath it rather than
 * letting the reply float off down the page — the pair is the record, and a
 * decision separated from what it was deciding is most of the way to useless.
 */

export function Thread({
  items,
  cardId,
  projectId,
}: {
  items: BoardThreadItem[];
  cardId: string;
  projectId: string;
}) {
  const answersByQuestion = new Map<string, BoardThreadItem>();
  for (const item of items) {
    if (item.kind === "answer" && item.parent_id) {
      answersByQuestion.set(item.parent_id, item);
    }
  }

  // Answers are drawn under their question, so they are not also posts.
  const posts = items.filter((i) => i.kind !== "answer");

  return (
    <div className="space-y-2">
      {posts.length === 0 ? (
        <p className="text-[13px] text-me-dim">
          Nothing on this card yet. Claude writes here as it works.
        </p>
      ) : (
        <ol className="space-y-2">
          {posts.map((post) => (
            <li key={post.id}>
              <Post post={post} answer={answersByQuestion.get(post.id) ?? null} />
            </li>
          ))}
        </ol>
      )}

      <NoteBox cardId={cardId} projectId={projectId} />
    </div>
  );
}

function Post({
  post,
  answer,
}: {
  post: BoardThreadItem;
  answer: BoardThreadItem | null;
}) {
  const open = post.kind === "question" && post.status === "open";

  return (
    <article
      className={`${open ? "bevel-out bg-me-panel" : "bevel-in bg-me-void"} p-2.5`}
    >
      <p className="mb-1 font-dot text-[11px] leading-none text-me-dim">
        {post.author === "claude" ? "claude" : "you"}
        <span className="text-me-edge-hi"> · </span>
        <span className={open ? "text-me-live" : ""}>
          {open ? "asking" : post.kind}
        </span>
      </p>

      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-me-ink">
        {post.body}
      </p>

      {open ? (
        <AnswerForm
          questionId={post.id}
          options={(post.options ?? []) as ThreadOption[]}
        />
      ) : null}

      {answer ? (
        <div className="mt-2 border-t-2 border-me-edge-lo pt-2">
          <p className="mb-1 font-dot text-[11px] leading-none text-me-dim">
            you answered
          </p>
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-me-ink">
            {answer.body}
          </p>
        </div>
      ) : null}

      {post.kind === "question" && post.status === "dropped" ? (
        <p className="mt-2 text-[12px] text-me-dim">Waved off.</p>
      ) : null}
    </article>
  );
}

function AnswerForm({
  questionId,
  options,
}: {
  questionId: string;
  options: ThreadOption[];
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    const body = String(formData.get("body") ?? "");
    setError(null);
    startTransition(async () => {
      const result = await answerQuestion(questionId, body, picked ?? undefined);
      if (result.error) setError(result.error);
      else setPicked(null);
    });
  }

  return (
    <form action={submit} className="mt-2.5 space-y-2">
      {options.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setPicked(picked === option.id ? null : option.id)}
              aria-pressed={picked === option.id}
              className={`max-w-[15rem] px-2 py-1.5 text-left text-[12px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold ${
                picked === option.id
                  ? "bevel-in bg-me-void text-me-gold"
                  : "bevel-out bg-me-panel text-me-ink"
              }`}
            >
              {option.label}
              {/* Drawn, not a title attribute. The trade-off between two
                  options is the thing being decided, and a tooltip is
                  invisible on a phone and to anyone not hovering. */}
              {option.detail ? (
                <span className="mt-0.5 block text-[11px] leading-snug text-me-dim">
                  {option.detail}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      <textarea
        name="body"
        rows={2}
        placeholder={
          options.length > 0
            ? "Anything to add? (optional once you've picked)"
            : "Your answer"
        }
        className="w-full bevel-in bg-me-void px-2 py-1.5 text-[13px] leading-relaxed text-me-ink placeholder:text-me-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
      />

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="bevel-out bg-me-bar px-2.5 py-1 text-[12px] text-me-gold disabled:text-me-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
        >
          {pending ? "Sending…" : "Answer"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => void (await dropQuestion(questionId)))}
          className="text-[12px] text-me-dim hover:text-me-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
        >
          Wave it off
        </button>
        {error ? <span className="text-[12px] text-me-live">{error}</span> : null}
      </div>
    </form>
  );
}

function NoteBox({ cardId, projectId }: { cardId: string; projectId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[12px] text-me-dim hover:text-me-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
      >
        + Add a note
      </button>
    );
  }

  return (
    <form
      action={(formData) => {
        const body = String(formData.get("body") ?? "");
        setOpen(false);
        startTransition(async () => void (await addNote(cardId, projectId, body)));
      }}
      className="space-y-2"
    >
      <textarea
        name="body"
        rows={3}
        autoFocus
        placeholder="Something Claude should know before it picks this up."
        className="w-full bevel-in bg-me-void px-2 py-1.5 text-[13px] leading-relaxed text-me-ink placeholder:text-me-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="bevel-out bg-me-bar px-2.5 py-1 text-[12px] text-me-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
        >
          Add it
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[12px] text-me-dim hover:text-me-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
