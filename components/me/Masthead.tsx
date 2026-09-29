import { TICKER } from "@/components/me/profile";

/**
 * The banner and the ticker under it.
 *
 * The wordmark is set in the pixel face with a hard offset shadow and no blur
 * — the way a header graphic was cut in Paint Shop Pro, because a soft shadow
 * was expensive and nobody had one.
 */
export function Masthead() {
  return (
    <div className="space-y-2">
      <div className="bevel-out flex flex-col gap-3 bg-me-panel px-4 py-5 shadow-[3px_3px_0_var(--color-me-edge-lo)] sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <h1 className="font-dot text-[clamp(2.1rem,8vw,3.6rem)] leading-none text-me-ink [text-shadow:3px_3px_0_var(--color-me-gold)]">
            AARON LUJAN
          </h1>
          <p className="mt-4 text-[13px] text-me-dim">
            Software engineer. This is my corner of it.
          </p>
        </div>
        <p className="shrink-0 font-dot text-[11px] text-me-dim">
          last updated 09 / 28 / 2026
        </p>
      </div>

      {/* The page's one piece of motion. It carries news, pauses when you
          point at it, and stands still for anyone who has asked the system
          for less movement. */}
      <div className="bevel-in overflow-hidden bg-me-void">
        <div className="me-ticker flex w-max hover:[animation-play-state:paused] motion-reduce:animate-none">
          {[0, 1].map((copy) => (
            <div key={copy} aria-hidden={copy === 1} className="flex">
              {TICKER.map((line) => (
                <span
                  key={line}
                  className="py-1.5 pr-12 text-[12px] whitespace-nowrap text-me-dim"
                >
                  <span className="text-me-gold">&raquo;</span> {line}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
