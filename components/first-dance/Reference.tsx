import {
  BLOCKS,
  CARE,
  CONVENTIONS,
  DECISION_WEEK,
  FLOOR,
  type Protocol,
  SESSION,
  SONG,
  trainingWeek,
} from "@/lib/first-dance";
import { cn } from "@/lib/utils";
import { Strip } from "./Strip";

/**
 * Everything that is true of the whole routine rather than of one eight-count.
 *
 * It sits at the foot because none of it is read in motion: you check the grip
 * or the shoe rule once, between sessions. The mechanics that ARE read in
 * motion were pulled out of here and attached to the eight-counts they belong
 * to, which is why there is no lift section down here.
 */
export function Reference({ week }: { week: ReturnType<typeof trainingWeek> }) {
  return (
    <div className="mt-24 border-t border-border pt-12">
      <div className="space-y-12">
        <section>
          <h2 className="font-garamond text-3xl text-pop">
            How everything is held
          </h2>
          <p className="mt-1 max-w-[56ch] font-garamond text-lg leading-relaxed text-muted-foreground">
            True of every figure on the sheet, so it is never repeated in one.
          </p>
          <div className="mt-6 space-y-6">
            {CONVENTIONS.map((p) => (
              <Rules key={p.id} protocol={p} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-garamond text-3xl text-pop">
            What the routine was designed around
          </h2>
          <p className="mt-1 max-w-[56ch] font-garamond text-lg leading-relaxed text-muted-foreground">
            A gown, suede on hardwood, four sides watching, and a pair of wrists
            that take no load.
          </p>
          <div className="mt-6 space-y-6">
            {CARE.map((p) => (
              <Rules key={p.id} protocol={p} warn={p.id === "wrist"} />
            ))}
          </div>
        </section>
      </div>

      <section className="mt-16">
        <h2 className="font-garamond text-3xl text-pop">Seventeen weeks</h2>
        <p className="mt-1 max-w-[62ch] font-garamond text-lg leading-relaxed text-muted-foreground">
          The plan runs backwards on purpose. Whatever you drill first collects
          the most repetitions, and working front to back leaves the ending — the
          part people carry out of the room — permanently under-rehearsed.
        </p>

        <Strip
          className="mt-6"
          segments={BLOCKS.map((b) => ({
            key: b.id,
            label:
              b.id === "technique"
                ? "Technique"
                : b.id === "set"
                  ? "Set it, backwards"
                  : b.id === "integrate"
                    ? "Integration"
                    : "Maintenance",
            detail:
              b.id === week.block.id && !week.outside
                ? `week ${week.week} — you are here`
                : `weeks ${b.weeks[0]}–${b.weeks[1]}`,
            span: b.weeks[1] - b.weeks[0] + 1,
            active: b.id === week.block.id && !week.outside,
            title: b.months,
          }))}
        />

        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          {BLOCKS.map((b) => (
            <div key={b.id}>
              <p className="font-mono text-xs tabular-nums slashed-zero text-muted-foreground">
                Weeks {b.weeks[0]}–{b.weeks[1]}, {b.months}
              </p>
              <h3 className="mt-1 font-garamond text-2xl text-foreground">
                {b.title}
              </h3>
              <p className="mt-1 max-w-[58ch] font-garamond text-lg leading-relaxed text-foreground/85">
                {b.body}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-8 max-w-[62ch] border-l-2 border-warn pl-4 font-garamond text-lg leading-relaxed text-warn">
          The tier decision is made at the end of week {DECISION_WEEK}, not on
          the day. If Tier A is not clean and repeatable by then, drop to B and
          spend the last two weeks on polish. Do not take an unrehearsed Tier A
          onto the floor.
        </p>
      </section>

      <section className="mt-16">
        <h2 className="font-garamond text-3xl text-pop">Forty-five minutes</h2>
        <p className="mt-1 max-w-[62ch] font-garamond text-lg leading-relaxed text-muted-foreground">
          The shape of one session, whatever week it is.
        </p>
        <Strip
          compact
          className="mt-6"
          segments={SESSION.map((s, i) => ({
            key: String(i),
            label: s.what,
            detail: `${s.minutes} min`,
            span: s.minutes,
          }))}
        />
      </section>

      <section className="mt-16">
        <h2 className="font-garamond text-3xl text-pop">The floor</h2>
        <ul className="mt-4 max-w-[62ch] space-y-1.5 font-garamond text-lg leading-relaxed text-foreground/85">
          {FLOOR.map((f) => (
            <li key={f} className="border-l-2 border-border pl-4">
              {f}
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-[62ch] font-garamond text-lg leading-relaxed text-muted-foreground">
          Times on this page are computed from {SONG.bpm}{" "}
          beats a minute rather than transcribed, so the whole sheet stays
          self-consistent. Once the edit is cut, tap the real bar lines in Reaper
          and the boundaries can be renumbered against what is actually there —
          everything downstream is relative, so a shifted section just slides.
        </p>
      </section>
    </div>
  );
}

function Rules({ protocol, warn }: { protocol: Protocol; warn?: boolean }) {
  return (
    <div className="border-t border-border pt-4">
      <h3
        className={cn(
          "font-garamond text-2xl",
          warn ? "text-warn" : "text-foreground",
        )}
      >
        {protocol.title}
      </h3>
      <p className="mt-0.5 max-w-[56ch] font-garamond text-lg leading-relaxed text-foreground/85">
        {protocol.lede}
      </p>
      <ul className="mt-2 max-w-[56ch] space-y-1 font-garamond text-base leading-relaxed text-muted-foreground">
        {protocol.rules.map((r) => (
          <li key={r} className="pl-4 -indent-4 before:mr-2 before:content-['—']">
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}
