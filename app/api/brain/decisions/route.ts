import { supabase } from "@/lib/supabase";

/**
 * The decision queue, as the homelab box sees it.
 *
 * GET  — what is waiting to be carried out.
 * POST — what happened when it was.
 *
 * This is the half of the loop that cannot be push. The website has no route to
 * the box: the RAG service is bound to the tailnet deliberately, and every
 * design that looked like the site telling the box to do something turned out
 * to be "wake the box, then the box asks" with more parts. So the box asks.
 *
 * Same bearer token as the sync endpoint. It is the same actor doing the same
 * job, and a second secret would be a second thing to rotate for no extra
 * containment — anything holding this token can already rewrite the mirror.
 */

export const dynamic = "force-dynamic";

/** One drain. The queue is single digits in practice. */
const MAX_PENDING = 200;
const MAX_RESULTS = 200;

function authorised(request: Request): boolean {
  const secret = process.env.BRAIN_SYNC_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorised(request)) return new Response("Unauthorized", { status: 401 });

  const { data, error } = await supabase
    .from("brain_decisions")
    .select("id, path, decision, destination")
    .eq("state", "queued")
    .order("decided_at", { ascending: true })
    .limit(MAX_PENDING);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, decisions: data ?? [] });
}

type Result = { id: string; ok: boolean; error?: string };

export async function POST(request: Request) {
  if (!authorised(request)) return new Response("Unauthorized", { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "body is not JSON" }, { status: 400 });
  }

  const results = (body as { results?: unknown })?.results;
  if (!Array.isArray(results)) {
    return Response.json({ ok: false, error: "results must be an array" }, { status: 400 });
  }
  if (results.length > MAX_RESULTS) {
    return Response.json({ ok: false, error: "too many results" }, { status: 400 });
  }

  const now = new Date().toISOString();
  let applied = 0;
  let failed = 0;

  /*
   * One update per result rather than an upsert of the batch: these rows carry
   * a decision somebody made, and a batch upsert that got a column wrong would
   * rewrite the lot. Two hundred is the cap and the real number is single
   * digits, so the round trips cost nothing worth optimising.
   */
  for (const entry of results as Result[]) {
    if (typeof entry?.id !== "string") continue;

    const ok = entry.ok === true;
    const { error } = await supabase
      .from("brain_decisions")
      .update({
        state: ok ? "applied" : "failed",
        applied_at: ok ? now : null,
        // Truncated: this is shown in the UI, and a Python traceback would
        // take the page over.
        error: ok ? null : String(entry.error ?? "the box could not do it").slice(0, 500),
      })
      .eq("id", entry.id)
      // Only a queued row. A result arriving twice must not revive a decision
      // that was already undone.
      .eq("state", "queued");

    if (error) continue;
    if (ok) applied += 1;
    else failed += 1;
  }

  return Response.json({ ok: true, applied, failed });
}
