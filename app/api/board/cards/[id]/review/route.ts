import { supabase } from "@/lib/supabase";
import {
  authorised,
  unauthorised,
  refused,
  loadCard,
  whyRefused,
} from "@/lib/board-agent";

/**
 * Raise a review flag — the only way the agent finishes or removes anything.
 *
 * Setting a flag does NOT do the thing. The card stays exactly where it is and
 * a marker appears on it; Aaron accepts or waves it off from the board. That
 * is the whole oversight model: findings and moves are free, but the two
 * actions that cost something — declaring work done, and making it disappear —
 * only ever become a proposal.
 *
 * A note is required. The column constraint enforces it in SQL too, because a
 * flag with no reason on it is one nobody can act on.
 */

export const dynamic = "force-dynamic";

const KINDS = ["complete", "delete", "decision"] as const;
type Kind = (typeof KINDS)[number];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authorised(request)) return unauthorised();

  const { id } = await params;
  const context = await loadCard(id);
  if (!context) return refused("No such card.", 404);

  // The lock still applies. A locked card is not one to raise flags on either
  // — "NO TOUCHY" means the agent leaves it entirely alone.
  const refusal = whyRefused(context);
  if (refusal) return refused(refusal);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return refused("Body is not JSON.", 400);
  }

  const payload = (body ?? {}) as { kind?: unknown; note?: unknown };

  if (!KINDS.includes(payload.kind as Kind)) {
    return refused(`kind must be one of ${KINDS.join(", ")}.`, 400);
  }
  if (typeof payload.note !== "string" || !payload.note.trim()) {
    return refused(
      "A review flag needs a note saying why. Aaron sees the note, not the request.",
      400,
    );
  }

  const { data, error } = await supabase
    .from("board_cards")
    .update({
      review_kind: payload.kind as Kind,
      review_note: payload.note.trim(),
      review_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return refused(error.message, 500);
  return Response.json({ ok: true, card: data });
}
