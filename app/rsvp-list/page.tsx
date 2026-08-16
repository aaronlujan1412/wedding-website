import { getAllGuestRsvps, getAllGuestGroups } from "@/app/actions/rsvp";

export const dynamic = "force-dynamic";

type RsvpGuest = {
  id: number;
  name: string;
  attending: boolean | null;
  plus_one_name: string | null;
  group_id: number | null;
};

export default async function RsvpListPage() {
  const [{ data: guests }, { data: groups }] = await Promise.all([
    getAllGuestRsvps(),
    getAllGuestGroups(),
  ]);

  const groupNameById = new Map(groups?.map((g) => [g.id, g.name]));

  const allGuests = (guests ?? []) as RsvpGuest[];

  const yesGuests = allGuests.filter((g) => g.attending === true);
  const noGuests = allGuests.filter((g) => g.attending === false);
  const pendingGuests = allGuests.filter((g) => g.attending === null);

  const yesCount = yesGuests.length;
  const noCount = noGuests.length;
  const pendingCount = pendingGuests.length;
  const totalCount = allGuests.length;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 pt-40 pb-24">
      <header className="mb-12 text-center md:mb-16">
        <p className="font-raleway text-xs uppercase tracking-[0.3em] text-primary">
          For Your Eyes Only
        </p>
        <h1 className="mt-3 font-corinthia text-7xl text-pop md:text-8xl">
          RSVP List
        </h1>
        <p className="mx-auto mt-4 max-w-xl font-garamond text-xl italic text-muted-foreground md:text-2xl">
          {totalCount} invited · {yesCount} yes · {noCount} no · {pendingCount}{" "}
          pending
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-6 text-center font-corinthia text-4xl text-green-700">
            Yes
          </h2>
          {yesGuests.length === 0 ? (
            <p className="text-center font-garamond italic text-muted-foreground">
              No yeses yet. Tragic.
            </p>
          ) : (
            <ul className="space-y-3">
              {yesGuests.map((guest) => (
                <li
                  key={guest.id}
                  className="rounded-md border border-border bg-background p-3"
                >
                  <p className="font-garamond text-lg font-semibold text-foreground">
                    {guest.name}
                  </p>
                  {guest.plus_one_name && (
                    <p className="font-garamond text-sm text-muted-foreground">
                      + {guest.plus_one_name}
                    </p>
                  )}
                  <p className="font-raleway text-xs uppercase tracking-[0.15em] text-primary">
                    {guest.group_id ? groupNameById.get(guest.group_id) : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-6 text-center font-corinthia text-4xl text-red-700">
            No
          </h2>
          {noGuests.length === 0 ? (
            <p className="text-center font-garamond italic text-muted-foreground">
              Everyone's coming. Nice.
            </p>
          ) : (
            <ul className="space-y-3">
              {noGuests.map((guest) => (
                <li
                  key={guest.id}
                  className="rounded-md border border-border bg-background p-3"
                >
                  <p className="font-garamond text-lg font-semibold text-foreground">
                    {guest.name}
                  </p>
                  <p className="font-raleway text-xs uppercase tracking-[0.15em] text-primary">
                    {guest.group_id ? groupNameById.get(guest.group_id) : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {pendingGuests.length > 0 && (
        <section className="mt-12 rounded-lg border border-dashed border-border bg-card p-6">
          <h2 className="mb-6 text-center font-corinthia text-3xl text-muted-foreground">
            Still Waiting
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {pendingGuests.map((guest) => (
              <li
                key={guest.id}
                className="rounded-md border border-border bg-background p-3"
              >
                <p className="font-garamond text-base text-foreground">
                  {guest.name}
                </p>
                <p className="font-raleway text-xs uppercase tracking-[0.15em] text-primary">
                  {guest.group_id ? groupNameById.get(guest.group_id) : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
