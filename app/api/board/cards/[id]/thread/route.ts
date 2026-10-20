import { supabase } from "@/lib/supabase";
import {
  authorised,
  unauthorised,
  refused,
  loadCard,
  whyRefused,
} from "@/lib/board-agent";

/**
 * Post a finding, a note, or a question.
 *
 * This is the free half of the verb hierarchy: writing to the thread never
 * needs confirmation, because nothing it does is hard to undo. The cost of
 * Claude over-sharing here is a long thread; the cost of it staying quiet is
 * the thing this board was built to fix.
 *
 * A question may carry `options` — [{id, label, detail}]. Prefer them wherever
 * the answer is a choice rather than an explanation: a question with buttons
 * gets answered at a red light, and an open text box sits for a week.
 */

export const dynamic = "force-dynamic";

const KINDS = ["question", "note", "finding"] as const;
type Kind = (typeof KINDS)[number];

const MAX_BODY = 20_000;
const MAX_OPTIONS = 6;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authorised(request)) return unauthorised();

  const { id } = await params;
  const context = await loadCard(id);
  if (!context) return refused("No such card.", 404);

  const refusal = whyRefused(context);
  if (refusal) return refused(refusal);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return refused("Body is not JSON.", 400);
  }

  const payload = (body ?? {}) as {
    kind?: unknown;
    body?: unknown;
    options?: unknown;
    summary?: unknown;
  };

  if (!KINDS.includes(payload.kind as Kind)) {
    return refused(`kind must be one of ${KINDS.join(", ")}.`, 400);
  }
  if (typeof payload.body !== "string" || !payload.body.trim()) {
    return refused("A thread item needs a body.", 400);
  }
  if (payload.body.length > MAX_BODY) {
    return refused("That body is too long for one thread item.", 400);
  }

  let options: { id: string; label: string; detail?: string }[] | null = null;
  if (payload.options !== undefined && payload.options !== null) {
    if (!Array.isArray(payload.options) || payload.options.length > MAX_OPTIONS) {
      return refused(`options must be an array of at most ${MAX_OPTIONS}.`, 400);
    }
    for (const [i, option] of payload.options.entries()) {
      const o = option as Record<string, unknown>;
      if (typeof o?.id !== "string" || typeof o?.label !== "string") {
        return refused(`option ${i} needs an id and a label.`, 400);
      }
    }
    options = payload.options as { id: string; label: string; detail?: string }[];
  }

  if (options && payload.kind !== "question") {
    return refused("Only a question carries options.", 400);
  }

  const { data, error } = await supabase
    .from("board_thread")
    .insert({
      project_id: context.card.project_id,
      card_id: id,
      author: "claude",
      kind: payload.kind as Kind,
      body: payload.body.trim(),
      options,
      // Only a question waits for anything. A finding is already finished.
      status: payload.kind === "question" ? "open" : "answered",
    })
    .select()
    .single();

  if (error) return refused(error.message, 500);

  // A finding usually changes where the card stands, and the summary is what
  // archiving compresses, so let it be updated in the same call rather than
  // needing a second PATCH that is easy to forget.
  if (typeof payload.summary === "string") {
    await supabase
      .from("board_cards")
      .update({ summary: payload.summary, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  return Response.json({ ok: true, item: data });
}
