import { getAllGuestRsvps, getAllGuestGroups } from "@/app/actions/rsvp";
import { signOutAsHost } from "@/app/actions/admin";
import { Accordion } from "@/components/ui/accordion";
import { daysUntilWedding } from "@/lib/constants";
import { HeadcountTally } from "@/components/rsvp-list/HeadcountTally";
import { GroupPanel } from "@/components/rsvp-list/GroupPanel";
import { LedgerHeading } from "@/components/rsvp-list/LedgerParts";
import {
  summarize,
  type DietaryTally,
  type RsvpGuest,
} from "@/components/rsvp-list/summarize";

export const dynamic = "force-dynamic";

function TallyRow({ items }: { items: DietaryTally[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-baseline">
          <span className="font-garamond text-lg text-foreground/90">
            {item.label}
          </span>
          <span
            aria-hidden
            className="mx-3 mb-[0.35em] flex-1 self-end border-b border-dotted border-border"
          />
          <span className="font-mono text-lg tabular-nums slashed-zero text-foreground">
            {item.count}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function RsvpListPage() {
  const [{ data: guests, error: guestsError }, { data: groups }] =
    await Promise.all([getAllGuestRsvps(), getAllGuestGroups()]);

  if (guestsError) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-6 pt-40 pb-24">
        <p className="font-raleway text-xs uppercase tracking-[0.3em] text-pop2">
          Back of house
        </p>
        <h1 className="mt-3 font-corinthia text-6xl text-foreground">
          The list didn&apos;t load
        </h1>
        <p className="mt-4 font-garamond text-lg text-foreground/90">
          {guestsError.message ||
            "Supabase turned down the request. Reload to try again."}
        </p>
      </main>
    );
  }

  const ledger = summarize((guests ?? []) as RsvpGuest[], groups ?? []);
  const awaitingGroups = ledger.groups.filter((group) => group.awaiting > 0);
  const daysOut = daysUntilWedding();

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 pt-40 pb-24">
      <header className="mb-14 md:mb-20">
        <p className="font-raleway text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Back of house
        </p>
        <h1 className="mt-2 font-corinthia text-7xl text-pop md:text-8xl">
          The Guest Ledger
        </h1>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <p className="font-mono text-xs tracking-wider text-muted-foreground">
            <span className="tabular-nums slashed-zero">{daysOut}</span>
            {daysOut === 1 ? " day" : " days"} until the wedding
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

      {ledger.invited === 0 ? (
        <section className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
          <h2 className="font-garamond text-2xl text-foreground">
            Nobody on the list yet
          </h2>
          <p className="mx-auto mt-3 max-w-sm font-garamond text-lg text-muted-foreground">
            Add guests and their groups in Supabase, then reload — the count
            fills in from there.
          </p>
        </section>
      ) : (
        <div className="space-y-16 md:space-y-24">
          <HeadcountTally ledger={ledger} />

          {awaitingGroups.length > 0 && (
            <section aria-labelledby="still-waiting">
              <LedgerHeading
                id="still-waiting"
                title="Still to hear from"
                count={ledger.awaiting}
              />
              <p className="mb-6 font-garamond text-lg text-foreground/90">
                {awaitingGroups.length === 1
                  ? "One household left. "
                  : `${awaitingGroups.length} households. `}
                Open them in the list below for numbers to text.
              </p>
              <ul className="flex flex-wrap gap-2">
                {awaitingGroups.map((group) => (
                  <li
                    key={group.key}
                    className="inline-flex items-baseline gap-2 rounded-full border border-border bg-card px-3 py-1"
                  >
                    <span className="font-garamond text-base text-foreground">
                      {group.name}
                    </span>
                    <span className="font-mono text-xs tabular-nums slashed-zero text-muted-foreground">
                      {group.awaiting}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(ledger.restrictions.length > 0 ||
            ledger.preferences.length > 0) && (
            <section aria-labelledby="for-the-kitchen">
              <LedgerHeading id="for-the-kitchen" title="For the kitchen" />
              <p className="mb-6 font-garamond text-lg text-foreground/90">
                Counted across attending guests only.
              </p>
              <div className="grid gap-8 sm:grid-cols-2">
                {ledger.restrictions.length > 0 && (
                  <div>
                    <h3 className="mb-3 font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-pop2">
                      Must accommodate
                    </h3>
                    <TallyRow items={ledger.restrictions} />
                  </div>
                )}
                {ledger.preferences.length > 0 && (
                  <div>
                    <h3 className="mb-3 font-raleway text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                      Preferences
                    </h3>
                    <TallyRow items={ledger.preferences} />
                  </div>
                )}
              </div>
            </section>
          )}

          {ledger.songs.length > 0 && (
            <section aria-labelledby="for-the-dj">
              <LedgerHeading
                id="for-the-dj"
                title="For the DJ"
                count={ledger.songs.length}
              />
              <ul className="space-y-3">
                {ledger.songs.map((song) => (
                  <li key={song.id} className="font-garamond text-lg">
                    <span className="text-foreground">{song.request}</span>
                    <span className="text-muted-foreground">
                      {" — "}
                      {song.name}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="every-group">
            <LedgerHeading
              id="every-group"
              title="Every group"
              count={ledger.groups.length}
            />
            <p className="mb-5 font-garamond text-lg text-foreground/90">
              Groups still owing a reply come first.
            </p>
            <Accordion type="multiple" className="w-full border-t border-border">
              {ledger.groups.map((group) => (
                <GroupPanel key={group.key} group={group} />
              ))}
            </Accordion>
          </section>
        </div>
      )}
    </main>
  );
}
