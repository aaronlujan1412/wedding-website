import { supabase } from "@/lib/supabase";
import { authorised, unauthorised, refused } from "@/lib/board-agent";
import { positionBetween } from "@/lib/board-types";

/**
 * Create a card.
 *
 * Creating is additive and reversible — Aaron can delete anything here, and
 * the agent cannot — so unlike finishing or deleting, it needs no review flag.
 * It was simply missing from the first pass.
 *
 * Two guards, both the same ones a move obeys:
 *
 *   A locked project means leave it entirely alone, so no new cards in it.
 *
 *   A column with agent_can_enter = false refuses creation as well as moves.
 *   Without that, "create a card in Done" would be a way round the one rule
 *   this whole design exists to enforce: the agent cannot declare work
 *   finished. Blocking the move and allowing the create would be a door with
 *   a lock on one side.
 */

export const dynamic = "force-dynamic";

const MAX_TITLE = 300;
const MAX_TEXT = 20_000;

export async function POST(request: Request) {
  if (!authorised(request)) return unauthorised();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return refused("Body is not JSON.", 400);
  }

  const p = (body ?? {}) as {
    project?: unknown;
    column?: unknown;
    title?: unknown;
    summary?: unknown;
    body?: unknown;
    labels?: unknown;
    at_top?: unknown;
  };

  if (typeof p.title !== "string" || !p.title.trim()) {
    return refused("A card needs a title.", 400);
  }
  if (p.title.length > MAX_TITLE) return refused("That title is too long.", 400);
  for (const field of ["summary", "body"] as const) {
    const v = p[field];
    if (v !== undefined && v !== null) {
      if (typeof v !== "string") return refused(`${field} must be a string.`, 400);
      if (v.length > MAX_TEXT) return refused(`That ${field} is too long.`, 400);
    }
  }
  if (p.labels !== undefined && p.labels !== null) {
    if (!Array.isArray(p.labels) || !p.labels.every((l) => typeof l === "string")) {
      return refused("labels must be an array of strings.", 400);
    }
  }

  // The project is REQUIRED, by slug. Every other verb is anchored to a card
  // that already knows where it belongs; a create is not, so "whichever
  // project was touched last" silently files work in the wrong place. That is
  // not hypothetical — it put two cards in an unrelated project the first
  // time this ran. Naming it costs one argument.
  if (typeof p.project !== "string" || !p.project.trim()) {
    const { data: all } = await supabase
      .from("board_projects")
      .select("slug")
      .eq("status", "active")
      .order("name");
    return refused(
      `Say which project. Active: ${(all ?? []).map((x) => x.slug).join(", ") || "none"}.`,
      400,
    );
  }

  const slug = p.project.trim();
  const { data: project } = await supabase
    .from("board_projects")
    .select("id, name, slug, locked_at")
    .eq("status", "active")
    .eq("slug", slug)
    .maybeSingle();

  if (!project) return refused(`No active project "${slug}".`, 404);
  if (project.locked_at) {
    return refused(
      `The project "${project.name}" is locked. Nothing can be added to it through the API.`,
    );
  }

  const { data: columns } = await supabase
    .from("board_columns")
    .select("id, key, name, position, agent_can_enter")
    .eq("project_id", project.id)
    .order("position");

  if (!columns?.length) return refused("That project has no columns.", 404);

  // Named by key or by id; without one, the first column the agent may enter.
  const wanted =
    typeof p.column === "string"
      ? columns.find((c) => c.key === p.column || c.id === p.column)
      : columns.find((c) => c.agent_can_enter);

  if (!wanted) {
    return refused(
      `No column "${String(p.column)}" on ${project.name}. Columns: ${columns
        .map((c) => c.key)
        .join(", ")}.`,
      404,
    );
  }
  if (!wanted.agent_can_enter) {
    return refused(
      `"${wanted.name}" is a column only Aaron puts cards in. Create it somewhere else and raise a review flag if you think it belongs there.`,
    );
  }

  const atTop = p.at_top === true;
  const { data: edge } = await supabase
    .from("board_cards")
    .select("position")
    .eq("column_id", wanted.id)
    .order("position", { ascending: atTop })
    .limit(1)
    .maybeSingle();

  const position = atTop
    ? positionBetween(undefined, edge?.position ?? undefined)
    : positionBetween(edge?.position ?? undefined, undefined);

  const { data: card, error } = await supabase
    .from("board_cards")
    .insert({
      project_id: project.id,
      column_id: wanted.id,
      title: p.title.trim(),
      summary: typeof p.summary === "string" ? p.summary : null,
      body: typeof p.body === "string" ? p.body : null,
      labels: (p.labels as string[] | undefined) ?? [],
      position,
    })
    .select()
    .single();

  if (error) return refused(error.message, 500);

  return Response.json({
    ok: true,
    card,
    project: { slug: project.slug, name: project.name },
    column: { key: wanted.key, name: wanted.name },
  });
}
