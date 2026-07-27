import Image from "next/image";
import { SectionHeader } from "@/components/SectionHeader";
import { DetailCard } from "@/components/info/DetailCard";
import { details } from "@/components/info/details";
import { weddingParty } from "@/components/info/weddingParty";
import { liveStreamUrl, photoUploadUrl } from "@/components/info/links";

export default function InfoPage() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 pt-40 pb-24">
      {/* Hero */}
      <header className="mb-12 text-center md:mb-16">
        <p className="font-raleway text-xs uppercase tracking-[0.3em] text-primary">
          The Big Day
        </p>
        <h1 className="mt-3 font-corinthia text-7xl text-pop md:text-8xl">
          A Winter Christmas Celebration
        </h1>
        <p className="mx-auto mt-4 max-w-xl font-garamond text-xl italic text-muted-foreground md:text-2xl">
          Pack your winter coats and bring your holiday spirit.
        </p>
        <p className="mt-6 font-raleway text-sm uppercase tracking-[0.2em] text-foreground">
          Tuesday, December 1, 2026
        </p>
        <p className="mt-1 font-raleway text-sm text-muted-foreground">
          Indian Ridge Lodge · Fairview, Utah
        </p>
      </header>

      <p className="mx-auto mb-12 max-w-2xl text-center font-garamond text-lg leading-relaxed text-foreground/90 md:mb-16">
        We&apos;re so excited to welcome you to our remote mountain venue for a
        rustic winter wonderland — a celebration of our love story and the
        growing family we&apos;re building.
      </p>

      <figure className="mb-20 overflow-hidden rounded-lg border border-border bg-card p-2 md:mb-28">
        <Image
          src="/media/VenueInsideSeating.jpg"
          alt="The reception space set up inside Indian Ridge Lodge"
          width={1600}
          height={900}
          sizes="(max-width: 768px) 100vw, 800px"
          className="h-auto w-full rounded-md object-cover"
        />
      </figure>

      <div className="space-y-20 md:space-y-28">
        {/* It's All in the Details */}
        <section>
          <SectionHeader
            eyebrow="The Little Things"
            title="It's All in the Details"
          />
          <p className="mb-8 font-garamond text-lg leading-relaxed text-foreground/90">
            We&apos;ve sprinkled little pieces of our story throughout the day —
            here&apos;s what to look for.
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            {details.map((detail) => (
              <DetailCard key={detail.title} detail={detail} />
            ))}
          </div>
        </section>

        {/* The Wedding Party */}
        <section>
          <SectionHeader
            eyebrow="Our Favorite People"
            title="The Wedding Party"
          />
          <p className="mb-8 font-garamond text-lg leading-relaxed text-foreground/90">
            We&apos;re so lucky to be standing at the altar surrounded by our
            absolute favorite people.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {weddingParty.map((member) => (
              <div
                key={member.name}
                className="rounded-lg border border-border bg-card p-6 text-center"
              >
                <h3 className="font-garamond text-2xl text-foreground">
                  {member.name}
                </h3>
                <p className="mt-2 font-raleway text-xs uppercase tracking-[0.2em] text-primary">
                  {member.role}
                </p>
                {member.relationship && (
                  <p className="mt-2 font-garamond text-base italic text-muted-foreground">
                    {member.relationship}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Celebrating from Afar */}
        <section>
          <SectionHeader
            eyebrow="For Remote Guests"
            title="Celebrating from Afar"
          />
          <div className="rounded-lg p-8 text-center">
            <p className="mx-auto max-w-xl font-garamond text-lg leading-relaxed text-foreground/90">
              Can&apos;t make the trek into the mountains? Your presence is still
              deeply felt. We&apos;d be honored to have you witness our vows and
              celebrate with us from home.
            </p>
            <div className="mt-6">
              {liveStreamUrl ? (
                <a
                  href={liveStreamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 font-raleway text-sm uppercase tracking-[0.15em] text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Watch the Live Stream
                </a>
              ) : (
                <p className="font-raleway text-sm uppercase tracking-[0.15em] text-muted-foreground">
                  Live stream link coming soon
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Capture the Magic */}
        <section>
          <SectionHeader eyebrow="Through Your Eyes" title="Capture the Magic" />
          <div className="rounded-lg p-8 text-center">
            <p className="mx-auto max-w-xl font-garamond text-lg leading-relaxed text-foreground/90">
              We can&apos;t wait to see the day through your eyes. Our
              photographer has the big moments covered — but we&apos;d love your
              candids, selfies, and videos too. Upload them to our shared
              guestbook so we can relive the night for years to come.
            </p>
            <div className="mt-6">
              {photoUploadUrl ? (
                <a
                  href={photoUploadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 font-raleway text-sm uppercase tracking-[0.15em] text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Share Your Photos
                </a>
              ) : (
                <p className="font-raleway text-sm uppercase tracking-[0.15em] text-muted-foreground">
                  Photo upload link coming soon
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
