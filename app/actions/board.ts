"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { currentOwner } from "@/lib/site-user";
import { positionBetween } from "@/lib/board-types";
import type { BoardCard } from "@/lib/board-types";

/**
 * The board's writes.
 *
 * Every export here is a public POST endpoint, so every one of them checks
 * `currentOwner()` first — the page's own gate is not a guarantee for an action
 * invocation. Same rule as the rest of the site: the proxy guards pages, and
 * anything that touches data guards itself.
 *
 * These are Aaron's writes, from the browser. Claude's go through
 * `/api/board/*`, which has its own rules about locks and terminal columns.
 * Aaron is not subject to either — the lock is a lock against the agent.
 */

type Result<T> = { data: T | null; error: string | null };

const DENIED = "You are not signed in as the owner.";

async function owner() {
  return currentOwner();
}

function refresh(cardId?: string) {
  revalidatePath("/me/board");
  if (cardId) revalidatePath(`/me/board/${cardId}`);
}

export async function createCard(
  projectId: string,
  columnId: string,
  title: string,
): Promise<Result<BoardCard>> {
  if (!(await owner())) return { data: null, error: DENIED };

  const clean = title.trim();
  if (!clean) return { data: null, error: "A card needs a title." };

  // Bottom of the column. Read only the last row rather than the whole lane.
  const { data: last } = await supabase
    .from("board_cards")
    .select("position")
    .eq("column_id", columnId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("board_cards")
    .insert({
      project_id: projectId,
      column_id: columnId,
      title: clean,
      position: positionBetween(last?.position ?? undefined, undefined),
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  refresh();
  return { data, error: null };
}

export async function updateCard(
  id: string,
  patch: { title?: string; body?: string; summary?: string; labels?: string[] },
): Promise<Result<BoardCard>> {
  if (!(await owner())) return { data: null, error: DENIED };

  const { data, error } = await supabase
    .from("board_cards")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  refresh();
  return { data, error: null };
}

/**
 * Move a card, and place it precisely.
 *
 * `before` and `after` are the positions of the cards it lands between, which
 * the client already knows from what is on screen. Sending them keeps this one
 * UPDATE — the alternative is re-reading the lane here and guessing at an
 * order the browser has already decided.
 */
export async function moveCard(
  id: string,
  columnId: string,
  before?: number,
  after?: number,
): Promise<Result<BoardCard>> {
  if (!(await owner())) return { data: null, error: DENIED };

  const { data, error } = await supabase
    .from("board_cards")
    .update({
      column_id: columnId,
      position: positionBetween(before, after),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  refresh();
  return { data, error: null };
}

export async function deleteCard(id: string): Promise<Result<true>> {
  if (!(await owner())) return { data: null, error: DENIED };

  const { error } = await supabase.from("board_cards").delete().eq("id", id);
  if (error) return { data: null, error: error.message };
  refresh();
  return { data: true, error: null };
}

/** The padlock. Null clears it. */
export async function setCardLock(
  id: string,
  locked: boolean,
): Promise<Result<BoardCard>> {
  if (!(await owner())) return { data: null, error: DENIED };

  const { data, error } = await supabase
    .from("board_cards")
    .update({
      locked_at: locked ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  refresh();
  return { data, error: null };
}

export async function setProjectLock(
  id: string,
  locked: boolean,
): Promise<Result<true>> {
  if (!(await owner())) return { data: null, error: DENIED };

  const { error } = await supabase
    .from("board_projects")
    .update({
      locked_at: locked ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { data: null, error: error.message };
  refresh();
  return { data: true, error: null };
}

/**
 * Accept what Claude proposed, or wave it off.
 *
 * Accepting a `complete` moves the card into the column the flag was raised
 * against; accepting a `delete` removes it. Dismissing only clears the flag and
 * leaves the card exactly where it was — the proposal was wrong, not the work.
 */
export async function resolveReview(
  id: string,
  outcome: "accept" | "dismiss",
  completeColumnId?: string,
): Promise<Result<true>> {
  if (!(await owner())) return { data: null, error: DENIED };

  const { data: card } = await supabase
    .from("board_cards")
    .select("review_kind")
    .eq("id", id)
    .maybeSingle();

  if (!card) return { data: null, error: "That card is gone." };

  if (outcome === "accept" && card.review_kind === "delete") {
    const { error } = await supabase.from("board_cards").delete().eq("id", id);
    if (error) return { data: null, error: error.message };
    refresh();
    return { data: true, error: null };
  }

  const clearing = {
    review_kind: null,
    review_note: null,
    review_at: null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("board_cards")
    .update(
      outcome === "accept" && card.review_kind === "complete" && completeColumnId
        ? { ...clearing, column_id: completeColumnId }
        : clearing,
    )
    .eq("id", id);

  if (error) return { data: null, error: error.message };
  refresh();
  return { data: true, error: null };
}

/**
 * Answer one of Claude's questions.
 *
 * The answer is a thread row of its own pointing back at the question, rather
 * than a field on it. Two reasons: the thread stays readable top to bottom as
 * a conversation, and `/api/board/work` finds answers by querying for them
 * instead of re-reading every question to see which grew a field.
 *
 * Picking an option is the common case and writes that option's label as the
 * body, so the thread reads as a sentence either way — "Symlink it" rather
 * than a bare id nobody can interpret six weeks later.
 */
export async function answerQuestion(
  questionId: string,
  body: string,
  optionId?: string,
): Promise<Result<true>> {
  if (!(await owner())) return { data: null, error: DENIED };

  const { data: question } = await supabase
    .from("board_thread")
    .select("project_id, card_id, options, status")
    .eq("id", questionId)
    .maybeSingle();

  if (!question) return { data: null, error: "That question is gone." };
  if (question.status !== "open") {
    return { data: null, error: "That one has already been answered." };
  }

  const options = (question.options ?? []) as { id: string; label: string }[];
  const picked = optionId ? options.find((o) => o.id === optionId) : undefined;

  if (optionId && !picked) {
    return { data: null, error: "That option is not on this question." };
  }

  const typed = body.trim();
  if (!typed && !picked) {
    return { data: null, error: "Pick an option, or write an answer." };
  }

  // Both: the option is the decision, the typed text is the caveat on it.
  const text = picked && typed ? `${picked.label} — ${typed}` : (typed || picked!.label);

  const { error: insertError } = await supabase.from("board_thread").insert({
    project_id: question.project_id,
    card_id: question.card_id,
    author: "aaron",
    kind: "answer",
    body: text,
    answer_option_id: picked?.id ?? null,
    parent_id: questionId,
    status: "answered",
  });

  if (insertError) return { data: null, error: insertError.message };

  const { error: closeError } = await supabase
    .from("board_thread")
    .update({ status: "answered", answered_at: new Date().toISOString() })
    .eq("id", questionId);

  if (closeError) return { data: null, error: closeError.message };

  refresh(question.card_id ?? undefined);
  return { data: true, error: null };
}

/** Wave a question away without answering it. */
export async function dropQuestion(questionId: string): Promise<Result<true>> {
  if (!(await owner())) return { data: null, error: DENIED };

  const { data, error } = await supabase
    .from("board_thread")
    .update({ status: "dropped", answered_at: new Date().toISOString() })
    .eq("id", questionId)
    .eq("status", "open")
    .select("card_id")
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  refresh(data?.card_id ?? undefined);
  return { data: true, error: null };
}

/** A note from Aaron on a card — the other half of the thread. */
export async function addNote(
  cardId: string,
  projectId: string,
  body: string,
): Promise<Result<true>> {
  if (!(await owner())) return { data: null, error: DENIED };

  const text = body.trim();
  if (!text) return { data: null, error: "Nothing to add." };

  const { error } = await supabase.from("board_thread").insert({
    project_id: projectId,
    card_id: cardId,
    author: "aaron",
    kind: "note",
    body: text,
    status: "answered",
  });

  if (error) return { data: null, error: error.message };
  refresh(cardId);
  return { data: true, error: null };
}
