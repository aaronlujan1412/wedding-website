import type { Database } from "./database.types";

type Tables = Database["public"]["Tables"];

export type BoardProject = Tables["board_projects"]["Row"];
export type BoardColumn = Tables["board_columns"]["Row"];
export type BoardCard = Tables["board_cards"]["Row"];
export type BoardThreadItem = Tables["board_thread"]["Row"];

export type ReviewKind = "complete" | "delete" | "decision";
export type ThreadAuthor = "claude" | "aaron";
export type ThreadKind = "question" | "answer" | "note" | "finding";

/** A question's choices, stored as jsonb so the shape lives here, not in SQL. */
export type ThreadOption = {
  id: string;
  label: string;
  detail?: string;
};

/** One column with the cards in it, already ordered. */
export type BoardLane = {
  column: BoardColumn;
  cards: BoardCard[];
};

/** Everything `/me/board` draws in one object. */
export type BoardView = {
  project: BoardProject;
  lanes: BoardLane[];
  /** Cards Claude has flagged, across every column. */
  flagged: BoardCard[];
};

/**
 * Fractional indexing, lifted from `components/honeymoon/trip.ts`.
 *
 * Kept as its own copy rather than imported across tools: the honeymoon
 * planner is a different product in the same repo, and a shared helper
 * between them is a coupling neither asked for. It is four lines.
 */
export function positionBetween(before?: number, after?: number): number {
  if (before === undefined && after === undefined) return 0;
  if (before === undefined) return after! - 1;
  if (after === undefined) return before + 1;
  return (before + after) / 2;
}

/** Whether Claude may move a card into this column unprompted. */
export function agentCanEnter(column: BoardColumn): boolean {
  return column.agent_can_enter;
}

/** A card or its project being locked both mean the same thing to the API. */
export function isLocked(card: BoardCard, project: BoardProject): boolean {
  return card.locked_at !== null || project.locked_at !== null;
}

/**
 * What a review flag says on screen.
 *
 * Phrased as Claude's claim rather than as an instruction, because that is
 * what it is: a thing proposed, waiting to be accepted or waved off.
 */
export const REVIEW_LABEL: Record<ReviewKind, string> = {
  complete: "says this is done",
  delete: "wants to delete this",
  decision: "needs a decision",
};
