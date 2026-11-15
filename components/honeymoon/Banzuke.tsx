"use client";

import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOVES, rankFor } from "./arcade";
import { contenders, wished, type Standing } from "./bouts";
import { SIDE_NEON, type Side } from "./Ring";
import { PLANNERS } from "./trip";

/**
 * 番付 — the banzuke. The results screen, and the list this whole tab exists
 * to produce.
 *
 * A real banzuke is a ranking sheet built entirely out of head-to-head bouts,
 * printed in two columns, east and west, with the rank in the middle and the
 * type size shrinking all the way down the sheet. Each rank holds two
 * wrestlers, east the senior of the pair — so one ranking of songs deals out
 * exactly that way: first east, first west, second east, and on down. The size
 * of a name IS its rank, which means the standings can be read from across the
 * room without reading a single word.
 *
 * The top four ranks are the real ones, and so is the line: above it is 幕内,
 * the salaried division, which here means the song fits in the hours the party
 * has. Below it is 幕下, where you train and are not paid.
 */

const PLANNER_NEON = {
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
 * Where a column's line goes. The songs that make the setlist are a prefix of
 * the ranking, and dealing it east-west alternately keeps them a prefix of
 * each column — so when the count is odd, east's line sits one row below
 * west's, which is exactly where the last song in falls.
 */
function fitting(column: Standing[], setlist: Set<string>): number {
  let count = 0;
  for (const standing of column) {
    if (!setlist.has(standing.song.id)) break;
    count += 1;
  }
  return count;
}

function Cell({
  standing,
  size,
  onList,
  side,
  line,
  title,
}: {
  standing: Standing | undefined;
  size: string;
  onList: boolean;
  side: Side;
  /** Set on the last song in: this cell carries the division line. An empty
   *  string draws the line with nothing written on it. */
  line: string | null;
  /** Spelled out for the four ranks that have a name. Everyone below is a
   *  numbered maegashira and the gutter's kana says so on its own. */
  title: string | null;
}) {
  const east = side === "east";

  return (
    <span
      className={cn(
        "flex min-w-0 flex-col py-1",
        east ? "items-end" : "items-start",
        // Drawn on the cell rather than as a row of its own: the two columns
        // can cut at different depths, and a full-width rule between two grid
        // rows would drag the other column's song down with it.
        line !== null && "border-b-2 border-[color:var(--color-gold)]/60 pb-2",
      )}
    >
      {standing ? (
        <>
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
                color: onList ? "#fff" : "rgba(255,255,255,0.32)",
              }}
            >
              {standing.song.title}
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
                style={{
                  color: onList ? SIDE_NEON[side] : "rgba(255,255,255,0.3)",
                }}
              >
                {standing.fought === 0
                  ? "—"
                  : `${standing.wins}–${standing.losses}`}
              </span>
            </span>
          </span>
          <span
            className={cn(
              "font-dot text-[0.6rem] tracking-wider",
              onList ? "text-white/45" : "text-white/20",
              east ? "text-right" : "text-left",
            )}
          >
            {standing.song.artist.toUpperCase()}
          </span>
        </>
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
  setlist,
  cut,
  onRevive,
  onRelease,
  busy,
}: {
  ranked: Standing[];
  /** Ids that fit inside the party's hours. */
  setlist: Set<string>;
  cut: Standing[];
  onRevive: (id: string) => void;
  onRelease: (id: string) => void;
  busy: boolean;
}) {
  const saved = wished(ranked);
  const sheet = contenders(ranked);
  const east = sheet.filter((_, i) => i % 2 === 0);
  const west = sheet.filter((_, i) => i % 2 === 1);
  const rows = east.length;

  const eastFits = fitting(east, setlist);
  const westFits = fitting(west, setlist);

  if (rows === 0 && saved.length === 0) {
    return (
      <p className="font-dot py-16 text-center text-sm tracking-widest text-white/50">
        NO SONGS LEFT IN THE RING.
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

      {/* 不戦勝 — a real sumo result: a win awarded with no bout, because the
          other side never showed up. A wished song is exactly that, so it
          sits above the ranking rather than at the top of it. */}
      {saved.length > 0 ? (
        <div className="mb-6 border-2 border-[color:var(--color-gold)]/50 px-3 py-3">
          <p>
            <span className="font-jp-gothic text-lg text-[color:var(--color-gold)]">
              不戦勝
            </span>
            <span className="font-dot ml-3 text-[0.65rem] tracking-[0.3em] text-white/50">
              WON WITHOUT FIGHTING
            </span>
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {saved.map((standing) => (
              <li
                key={standing.song.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
              >
                <span className="font-jp-gothic text-sm text-[color:var(--color-gold)]">
                  {MOVES.wish.pip}
                </span>
                <span className="font-dela text-base text-white sm:text-lg">
                  {standing.song.title}
                </span>
                <span className="font-dot text-[0.6rem] tracking-wider text-white/45">
                  {standing.song.artist.toUpperCase()}
                </span>
                <span
                  className="font-dot text-[0.6rem] tracking-widest"
                  style={{ color: PLANNER_NEON[standing.saved ?? "savea"] }}
                >
                  {PLANNERS[standing.saved ?? "savea"].label.toUpperCase()}
                  &apos;S WISH
                </span>
                <button
                  type="button"
                  onClick={() => onRelease(standing.song.id)}
                  disabled={busy}
                  className="font-dot ml-auto min-h-8 border-2 border-white/15 px-2 text-[0.6rem] tracking-widest text-white/45 transition-colors hover:border-[color:var(--color-gold)]/60 hover:text-white disabled:opacity-40"
                >
                  TAKE IT BACK
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid grid-cols-[1fr_3rem_1fr] items-baseline gap-x-2 sm:gap-x-4">
        <h3
          className="font-dela justify-self-end text-sm tracking-wide sm:text-base"
          style={{ color: SIDE_NEON.east }}
        >
          EAST
          <span className="font-jp-gothic ml-2 text-white/35">東</span>
        </h3>
        <span />
        <h3
          className="font-dela text-sm tracking-wide sm:text-base"
          style={{ color: SIDE_NEON.west }}
        >
          <span className="font-jp-gothic mr-2 text-white/35">西</span>
          WEST
        </h3>

        <span className="col-span-full mt-2 mb-3 h-0.5 bg-[color:var(--color-arena-line)]" />

        {Array.from({ length: rows }, (_, row) => {
          const e = east[row];
          const w = west[row];
          const size = rankSize(row);
          // The rank belongs to the row, and a row is only in the top division
          // if anything in it is.
          const top =
            (!!e && setlist.has(e.song.id)) || (!!w && setlist.has(w.song.id));
          const rank = rankFor(row, top);
          // Only the four named ranks are worth spelling out; "MAEGASHIRA 17"
          // beside every other line is the gutter's number again, in words.
          const title = top && row < 4 ? rank.roman : null;

          return (
            <div key={row} className="contents">
              <Cell
                standing={e}
                size={size}
                side="east"
                onList={!!e && setlist.has(e.song.id)}
                title={title}
                // The count is said once, under the column whose line is
                // lower — east's, or level with west's.
                line={
                  row + 1 === eastFits
                    ? `幕内 — ${setlist.size} MAKE THE SETLIST`
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
                side="west"
                onList={!!w && setlist.has(w.song.id)}
                title={title}
                line={row + 1 === westFits ? "" : null}
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
            Out of the tournament, not deleted. One press brings one back.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {cut.map((standing) => (
              <li key={standing.song.id}>
                <button
                  type="button"
                  onClick={() => onRevive(standing.song.id)}
                  disabled={busy}
                  title={standing.song.artist}
                  className={cn(
                    "font-dot flex min-h-9 items-center gap-2 border-2 border-white/15 px-3 py-1.5",
                    "text-[0.65rem] tracking-wide text-white/45 transition-colors",
                    "hover:border-[color:var(--color-gold)]/60 hover:text-white disabled:opacity-40",
                  )}
                >
                  <RotateCcw className="size-3" aria-hidden />
                  {standing.vetoed ? (
                    <span
                      className="font-jp-gothic text-sm leading-none"
                      style={{ color: PLANNER_NEON[standing.vetoed] }}
                      title={`${PLANNERS[standing.vetoed].label}'s finisher`}
                    >
                      {MOVES.finish.kana}
                    </span>
                  ) : null}
                  <span className="line-through">
                    {standing.song.title.toUpperCase()}
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
