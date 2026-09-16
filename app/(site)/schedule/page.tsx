import { TimelineConnector } from "@/components/schedule/TimelineConnector";
import { schedule } from "@/components/schedule/schedule";

export default function SchedulePage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 pt-40 pb-24">
      {/* Hero */}
      <header className="mb-16 text-center md:mb-24">
        <p className="font-raleway text-xs uppercase tracking-[0.3em] text-primary">
          The Schedule
        </p>
        <h1 className="mt-3 font-corinthia text-7xl text-pop md:text-8xl">
          The Timeline of Forever
        </h1>
        <p className="mx-auto mt-4 max-w-xl font-garamond text-xl italic text-muted-foreground md:text-2xl">
          A cozy winter evening, from first cocoa to last dance.
        </p>
      </header>

      {/* The timeline */}
      <div>
        {schedule.map((item, i) => {
          const isLast = i === schedule.length - 1;
          return (
            <article
              key={item.title}
              className="grid grid-cols-[3rem_1fr] gap-x-4 md:grid-cols-[4rem_1fr] md:gap-x-8"
            >
              {/* Time rail */}
              <div className="flex flex-col items-center" aria-hidden="true">
                <span className="z-10 flex h-11 w-11 items-center justify-center rounded-full bg-card text-lg ring-2 ring-primary md:h-14 md:w-14 md:text-2xl">
                  {item.icon}
                </span>
                {!isLast && <TimelineConnector />}
              </div>

              {/* Stop content */}
              <div className="pb-16">
                <p className="font-raleway text-xs uppercase tracking-[0.3em] text-primary">
                  {item.time}
                </p>
                <h2 className="mt-2 font-garamond text-2xl text-foreground md:text-3xl">
                  {item.title}
                </h2>
                <p className="mt-3 font-garamond text-lg leading-relaxed text-foreground/90">
                  {item.body}
                </p>

                {item.note && (
                  <div className="mt-4 rounded-lg border border-border bg-secondary p-4">
                    <p className="font-raleway text-xs uppercase tracking-[0.2em] text-primary">
                      {item.note.title}
                    </p>
                    <p className="mt-2 font-garamond text-base leading-relaxed text-foreground/90">
                      {item.note.body}
                    </p>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
