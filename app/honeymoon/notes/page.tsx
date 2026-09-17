import type { Metadata } from "next";
import { NotesView } from "@/components/honeymoon/NotesView";
import { attachedNotes, mentionsOf } from "@/components/honeymoon/notes";
import { getNotesPage } from "@/lib/honeymoon-queries";

/** Host-only and always live — never prerender it with build-time rows. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notes",
  robots: { index: false, follow: false },
};

export default async function NotesPage() {
  const { trip, notebooks, notes, sources } = await getNotesPage();

  return (
    <NotesView
      trip={trip}
      notebooks={notebooks}
      notes={notes}
      attached={attachedNotes(sources)}
      mentions={mentionsOf(sources)}
    />
  );
}
