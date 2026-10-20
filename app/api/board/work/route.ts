import { supabase } from "@/lib/supabase";
import {
  authorised,
  unauthorised,
  readCursor,
  bumpCursor,
} from "@/lib/board-agent";

/**
 * What Claude needs to start working, in one call.
 *
 * This is the endpoint the whole board exists for. Every session starts either
 * cold or from a compaction summary, so "what did I ask, what did Aaron answer,
 * what is unlocked" cannot come from the conversation — it has to come from
 * here. The cursor lives in the database for the same reason.
 *
 * Reading bumps the cursor, so answers are delivered once. `?peek=1` reads
 * without bumping, which is what the in-session poll uses: it fires every few
 * seconds and must not consume the answers before the session that asked for
 * them gets to read them properly.
 */

export const dynamic = "force-dynamic";

const MAX_CARDS = 200;

export async function GET(request: Request) {
  if (!authorised(request)) return unauthorised();

  const url = new URL(request.url);
  const peek = url.searchParams.get("peek") === "1";
  const slug = url.searchParams.get("project");

  const since = await readCursor();
  const now = new Date().toISOString();

  const projectQuery = supabase
    .from("board_projects")
    .select("id, slug, name, description, status, locked_at, brain_tags")
    .eq("status", "active");

  const { data: projects } = slug
    ? await projectQuery.eq("slug", slug)
    : await projectQuery;

  if (!projects?.length) {
    return Response.json({ ok: true, since, projects: [], answers: [], cards: [], open_questions: 0 });
  }

  const ids = projects.map((p) => p.id);

  const [answers, open, cards, columns] = await Promise.all([
    // Answered since the cursor. The question comes along so the agent does
    // not need a second call to know what it was answering.
    supabase
      .from("board_thread")
      .select("id, project_id, card_id, body, answer_option_id, answered_at, parent_id")
      .in("project_id", ids)
      .eq("author", "aaron")
      .eq("kind", "answer")
      .gt("created_at", since)
      .order("created_at"),
    // The poll's whole job: a count, not a payload.
    supabase
      .from("board_thread")
      .select("id", { count: "exact", head: true })
      .in("project_id", ids)
      .eq("author", "claude")
      .eq("kind", "question")
      .eq("status", "open"),
    supabase
      .from("board_cards")
      .select("id, project_id, column_id, title, summary, labels, locked_at, review_kind, updated_at")
      .in("project_id", ids)
      .is("locked_at", null)
      .order("position")
      .limit(MAX_CARDS),
    supabase
      .from("board_columns")
      .select("id, project_id, key, name, position, agent_can_enter")
      .in("project_id", ids)
      .order("position"),
  ]);

  // Questions the answers point at, so each answer arrives with its question.
  const parentIds = (answers.data ?? [])
    .map((a) => a.parent_id)
    .filter((id): id is string => Boolean(id));

  const { data: questions } = parentIds.length
    ? await supabase
        .from("board_thread")
        .select("id, card_id, body, options")
        .in("id", parentIds)
    : { data: [] };

  const questionById = new Map((questions ?? []).map((q) => [q.id, q]));

  if (!peek) await bumpCursor(now);

  return Response.json({
    ok: true,
    since,
    cursor_moved: !peek,
    open_questions: open.count ?? 0,
    projects: projects.filter((p) => !p.locked_at),
    locked_projects: projects.filter((p) => p.locked_at).map((p) => p.slug),
    columns: columns.data ?? [],
    answers: (answers.data ?? []).map((a) => ({
      ...a,
      question: a.parent_id ? (questionById.get(a.parent_id) ?? null) : null,
    })),
    cards: cards.data ?? [],
  });
}
