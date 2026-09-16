import { signOutAsHost } from "@/app/actions/admin";
import { ReviewGrid } from "@/components/photos/ReviewGrid";
import { getPhotosForReview } from "@/lib/photos";

export const dynamic = "force-dynamic";

export default async function PhotoReviewPage() {
  const { data: photos, error } = await getPhotosForReview();
  const visible = photos.filter((p) => !p.hidden).length;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 pt-40 pb-24">
      <header className="mb-14 md:mb-20">
        <p className="font-raleway text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Back of house
        </p>
        <h1 className="mt-2 font-corinthia text-7xl text-pop md:text-8xl">
          Photo Review
        </h1>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <p className="font-mono text-xs tracking-wider text-muted-foreground">
            <span className="tabular-nums slashed-zero">{visible}</span> showing
            on the site
            {photos.length > visible && (
              <>
                {", "}
                <span className="tabular-nums slashed-zero">
                  {photos.length - visible}
                </span>{" "}
                hidden
              </>
            )}
          </p>
          <form action={signOutAsHost}>
            <button
              type="submit"
              className="rounded-sm font-raleway text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {error && (
        <p className="mb-6 font-garamond text-lg text-destructive">
          {error.message || "Supabase turned down the request."}
        </p>
      )}

      <ReviewGrid photos={photos} />
    </main>
  );
}
