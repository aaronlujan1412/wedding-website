import type { BoardCard, BoardColumn, BoardProject } from "./board-types";

/**
 * Composing the document that an archived project becomes.
 *
 * This is the whole feature. Everything else — the table, the function, the
 * page — is plumbing around the question of what is worth keeping when the
 * cards go, and the answer is: what the project was, and how each piece of it
 * ended up. Not the drag history, not the thread, not thirty open questions
 * that are no longer open.
 *
 * Grouped by the column each card finished in, because that IS the outcome.
 * A card left in Backlog when a project was archived was not done, and saying
 * so plainly is more useful than a flat list that implies everything shipped.
 *
 * Markdown, so it reads as well in a vault note as it does on the page.
 */
export function composeArchive(
  project: BoardProject,
  columns: BoardColumn[],
  cards: BoardCard[],
): string {
  const lines: string[] = [];

  lines.push(`# ${project.name}`);
  lines.push("");

  if (project.description) {
    lines.push(project.description);
    lines.push("");
  }

  const when = new Date().toISOString().slice(0, 10);
  lines.push(
    `Archived ${when}. ${cards.length} card${cards.length === 1 ? "" : "s"}.`,
  );

  if (project.brain_tags?.length) {
    lines.push(`Tags: ${project.brain_tags.join(", ")}`);
  }
  lines.push("");

  // Columns the agent could not enter first: those are the finished ones, and
  // what got done is what a reader wants before what did not.
  const ordered = [...columns].sort((a, b) => {
    if (a.agent_can_enter !== b.agent_can_enter) return a.agent_can_enter ? 1 : -1;
    return a.position - b.position;
  });

  for (const column of ordered) {
    const inColumn = cards.filter((c) => c.column_id === column.id);
    if (inColumn.length === 0) continue;

    lines.push(`## ${column.name} (${inColumn.length})`);
    lines.push("");

    for (const card of inColumn) {
      lines.push(`- **${card.title}**`);
      // The summary is where the card stands; the body is the brief it was
      // given. The first is the outcome and the second is only context for it,
      // so an archive keeps the summary and drops the brief.
      if (card.summary) {
        for (const line of card.summary.split("\n")) {
          if (line.trim()) lines.push(`  ${line.trim()}`);
        }
      }
      if (card.labels.length) lines.push(`  _${card.labels.join(" · ")}_`);
      lines.push("");
    }
  }

  const unfinished = cards.filter((c) => {
    const column = columns.find((col) => col.id === c.column_id);
    return column?.agent_can_enter !== false;
  }).length;

  if (unfinished > 0) {
    lines.push("---");
    lines.push("");
    lines.push(
      `${unfinished} of ${cards.length} were still open when this was archived.`,
    );
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
