import Link from "next/link";
import { ArrowRight, Images, NotebookPen, Plane } from "lucide-react";
import { signOutAsHost } from "@/app/actions/admin";
import { daysUntilWedding } from "@/lib/constants";

type Props = {
  photos: number;
  hiddenPhotos: number;
  awaitingReply: number;
  honeymoon: { ideas: number; placed: number; actionable: number };
};

export function HostHub({
  photos,
  hiddenPhotos,
  awaitingReply,
  honeymoon,
}: Props) {
  const daysOut = daysUntilWedding();

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 pt-40 pb-24">
      <header className="mb-14 md:mb-20">
        <p className="font-raleway text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Back of house
        </p>
        <h1 className="mt-2 font-corinthia text-7xl text-pop md:text-8xl">
          Hosts
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

      <ul className="grid gap-4 sm:grid-cols-2">
        <HubCard
          href="/rsvp-list"
          icon={<NotebookPen className="h-5 w-5" strokeWidth={1.5} />}
          title="The Guest Ledger"
          status={
            awaitingReply === 0
              ? "Everyone has replied"
              : `${awaitingReply} still to hear from`
          }
          blurb="Headcount, dietary tallies, song requests and numbers to text."
        />
        <HubCard
          href="/photo-review"
          icon={<Images className="h-5 w-5" strokeWidth={1.5} />}
          title="Photo Review"
          status={
            photos === 0
              ? "Nothing posted yet"
              : `${photos} posted${hiddenPhotos > 0 ? `, ${hiddenPhotos} hidden` : ""}`
          }
          blurb="Everything guests have shared. Hide or delete, and add your own."
        />
        <HubCard
          href="/honeymoon"
          icon={<Plane className="h-5 w-5" strokeWidth={1.5} />}
          title="Honeymoon"
          status={
            honeymoon.actionable > 0
              ? `${honeymoon.actionable} ready to book now`
              : honeymoon.placed === 0
                ? `${honeymoon.ideas} in the maybe pile`
                : `${honeymoon.placed} placed, ${honeymoon.ideas} still loose`
          }
          blurb="Japan. Drag the days around, seal what's booked, print the pocket card."
        />
      </ul>
    </main>
  );
}

function HubCard({
  href,
  icon,
  title,
  status,
  blurb,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  status: string;
  blurb: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex h-full flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="text-primary">{icon}</span>
        <span className="mt-3 font-garamond text-2xl text-foreground">
          {title}
        </span>
        <span className="mt-1 font-mono text-xs tabular-nums slashed-zero text-muted-foreground">
          {status}
        </span>
        <span className="mt-3 flex-1 font-garamond text-lg leading-relaxed text-foreground/90">
          {blurb}
        </span>
        <span className="mt-4 inline-flex items-center gap-1 font-raleway text-xs uppercase tracking-[0.2em] text-primary">
          Open
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
            strokeWidth={1.5}
          />
        </span>
      </Link>
    </li>
  );
}
