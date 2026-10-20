import "server-only";

import { cookies } from "next/headers";
import { supabase } from "./supabase";
import { currentOwner } from "./site-user";
import { BOARD_COOKIE } from "./board-cookie";
import type {
  BoardCard,
  BoardColumn,
  BoardProject,
  BoardView,
} from "./board-types";

/**
 * Reads for the board.
 *
 * Deliberately NOT a `"use server"` module. Every export of one of those
 * becomes a callable POST endpoint, and these read real rows. The mutations
 * live in `app/actions/board.ts`; this file is called from server components
 * and from the top of those actions.
 *
 * `/me/board` renders for signed-out visitors as a write-up of what the tool
 * is, so the gate is here rather than in `proxy.ts` — same rule the rest of
 * `/me` follows. Every function below returns null or empty for a viewer who
 * is not the owner, never a throw: the page draws its public face instead.
 */

export async function getProject(slug: string): Promise<BoardProject | null> {
  if (!(await currentOwner())) return null;

  const { data } = await supabase
    .from("board_projects")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  return data ?? null;
}

/** The project a card belongs to, rather than whichever one is current. */
export async function getProjectById(id: string): Promise<BoardProject | null> {
  if (!(await currentOwner())) return null;

  const { data } = await supabase
    .from("board_projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return data ?? null;
}

/**
 * Which project the board opens on.
 *
 * An explicit choice wins, then the one touched most recently. Same shape as
 * `getCurrentTrip()`, and for the same reason: with one project a chooser is
 * friction, and with several the last one you worked on is a better guess than
 * whichever happens to sort first.
 *
 * An archived project is never resolved to automatically — reaching one takes
 * asking for it by slug.
 */
export async function getCurrentProject(): Promise<BoardProject | null> {
  if (!(await currentOwner())) return null;

  const chosen = (await cookies()).get(BOARD_COOKIE)?.value;
  if (chosen) {
    const { data } = await supabase
      .from("board_projects")
      .select("*")
      .eq("slug", chosen)
      .eq("status", "active")
      .maybeSingle();
    if (data) return data;
  }

  const { data } = await supabase
    .from("board_projects")
    .select("*")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

export async function listProjects(): Promise<BoardProject[]> {
  if (!(await currentOwner())) return [];

  const { data } = await supabase
    .from("board_projects")
    .select("*")
    .eq("status", "active")
    .order("created_at");

  return data ?? [];
}

/**
 * The whole board in two queries rather than one per column.
 *
 * Cards come back ordered by column and position, and are bucketed here. A
 * join per column would be N+1 against a table that will hold hundreds of rows
 * at most, and the bucketing is cheaper than the round trips.
 */
export async function getBoard(
  project: BoardProject,
): Promise<BoardView | null> {

  const [columnsResult, cardsResult] = await Promise.all([
    supabase
      .from("board_columns")
      .select("*")
      .eq("project_id", project.id)
      .order("position"),
    supabase
      .from("board_cards")
      .select("*")
      .eq("project_id", project.id)
      .order("position"),
  ]);

  const columns: BoardColumn[] = columnsResult.data ?? [];
  const cards: BoardCard[] = cardsResult.data ?? [];

  const byColumn = new Map<string, BoardCard[]>();
  for (const card of cards) {
    const bucket = byColumn.get(card.column_id);
    if (bucket) bucket.push(card);
    else byColumn.set(card.column_id, [card]);
  }

  return {
    project,
    lanes: columns.map((column) => ({
      column,
      cards: byColumn.get(column.id) ?? [],
    })),
    // Across every column, not per lane: the point of the filter is to find
    // them without knowing where they are.
    flagged: cards.filter((card) => card.review_kind !== null),
  };
}

export async function getCard(id: string): Promise<BoardCard | null> {
  if (!(await currentOwner())) return null;

  const { data } = await supabase
    .from("board_cards")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return data ?? null;
}

/** A card's thread, oldest first — it reads as a conversation. */
export async function getThread(cardId: string) {
  if (!(await currentOwner())) return [];

  const { data } = await supabase
    .from("board_thread")
    .select("*")
    .eq("card_id", cardId)
    .order("created_at");

  return data ?? [];
}
