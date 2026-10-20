"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { BOARD_COOKIE } from "@/lib/board-cookie";
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

/* ---------------------------------------------------------------------------
 * Project and column settings.
 *
 * Columns are the reason this exists rather than being seed-only: a column's
 * `agent_can_enter` is what stops Claude marking work finished, and a safety
 * flag that can only be set by whoever wrote the seed script is not a setting,
 * it is an accident of history.
 * ------------------------------------------------------------------------- */

export async function updateProject(
  id: string,
  patch: { name?: string; description?: string; brain_tags?: string[] },
): Promise<Result<true>> {
  if (!(await owner())) return { data: null, error: DENIED };

  if (patch.name !== undefined && !patch.name.trim()) {
    return { data: null, error: "A project needs a name." };
  }

  const { error } = await supabase
    .from("board_projects")
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.description !== undefined
        ? { description: patch.description.trim() || null }
        : {}),
      ...(patch.brain_tags !== undefined ? { brain_tags: patch.brain_tags } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { data: null, error: error.message };
  refresh();
  revalidatePath("/me/board/settings");
  return { data: true, error: null };
}

export async function createColumn(
  projectId: string,
  name: string,
): Promise<Result<true>> {
  if (!(await owner())) return { data: null, error: DENIED };

  const clean = name.trim();
  if (!clean) return { data: null, error: "A column needs a name." };

  const { data: last } = await supabase
    .from("board_columns")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  // The key is only a stable handle for code that cares (the seed, a future
  // import). The name is what anyone reads, and renaming must not break it.
  const key = `${clean.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "column"}-${Date.now().toString(36)}`;

  const { error } = await supabase.from("board_columns").insert({
    project_id: projectId,
    key,
    name: clean,
    position: (last?.position ?? -1) + 1,
  });

  if (error) return { data: null, error: error.message };
  refresh();
  revalidatePath("/me/board/settings");
  return { data: true, error: null };
}

export async function updateColumn(
  id: string,
  patch: { name?: string; agent_can_enter?: boolean },
): Promise<Result<true>> {
  if (!(await owner())) return { data: null, error: DENIED };

  if (patch.name !== undefined && !patch.name.trim()) {
    return { data: null, error: "A column needs a name." };
  }

  const { error } = await supabase
    .from("board_columns")
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.agent_can_enter !== undefined
        ? { agent_can_enter: patch.agent_can_enter }
        : {}),
    })
    .eq("id", id);

  if (error) return { data: null, error: error.message };
  refresh();
  revalidatePath("/me/board/settings");
  return { data: true, error: null };
}

/** Swap a column with its neighbour. Positions are integers and contiguous. */
export async function moveColumn(
  id: string,
  direction: "left" | "right",
): Promise<Result<true>> {
  if (!(await owner())) return { data: null, error: DENIED };

  const { data: column } = await supabase
    .from("board_columns")
    .select("id, project_id, position")
    .eq("id", id)
    .maybeSingle();

  if (!column) return { data: null, error: "That column is gone." };

  const { data: neighbour } = await supabase
    .from("board_columns")
    .select("id, position")
    .eq("project_id", column.project_id)
    [direction === "left" ? "lt" : "gt"]("position", column.position)
    .order("position", { ascending: direction !== "left" })
    .limit(1)
    .maybeSingle();

  // Already at the end. Not an error — the button simply had nothing to do.
  if (!neighbour) return { data: true, error: null };

  // Two writes with no transaction. A failure between them leaves two columns
  // sharing a position, which sorts arbitrarily but loses nothing; there is no
  // unique constraint on position for exactly that reason.
  const { error: first } = await supabase
    .from("board_columns")
    .update({ position: column.position })
    .eq("id", neighbour.id);
  if (first) return { data: null, error: first.message };

  const { error: second } = await supabase
    .from("board_columns")
    .update({ position: neighbour.position })
    .eq("id", column.id);
  if (second) return { data: null, error: second.message };

  refresh();
  revalidatePath("/me/board/settings");
  return { data: true, error: null };
}

/**
 * Retire a column.
 *
 * `board_cards.column_id` is `on delete restrict`, so Postgres refuses while
 * anything is still in it. That is the right behaviour — a column quietly
 * taking its cards with it is how work disappears — but the constraint name is
 * not an explanation, so it is translated here.
 */
export async function deleteColumn(id: string): Promise<Result<true>> {
  if (!(await owner())) return { data: null, error: DENIED };

  const { count } = await supabase
    .from("board_cards")
    .select("id", { count: "exact", head: true })
    .eq("column_id", id);

  if (count && count > 0) {
    return {
      data: null,
      error: `Move the ${count} card${count === 1 ? "" : "s"} out of this column first — deleting it would take them with it.`,
    };
  }

  const { error } = await supabase.from("board_columns").delete().eq("id", id);
  if (error) return { data: null, error: error.message };

  refresh();
  revalidatePath("/me/board/settings");
  return { data: true, error: null };
}

/* ---------------------------------------------------------------------------
 * Projects.
 * ------------------------------------------------------------------------- */

/**
 * Which project the board opens on, remembered in a cookie.
 *
 * The same shape as the planner's trip cookie: a choice, not a route. Boards
 * are switched between rarely and worked in for a long time, so carrying the
 * project in every URL would be noise on every link for the sake of a
 * shareable address nobody needs on a single-reader site.
 */
export async function chooseProject(slug: string): Promise<Result<true>> {
  if (!(await owner())) return { data: null, error: DENIED };

  const { data } = await supabase
    .from("board_projects")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!data) return { data: null, error: "No such project." };

  (await cookies()).set(BOARD_COOKIE, data.slug, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  refresh();
  revalidatePath("/me/board/settings");
  return { data: true, error: null };
}

/**
 * A new project, with the starting set of columns.
 *
 * Goes through `board_create_project` rather than two inserts: a project with
 * no columns cannot hold a card, and supabase-js has no transactions. Same
 * reasoning as `adopt_trip_leg`.
 */
export async function createProject(
  name: string,
  description?: string,
): Promise<Result<string>> {
  if (!(await owner())) return { data: null, error: DENIED };

  const clean = name.trim();
  if (!clean) return { data: null, error: "A project needs a name." };

  const base =
    clean
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "project";

  // `settings` would shadow nothing today — the project lives in a cookie, not
  // the path — but it reads as a reserved word and costs nothing to avoid.
  const slug = base === "settings" ? "settings-board" : base;

  const { data: existing } = await supabase
    .from("board_projects")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    return { data: null, error: `There is already a project called "${clean}".` };
  }

  const { data, error } = await supabase.rpc("board_create_project", {
    p_slug: slug,
    p_name: clean,
    p_description: description?.trim() || undefined,
  });

  if (error) return { data: null, error: error.message };

  // Switch to it. Making a project and then having to go and find it is the
  // kind of small rudeness that makes a tool feel unfinished.
  await chooseProject(slug);

  return { data: data as string, error: null };
}

/**
 * Move a card to the end of another column.
 *
 * The drag path sends the positions either side because the browser already
 * knows them. This one does not have that: it is the phone's way of moving a
 * card, and a tap on a column name says nothing about where in it. Appending
 * is the honest answer — the card has not been placed relative to anything.
 */
export async function moveCardToColumn(
  id: string,
  columnId: string,
): Promise<Result<true>> {
  if (!(await owner())) return { data: null, error: DENIED };

  const { data: last } = await supabase
    .from("board_cards")
    .select("position")
    .eq("column_id", columnId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase
    .from("board_cards")
    .update({
      column_id: columnId,
      position: positionBetween(last?.position ?? undefined, undefined),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { data: null, error: error.message };
  refresh(id);
  return { data: true, error: null };
}
