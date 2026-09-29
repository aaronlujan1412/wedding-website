"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { currentBrainUser } from "@/lib/brain-user";
import { DESTINATIONS } from "@/lib/brain-types";

/**
 * Deciding what gets into the brain.
 *
 * These write a QUEUE, not the vault. The website cannot reach the homelab box
 * — the RAG service is bound to the tailnet on purpose — so a decision here is
 * an instruction the box collects on its next check and carries out by moving
 * the file. The vault's own rule survives: a note enters the brain when a human
 * moves it, and pressing this button is that human doing so from further away.
 *
 * Every export of a "use server" module is a public POST endpoint, so each of
 * these re-checks the session itself. `proxy.ts` does not guard /me/brain at
 * all — those pages render for everyone — which makes the check here the only
 * thing standing in front of the queue.
 */

export type DecisionState = { error: string | null };

const DENIED: DecisionState = { error: "Not signed in." };
const OK: DecisionState = { error: null };

function refresh() {
  revalidatePath("/me/brain", "layout");
}

/** A path from a form is a path from the network. Never trust its shape. */
function stagedPath(value: FormDataEntryValue | null): string | null {
  const path = typeof value === "string" ? value.trim() : "";
  if (!path.startsWith("_inbox/")) return null;
  if (path.includes("..") || path.length > 1024) return null;
  return path;
}

/**
 * Let a staged note into the brain, filed under a bucket the reviewer chose.
 *
 * Choosing beats inferring: `classify_vault.py` routes on tags and is candid
 * about the cases it cannot call — "`hardware` is GPUs and hinges" — so it
 * leaves a real ambiguous pile. Someone who has just read the note does not
 * have that problem.
 */
export async function approveNote(
  _previous: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  const user = await currentBrainUser();
  if (!user) return DENIED;

  const path = stagedPath(formData.get("path"));
  if (!path) return { error: "That isn't a note in the inbox." };

  const destination = String(formData.get("destination") ?? "");
  if (!DESTINATIONS.includes(destination as (typeof DESTINATIONS)[number])) {
    return { error: "Pick where it should go." };
  }

  const { error } = await supabase.from("brain_decisions").insert({
    path,
    decision: "approve",
    destination,
    note_title: String(formData.get("title") ?? "") || null,
    decided_by: user.id,
  });

  if (error) {
    // The partial unique index on queued rows, i.e. a double click.
    if (error.code === "23505") {
      refresh();
      return OK;
    }
    return { error: error.message };
  }

  refresh();
  return OK;
}

/**
 * Turn a staged note away. The box moves it to `_rejected/` rather than
 * deleting it — nothing here removes something somebody wrote, which matters
 * when the button is on a phone and a thumb is imprecise.
 */
export async function rejectNote(
  _previous: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  const user = await currentBrainUser();
  if (!user) return DENIED;

  const path = stagedPath(formData.get("path"));
  if (!path) return { error: "That isn't a note in the inbox." };

  const { error } = await supabase.from("brain_decisions").insert({
    path,
    decision: "reject",
    destination: null,
    note_title: String(formData.get("title") ?? "") || null,
    decided_by: user.id,
  });

  if (error) {
    if (error.code === "23505") {
      refresh();
      return OK;
    }
    return { error: error.message };
  }

  refresh();
  return OK;
}

/**
 * Take back a decision the box has not carried out yet.
 *
 * Only while it is still queued. Once the file has moved, undoing it would mean
 * asking the box to move it back, which is a second decision rather than the
 * absence of the first — and the vault's history is where that belongs.
 */
export async function undoDecision(
  _previous: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  if (!(await currentBrainUser())) return DENIED;

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Nothing to undo." };

  const { error } = await supabase
    .from("brain_decisions")
    .delete()
    .eq("id", id)
    .in("state", ["queued", "failed"]);

  if (error) return { error: error.message };

  refresh();
  return OK;
}
