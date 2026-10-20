import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Panel } from "@/components/me/Panel";
import { FullWidth } from "@/components/me/WithSidebar";
import { Settings } from "@/components/me/board/Settings";
import { getCurrentProject } from "@/lib/board-queries";
import { currentOwner } from "@/lib/site-user";
import { supabase } from "@/lib/supabase";

/**
 * Project settings.
 *
 * Its own page rather than a panel on the board: these are decisions made
 * occasionally and lived with, and putting the control that governs whether
 * Claude can mark work finished next to the cards invites changing it by
 * accident while moving one.
 */

export const metadata: Metadata = { title: "Board settings" };
export const dynamic = "force-dynamic";

export default async function BoardSettingsPage() {
  if (!(await currentOwner())) redirect("/me/board");

  const project = await getCurrentProject();
  if (!project) notFound();

  const [{ data: columns }, { data: cards }] = await Promise.all([
    supabase
      .from("board_columns")
      .select("*")
      .eq("project_id", project.id)
      .order("position"),
    supabase.from("board_cards").select("column_id").eq("project_id", project.id),
  ]);

  const cardCounts: Record<string, number> = {};
  for (const card of cards ?? []) {
    cardCounts[card.column_id] = (cardCounts[card.column_id] ?? 0) + 1;
  }

  return (
    <FullWidth>
      <p className="px-1 text-[12px]">
        <Link
          href="/me/board"
          className="text-me-link underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-me-gold"
        >
          <span aria-hidden className="text-me-gold">
            &laquo;
          </span>{" "}
          Back to the board
        </Link>
      </p>

      <Panel title={`${project.name} — settings`}>
        <Settings
          project={project}
          columns={columns ?? []}
          cardCounts={cardCounts}
        />
      </Panel>
    </FullWidth>
  );
}
