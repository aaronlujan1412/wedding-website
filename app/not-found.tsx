import Link from "next/link";
import { SiteChrome } from "@/components/SiteChrome";

/**
 * Unmatched URLs render here, inside the root layout only — no route group's
 * layout applies. When the navbar lived in the root layout a 404 got it for
 * free; now it has to ask, or a mistyped link strands a guest on a blank page.
 */
export default function NotFound() {
  return (
    <SiteChrome>
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 pt-32 pb-20 text-center">
        <h1 className="font-corinthia text-6xl leading-none text-pop">
          Nothing here
        </h1>
        <p className="mt-4 font-garamond text-lg leading-relaxed text-muted-foreground">
          That link doesn&apos;t lead anywhere on the wedding site.
        </p>
        <Link
          href="/"
          className="mt-8 rounded-sm font-raleway text-xs tracking-[0.2em] text-primary uppercase underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Back to the wedding site
        </Link>
      </main>
    </SiteChrome>
  );
}
