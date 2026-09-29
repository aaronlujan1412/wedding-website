import { WithSidebar } from "@/components/me/WithSidebar";
import type { Metadata } from "next";
import { Panel } from "@/components/me/Panel";

export const metadata: Metadata = {
  title: "About",
  description:
    "Angular and C# by trade, lately TypeScript and Postgres. What I work on and how I think about it.",
};

/** How I work, as claims rather than adjectives. */
const PRINCIPLES: string[] = [
  "Model first. Almost every bug I've had to live with started as a field that quietly meant two things.",
  "Constraints in the database, not checks in the handler. A rule the schema enforces still holds at 3am during a migration you didn't write.",
  "Write down the why. Code says what it does; nothing in it says what it was avoiding.",
  "Small and boring beats impressive and staffed. I'd rather ship something that holds up than something that needs a maintainer standing next to it.",
];

const STACK: [string, string][] = [
  ["day to day", "Angular, C#, .NET"],
  ["lately", "TypeScript, Next.js, React, Postgres"],
  ["running at home", "Docker, Tailscale, a Python retrieval service"],
];

export default function AboutPage() {
  return (
    <WithSidebar>
      <Panel title="about me">
        {/* First draft — written from the outside. Replace it with how you'd
            actually say this. */}
        <div className="me-prose">
          <p>
            I&apos;m a software engineer. I came up through Angular and C#, and
            most of what I&apos;ve built since is some version of the same
            question: what is the real shape of this data, and what does that
            make easy?
          </p>
          <p>
            I think in records before screens. Before the components and the
            endpoints, I want to know what the things actually are, which of
            them own which, and what has to stay true no matter what the
            interface does.
          </p>
          <p>
            The rest of it is unglamorous on purpose, and I&apos;ve been happier
            for it.
          </p>
        </div>
      </Panel>

      <Panel title="how i work">
        <ul className="space-y-3">
          {PRINCIPLES.map((line) => (
            <li key={line} className="flex gap-2 text-[13px] leading-relaxed">
              <span aria-hidden className="shrink-0 text-me-gold">
                &raquo;
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="the stack">
        <dl className="space-y-3">
          {STACK.map(([role, tools]) => (
            <div key={role} className="sm:flex sm:gap-4">
              <dt className="font-dot text-[13px] text-me-gold sm:w-40 sm:shrink-0">
                {role}
              </dt>
              <dd className="text-[13px] text-me-ink">{tools}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </WithSidebar>
  );
}
