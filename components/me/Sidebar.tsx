import Link from "next/link";
import { Panel, Well } from "@/components/me/Panel";
import { CRT, PixelSprite } from "@/components/me/sprite";
import {
  FIELDS,
  HANDLE,
  NOTE_COUNT,
  RANK,
  STATUS,
} from "@/components/me/profile";

/**
 * The hit counter, which is the one place a number was ever allowed to be the
 * loudest thing on a page. This one counts something real.
 */
function Counter({ value, digits = 6 }: { value: number; digits?: number }) {
  return (
    <p
      className="flex max-w-[210px] gap-0.5"
      aria-label={`${value.toLocaleString()} notes`}
    >
      {String(value)
        .padStart(digits, "0")
        .split("")
        .map((digit, i) => (
          <span
            key={i}
            aria-hidden
            className="bevel-in flex-1 bg-me-void py-1 text-center font-dot text-[17px] leading-none text-me-gold"
          >
            {digit}
          </span>
        ))}
    </p>
  );
}

/**
 * The profile column, on every page — which is how a board worked. Your card
 * followed you around, and the page you were reading sat next to it.
 */
export function Sidebar() {
  return (
    <aside className="space-y-3">
      <Panel title={HANDLE}>
        <Well className="flex justify-center">
          <PixelSprite
            rows={CRT}
            label="A beige CRT monitor, four lines of green text on the screen and the cursor waiting on the fifth"
            className="w-full max-w-[176px]"
          />
        </Well>

        <p
          className="mt-3 text-center font-dot text-[17px] leading-none text-me-gold"
          aria-label={`Rank: ${RANK.title}`}
        >
          <span aria-hidden>{"★".repeat(RANK.stars)}</span>
        </p>
        <p className="mt-1.5 text-center font-dot text-[14px] leading-none text-me-ink">
          {RANK.title}
        </p>

        <p className="mt-3 flex items-center justify-center gap-2 text-[11px] text-me-dim">
          <span aria-hidden className="size-2 shrink-0 bg-me-live" />
          {STATUS}
        </p>
      </Panel>

      <Panel title="profile">
        <dl className="space-y-2 text-[12px]">
          {FIELDS.map(([field, value]) => (
            <div key={field}>
              <dt className="font-dot text-[12px] text-me-dim">{field}</dt>
              <dd className="text-me-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title="second brain">
        <Counter value={NOTE_COUNT} />
        <p className="mt-2 font-dot text-[11px] text-me-dim">notes filed</p>
        <p className="mt-3 text-[12px] leading-relaxed text-me-ink">
          Everything I&apos;ve worked out and didn&apos;t want to work out
          twice.
        </p>
        <Link
          href="/me/second-brain"
          className="mt-2 inline-block text-[12px] text-me-link underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-me-gold"
        >
          <span aria-hidden className="text-me-gold">
            &raquo;
          </span>{" "}
          how it works
        </Link>
      </Panel>
    </aside>
  );
}
