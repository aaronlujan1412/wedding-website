"use client";

import { RotateCcw, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { rankFor } from "./arcade";
import { standingsOf, type Standing } from "./bouts";
import { PLANNERS } from "./trip";

/**
 * 番付 — the banzuke. The results screen, and the list this whole tab exists
 * to produce.
 *
 * A real banzuke is a ranking sheet built entirely out of head-to-head bouts,
 * printed in two columns, east and west, with the rank in the middle and the
 * type size shrinking all the way down the sheet. That is exactly the shape of
 * this data, so it is drawn exactly that way — the size of a name IS its rank,
 * which means the standings can be read from across the room without reading
 * a single word.
 *
 * The top four ranks are the real ones, and so is the line: above it is 幕内,
 * the salaried division, which here means the idea fits inside the hours the
 * trip actually has. Below it is 幕下, where you train and are not paid.
 */

const NEON = {
  savea: "var(--color-neon-savea)",
  aaron: "var(--color-neon-aaron)",
} as const;

/**
 * Row 0 at 2rem decaying to a floor, so the leaders shrink visibly and the
 * long tail sits at one readable size. The viewport cap is what keeps the
 * wedge on a phone: two columns of 2rem at 390px wrap the leaders onto four
 * lines each and the shape stops reading as a shape.
 */
function rankSize(row: number): string {
  const rem = Math.max(0.82, 2 * 0.93 ** row);
  return `min(${rem.toFixed(2)}rem, max(0.82rem, ${(rem * 2.2).toFixed(2)}vw))`;
}

/**
 * The cut is global — one trip, one pot of hours — but within one person's
 * cards the ones that fit are always a prefix of their own ranking, because
 * both orders are by rating. So each column gets its own line at its own
 * depth, which is truer than one rule straight across: where hers sits lower
 * than his, her ideas are taking more of the trip.
 */
function fitting(column: Standing[], inTrip: Set<string>): number {
  let count = 0;
  for (const standing of column) {
    if (!inTrip.has(standing.item.id)) break;
    count += 1;
  }
  return count;
}

function Cell({
  standing,
  size,
  inTrip,
  side,
  line,
  title,
}: {
  standing: Standing | undefined;
  size: string;
  inTrip: boolean;
  side: "savea" | "aaron";
  /** Set on the last card that fits: this cell carries the division line. */
  line: string | null;
  /** Spelled out for the four ranks that have a name. Everyone below is a
   *  numbered maegashira and the gutter's kana says so on its own. */
  title: string | null;
}) {
  const east = side === "savea";

  return (
    <span
      className={cn(
        "flex min-w-0 flex-col py-1",
        east ? "items-end" : "items-start",
        // Drawn on the cell rather than as a row of its own: the two columns
        // cut at different depths, and a full-width rule between two grid rows
        // would drag the other column's card down with it.
        line && "border-b-2 border-[color:var(--color-gold)]/60 pb-2",
      )}
    >
      {standing ? (
        <span
          className={cn(
            "flex min-w-0 max-w-full items-baseline gap-3",
            east && "flex-row-reverse",
          )}
        >
          <span
            className={cn(
              "font-dela leading-tight text-pretty",
              east ? "text-right" : "text-left",
            )}
            style={{
              fontSize: size,
              color: inTrip ? "#fff" : "rgba(255,255,255,0.32)",
            }}
          >
            {standing.item.must_do ? (
              <Star
                className="mr-1 inline size-[0.5em] fill-current align-baseline text-[color:var(--color-gold)]"
                aria-label="Must do"
              />
            ) : null}
            {standing.item.title}
          </span>
          <span
            className={cn(
              "font-dot flex shrink-0 items-baseline gap-2",
              east && "flex-row-reverse",
            )}
          >
            {title ? (
              <span className="text-[0.55rem] tracking-[0.2em] text-[color:var(--color-gold)]">
                {title}
              </span>
            ) : null}
            <span
              className="text-[0.7rem] tabular-nums"
              style={{ color: inTrip ? NEON[side] : "rgba(255,255,255,0.3)" }}
            >
              {standing.fought === 0
                ? "—"
                : `${standing.wins}–${standing.losses}`}
            </span>
          </span>
        </span>
      ) : null}

      {line ? (
        <span className="font-dot mt-1 text-[0.65rem] tracking-widest text-[color:var(--color-gold)]">
          {line}
        </span>
      ) : null}
    </span>
  );
}

export function Banzuke({
  ranked,
  inTrip,
  cut,
  onRevive,
  busy,
}: {
  ranked: Standing[];
  /** Ids that fit inside the trip's remaining hours. */
  inTrip: Set<string>;
  cut: Standing[];
  onRevive: (id: string) => void;
  busy: boolean;
}) {
  const east = standingsOf(ranked, "savea");
  const west = standingsOf(ranked, "aaron");
  const rows = Math.max(east.length, west.length);

  const eastFits = fitting(east, inTrip);
  const westFits = fitting(west, inTrip);

  if (rows === 0) {
    return (
      <p className="font-dot py-16 text-center text-sm tracking-widest text-white/50">
        NO CHALLENGERS. ADD IDEAS ON THE BOARD.
      </p>
    );
  }

  return (
    <div className="border-2 border-[color:var(--color-arena-line)] bg-[color:var(--color-arena)] px-3 py-5 sm:px-6">
      <p className="mb-4 text-center">
        <span className="font-jp-gothic text-2xl text-[color:var(--color-gold)]">
          番付
        </span>
        <span className="font-dot ml-3 text-[0.7rem] tracking-[0.35em] text-white/50">
          OFFICIAL RANKINGS
        </span>
      </p>

      <div className="grid grid-cols-[1fr_3rem_1fr] items-baseline gap-x-2 sm:gap-x-4">
        <h3
          className="font-dela justify-self-end text-sm tracking-wide sm:text-base"
          style={{ color: NEON.savea }}
        >
          {PLANNERS.savea.label.toUpperCase()}
          <span className="font-jp-gothic ml-2 text-white/35">東</span>
        </h3>
        <span />
        <h3
          className="font-dela text-sm tracking-wide sm:text-base"
          style={{ color: NEON.aaron }}
        >
          <span className="font-jp-gothic mr-2 text-white/35">西</span>
          {PLANNERS.aaron.label.toUpperCase()}
        </h3>

        <span className="col-span-full mt-2 mb-3 h-0.5 bg-[color:var(--color-arena-line)]" />

        {Array.from({ length: rows }, (_, row) => {
          const e = east[row];
          const w = west[row];
          const size = rankSize(row);
          // The rank belongs to the row, and a row is only in the top division
          // if anything in it is.
          const top =
            (!!e && inTrip.has(e.item.id)) || (!!w && inTrip.has(w.item.id));
          const rank = rankFor(row, top);
          // Only the four named ranks are worth spelling out; "MAEGASHIRA 17"
          // beside every other line is the gutter's number again, in words.
          const title = top && row < 4 ? rank.roman : null;

          return (
            <div key={row} className="contents">
              <Cell
                standing={e}
                size={size}
                side="savea"
                inTrip={!!e && inTrip.has(e.item.id)}
                title={title}
                line={
                  row + 1 === eastFits
                    ? `幕内 — ${eastFits} OF ${PLANNERS.savea.label.toUpperCase()}'S FIT`
                    : null
                }
              />

              <span className="flex flex-col items-center pt-1 leading-none">
                <span
                  className="font-jp-gothic text-[0.8rem]"
                  style={{
                    color: top
                      ? "var(--color-gold)"
                      : "rgba(255,255,255,0.25)",
                  }}
                  title={rank.roman}
                >
                  {rank.kana}
                </span>
                <span className="font-dot mt-0.5 text-[0.6rem] text-white/35 tabular-nums">
                  {row + 1}
                </span>
              </span>

              <Cell
                standing={w}
                size={size}
                side="aaron"
                inTrip={!!w && inTrip.has(w.item.id)}
                title={title}
                line={
                  row + 1 === westFits
                    ? `幕内 — ${westFits} OF ${PLANNERS.aaron.label.toUpperCase()}'S FIT`
                    : null
                }
              />
            </div>
          );
        })}
      </div>

      {cut.length > 0 ? (
        <div className="mt-10 border-t-2 border-[color:var(--color-ko)]/40 pt-4">
          <p>
            <span className="font-jp-gothic text-xl text-[color:var(--color-ko)]">
              引退
            </span>
            <span className="font-dot ml-3 text-[0.7rem] tracking-[0.3em] text-white/50">
              ELIMINATED
            </span>
          </p>
          <p className="mt-1 font-garamond text-sm text-white/45 italic">
            Still in their pile on the board, out of the tournament. One press
            brings one back.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {cut.map((standing) => (
              <li key={standing.item.id}>
                <button
                  type="button"
                  onClick={() => onRevive(standing.item.id)}
                  disabled={busy}
                  className={cn(
                    "font-dot flex min-h-9 items-center gap-2 border-2 border-white/15 px-3 py-1.5",
                    "text-[0.65rem] tracking-wide text-white/45 transition-colors",
                    "hover:border-[color:var(--color-gold)]/60 hover:text-white disabled:opacity-40",
                  )}
                >
                  <RotateCcw className="size-3" aria-hidden />
                  <span className="line-through">
                    {standing.item.title.toUpperCase()}
                  </span>
                  <span className="text-[color:var(--color-gold)]">
                    COMEBACK
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
