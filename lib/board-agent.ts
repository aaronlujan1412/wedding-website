import "server-only";

import { supabase } from "./supabase";
import type { BoardCard, BoardColumn, BoardProject } from "./board-types";

/**
 * What the agent API is allowed to do, in one place.
 *
 * The board is the only surface on this site a machine can WRITE to freely —
 * the brain sync rewrites a mirror, the lodging finder replaces its own
 * proposals, and neither touches anything a person is editing. This one moves
 * Aaron's cards around, so the guards matter more and they live here rather
 * than being repeated down each route.
 *
 * BOARD_AGENT_SECRET is its own secret rather than a reuse of
 * BRAIN_SYNC_SECRET. `app/api/brain/decisions/route.ts` reuses the sync token
 * on the grounds that anything holding it can already rewrite the mirror, so a
 * second secret would be a second thing to rotate for no containment. That
 * reasoning does not carry here: a board token moves cards, a brain token
 * rewrites the vault. Different blast radius, different key — see lib/hmac.ts.
 */

export function authorised(request: Request): boolean {
  const secret = process.env.BOARD_AGENT_SECRET;
  return (
    Boolean(secret) &&
    request.headers.get("authorization") === `Bearer ${secret}`
  );
}

export function unauthorised() {
  return new Response("Unauthorized", { status: 401 });
}

/** A refusal the agent can act on, rather than a status code to guess at. */
export function refused(reason: string, status = 409) {
  return Response.json({ ok: false, error: reason }, { status });
}

export type CardContext = {
  card: BoardCard;
  project: BoardProject;
  columns: BoardColumn[];
};

export async function loadCard(id: string): Promise<CardContext | null> {
  const { data: card } = await supabase
    .from("board_cards")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!card) return null;

  const [{ data: project }, { data: columns }] = await Promise.all([
    supabase
      .from("board_projects")
      .select("*")
      .eq("id", card.project_id)
      .maybeSingle(),
    supabase
      .from("board_columns")
      .select("*")
      .eq("project_id", card.project_id)
      .order("position"),
  ]);

  if (!project) return null;
  return { card, project, columns: columns ?? [] };
}

/**
 * The lock, and the terminal-column rule.
 *
 * Returns the sentence to refuse with, or null to proceed. Phrased as prose
 * because the agent reads it: "409" alone tells it nothing it can act on,
 * whereas "that column is not one I can move cards into" tells it to raise a
 * review flag instead.
 */
export function whyRefused(
  context: CardContext,
  targetColumnId?: string,
): string | null {
  const { card, project, columns } = context;

  if (project.locked_at) {
    return `The project "${project.name}" is locked. Nothing in it can be changed through the API.`;
  }
  if (card.locked_at) {
    return `That card is locked. Ask before changing it.`;
  }

  if (targetColumnId && targetColumnId !== card.column_id) {
    const target = columns.find((c) => c.id === targetColumnId);
    if (!target) return "No such column on this project.";
    if (!target.agent_can_enter) {
      /* Deliberately does not prescribe a review kind. Any column can be
         barred, not only the one that means finished, so "raise a flag saying
         what you want" is the advice that stays true — naming "complete" here
         was wrong the moment a second column was barred. */
      return `"${target.name}" is a column only Aaron moves cards into. Raise a review flag saying what should happen to this card instead, and leave it where it is.`;
    }
  }

  return null;
}

/** Where Claude had read up to, and moving it on. */
export async function readCursor(): Promise<string> {
  const { data } = await supabase
    .from("board_cursor")
    .select("last_read_at")
    .limit(1)
    .maybeSingle();

  // A missing row means the migration's seed did not run. Reading everything
  // once is a better failure than reading nothing and looking idle.
  return data?.last_read_at ?? new Date(0).toISOString();
}

export async function bumpCursor(at: string) {
  await supabase
    .from("board_cursor")
    .update({ last_read_at: at })
    .eq("id", true);
}
