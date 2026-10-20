import { supabase } from "@/lib/supabase";
import {
  authorised,
  unauthorised,
  refused,
  loadCard,
  whyRefused,
} from "@/lib/board-agent";
import { positionBetween } from "@/lib/board-types";

/**
 * One card, as the agent sees and edits it.
 *
 * GET gives the card, its thread and its project's context in a single call,
 * so picking up a card is one request rather than four.
 *
 * PATCH is the write, and it is where the two guards live. Both refuse with a
 * sentence rather than a bare status, because the agent has to decide what to
 * do next: "locked" means stop and ask, "not a column I can enter" means raise
 * a review flag instead.
 */

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authorised(request)) return unauthorised();

  const { id } = await params;
  const context = await loadCard(id);
  if (!context) return refused("No such card.", 404);

  const { data: thread } = await supabase
    .from("board_thread")
    .select("*")
    .eq("card_id", id)
    .order("created_at");

  // The project's vault tags, resolved to the notes themselves. This is the
  // context that stops a cold session asking what it is looking at.
  const tags = context.project.brain_tags ?? [];
  const { data: notes } = tags.length
    ? await supabase
        .from("brain_notes")
        .select("path, title, tags")
        .overlaps("tags", tags)
        .limit(25)
    : { data: [] };

  return Response.json({
    ok: true,
    card: context.card,
    project: context.project,
    columns: context.columns,
    thread: thread ?? [],
    brain_notes: notes ?? [],
    locked: Boolean(context.card.locked_at || context.project.locked_at),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authorised(request)) return unauthorised();

  const { id } = await params;
  const context = await loadCard(id);
  if (!context) return refused("No such card.", 404);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return refused("Body is not JSON.", 400);
  }

  const patch = (body ?? {}) as {
    column_id?: unknown;
    title?: unknown;
    summary?: unknown;
    body?: unknown;
    before?: unknown;
    after?: unknown;
  };

  const targetColumn =
    typeof patch.column_id === "string" ? patch.column_id : undefined;

  const refusal = whyRefused(context, targetColumn);
  if (refusal) return refused(refusal);

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof patch.title === "string") update.title = patch.title.trim();
  if (typeof patch.summary === "string") update.summary = patch.summary;
  if (typeof patch.body === "string") update.body = patch.body;

  if (targetColumn) {
    update.column_id = targetColumn;
    update.position = positionBetween(
      typeof patch.before === "number" ? patch.before : undefined,
      typeof patch.after === "number" ? patch.after : undefined,
    );
  }

  const { data, error } = await supabase
    .from("board_cards")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return refused(error.message, 500);
  return Response.json({ ok: true, card: data });
}

/**
 * There is no DELETE. Deleting is a review flag — see ../review/route.ts.
 * The one property this design protects is that the agent can never make
 * something disappear.
 */
