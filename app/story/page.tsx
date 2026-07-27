import Image from "next/image";
import { chapters } from "@/components/story/chapters";
import { RouteConnector } from "@/components/story/RouteConnector";

export default function StoryPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 pt-40 pb-24">
      {/* Hero */}
      <header className="mb-16 text-center md:mb-24">
        <p className="font-raleway text-xs uppercase tracking-[0.3em] text-primary">
          Aaron &amp; Savea
        </p>
        <h1 className="mt-3 font-corinthia text-7xl text-pop md:text-8xl">
          Our Story
        </h1>
        <p className="mx-auto mt-4 max-w-xl font-garamond text-xl italic text-muted-foreground md:text-2xl">
          It started with green face paint and a Halloween rave.
        </p>
      </header>

      {/* The route */}
      <div>
        {chapters.map((ch) => (
          <article
            key={ch.title}
            className="grid grid-cols-[2rem_1fr] gap-x-4 md:grid-cols-[3rem_1fr] md:gap-x-8"
          >
            {/* Route strip */}
            <div className="flex flex-col items-center" aria-hidden="true">
              {ch.isLast ? (
                <span className="z-10 font-garamond text-xl leading-none text-primary">
                  ✕
                </span>
              ) : (
                <span className="z-10 mt-1 h-3 w-3 rounded-full bg-accent ring-2 ring-primary" />
              )}
              {!ch.isLast && <RouteConnector direction={ch.direction} />}
            </div>

            {/* Chapter content */}
            <div className="pb-16">
              <p className="font-raleway text-xs uppercase tracking-[0.3em] text-primary">
                {ch.label}
              </p>
              <h2 className="mt-2 font-garamond text-2xl text-foreground md:text-3xl">
                {ch.title}
              </h2>
              <p className="mt-3 max-w-prose font-garamond text-lg leading-relaxed text-foreground/90">
                {ch.body}
              </p>

              {ch.photo && (
                <figure className="mt-6">
                  <div className="overflow-hidden rounded-lg border border-border bg-card p-2">
                    <Image
                      src={ch.photo.src}
                      alt={ch.photo.alt}
                      width={1200}
                      height={800}
                      sizes="(max-width: 768px) 100vw, 640px"
                      className="h-auto w-full rounded-md object-cover"
                    />
                  </div>
                  <figcaption className="mt-2 font-raleway text-xs uppercase tracking-widest text-muted-foreground">
                    {ch.photo.caption}
                  </figcaption>
                </figure>
              )}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
