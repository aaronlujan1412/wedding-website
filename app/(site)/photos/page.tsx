import { SectionHeader } from "@/components/SectionHeader";
import { PhotoGrid } from "@/components/photos/PhotoGrid";
import { UploadPanel } from "@/components/photos/UploadPanel";
import { getAllGuestGroups } from "@/app/actions/rsvp";
import { getGallery, getPhotoSession } from "@/lib/photos";
import type { Gallery } from "@/components/photos/types";

const copy: Record<
  Gallery["source"],
  { subtitle: string; eyebrow: string; title: string }
> = {
  guests: {
    subtitle: "Everything you all caught, in one place.",
    eyebrow: "From everyone",
    title: "What You've Posted",
  },
  curated: {
    subtitle: "Whatever you catch lands right here. No account, no app.",
    eyebrow: "Meanwhile",
    title: "A Few of Ours",
  },
};

export default async function PhotosPage() {
  const [gallery, session, groups] = await Promise.all([
    getGallery(),
    getPhotoSession(),
    getAllGuestGroups(),
  ]);
  const text = copy[gallery.source];

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 pt-40 pb-24">
      <header className="mb-12 text-center md:mb-16">
        <p className="font-raleway text-xs uppercase tracking-[0.3em] text-primary">
          Photos
        </p>
        <h1 className="mt-3 font-corinthia text-7xl text-pop md:text-8xl">
          The Album
        </h1>
        <p className="mx-auto mt-4 max-w-xl font-garamond text-xl italic text-muted-foreground md:text-2xl">
          {text.subtitle}
        </p>
      </header>

      <UploadPanel session={session} guestGroups={groups.data ?? []} />

      <section>
        <SectionHeader eyebrow={text.eyebrow} title={text.title} />
        <PhotoGrid photos={gallery.photos} />
      </section>
    </main>
  );
}
