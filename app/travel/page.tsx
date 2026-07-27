import Image from "next/image";
import { SectionHeader } from "@/components/travel/SectionHeader";
import { RoomCard } from "@/components/travel/RoomCard";
import { rooms } from "@/components/travel/rooms";
import { lodging } from "@/components/travel/lodging";
import { attractions } from "@/components/travel/nearby";
import { venue, directions, parkingNote } from "@/components/travel/directions";

export default function TravelPage() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 pt-40 pb-24">
      {/* Hero */}
      <header className="mb-16 text-center md:mb-24">
        <p className="font-raleway text-xs uppercase tracking-[0.3em] text-primary">
          Travel &amp; Logistics
        </p>
        <h1 className="mt-3 font-corinthia text-7xl text-pop md:text-8xl">
          Getting to the Lodge
        </h1>
        <p className="mx-auto mt-4 max-w-xl font-garamond text-xl italic text-muted-foreground md:text-2xl">
          A remote lodge, a scenic drive up the canyon, and a snowy little
          mountain town.
        </p>
      </header>

      <div className="space-y-20 md:space-y-28">
        {/* Flying In */}
        <section>
          <SectionHeader eyebrow="Flying In" title="Start at the Airport" />
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div className="space-y-4 font-garamond text-lg leading-relaxed text-foreground/90">
              <p>
                The closest major airport is Salt Lake City International (SLC).
                From there, Indian Ridge Lodge is a scenic 1.5 to 2-hour drive —
                about 100 miles south into the mountains.
              </p>
              <p>
                We recommend renting a car or carpooling with other guests.
                You&apos;ll need your own transportation for the mountain roads
                up to the remote lodge.
              </p>
            </div>
            <div className="overflow-hidden rounded-lg border border-border bg-card p-2">
              <Image
                src="/media/VenueInsideLounge.jpg"
                alt="The lounge inside Indian Ridge Lodge"
                width={1200}
                height={800}
                sizes="(max-width: 768px) 100vw, 480px"
                className="h-auto w-full rounded-md object-cover"
              />
            </div>
          </div>
        </section>

        {/* Getting There */}
        <section>
          <SectionHeader eyebrow="Getting There" title="The Drive Up" />

          <div className="rounded-lg border border-border bg-card p-6">
            <p className="font-raleway text-xs uppercase tracking-[0.3em] text-primary">
              {venue.name}
            </p>
            <p className="mt-2 font-garamond text-xl text-foreground">
              {venue.address}
            </p>
            <p className="mt-1 font-raleway text-sm text-muted-foreground">
              {venue.driveTime}
            </p>
          </div>

          <p className="mt-6 font-garamond text-lg leading-relaxed text-foreground/90">
            The lodge is tucked deep in the mountains, so cell service is spotty
            and GPS isn&apos;t always reliable. Please screenshot or print these
            directions before you head out.
          </p>

          <ol className="mt-8 space-y-6">
            {directions.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary font-raleway text-sm text-primary-foreground">
                  {i + 1}
                </span>
                <p className="pt-1 font-garamond text-lg leading-relaxed text-foreground/90">
                  {step}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-8 rounded-lg border border-border bg-secondary p-6">
            <p className="font-raleway text-xs uppercase tracking-[0.3em] text-primary">
              Parking
            </p>
            <p className="mt-2 font-garamond text-lg leading-relaxed text-foreground/90">
              {parkingNote}
            </p>
          </div>
        </section>

        {/* Where You're Staying */}
        <section>
          <SectionHeader
            eyebrow="Where You're Staying"
            title="Rooms at the Lodge"
          />
          <figure className="mb-8 overflow-hidden rounded-lg border border-border bg-card p-2">
            <Image
              src="/media/VenueInsideFireplace.jpg"
              alt="The fireplace inside Indian Ridge Lodge"
              width={1600}
              height={900}
              sizes="(max-width: 768px) 100vw, 800px"
              className="h-auto w-full rounded-md object-cover"
            />
          </figure>

          <div className="space-y-4 font-garamond text-lg leading-relaxed text-foreground/90">
            <p>
              We&apos;ve rented out the entire lodge for the celebration! It has
              five themed bedrooms — we&apos;re keeping one for us, and
              we&apos;ve pre-assigned the other four to the families below.
            </p>
            <p>
              Most rooms have just one traditional bed (Queen or Double). The
              extra beds are carpeted bunks, so if you&apos;re on a bunk, pack a
              sleeping bag and pillow.
            </p>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {rooms.map((room) => (
              <RoomCard key={room.name} room={room} />
            ))}
          </div>
        </section>

        {/* Nearby Lodging */}
        <section>
          <SectionHeader
            eyebrow="Nearby Lodging"
            title="If You'd Rather Book Your Own"
          />
          <p className="mb-8 font-garamond text-lg leading-relaxed text-foreground/90">
            The lodge can&apos;t fit everyone, but there are great options nearby
            in Fairview and the surrounding Sanpete Valley. Book early — this is
            a beautiful, rural area and spots fill up fast.
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            {lodging.map((place) => (
              <div
                key={place.name}
                className="rounded-lg border border-border bg-card p-6"
              >
                <h3 className="font-garamond text-xl text-foreground">
                  {place.name}
                </h3>
                <p className="mt-1 font-raleway text-xs uppercase tracking-[0.2em] text-primary">
                  {place.location}
                </p>
                <p className="mt-3 font-garamond text-base leading-relaxed text-foreground/90">
                  {place.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* While You're Here */}
        <section>
          <SectionHeader
            eyebrow="While You're Here"
            title="Our Snowy Neck of the Woods"
          />
          <div className="grid gap-6 md:grid-cols-3">
            {attractions.map((a) => (
              <div
                key={a.title}
                className="rounded-lg border border-border bg-card p-6"
              >
                <span className="text-3xl leading-none" aria-hidden="true">
                  {a.icon}
                </span>
                <h3 className="mt-3 font-garamond text-xl text-foreground">
                  {a.title}
                </h3>
                <p className="mt-2 font-garamond text-base leading-relaxed text-foreground/90">
                  {a.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
