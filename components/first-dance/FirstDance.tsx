"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Play, Square, Volume2, VolumeX } from "lucide-react";
import {
  allCounts,
  clock,
  type EightCount,
  type Movement,
  routine,
  SONG,
  startOf,
  type Tier,
  TIERS,
  type trainingWeek,
} from "@/lib/first-dance";
import { cn } from "@/lib/utils";
import { CountRow, HeldRow } from "./CountRow";
import { FigureCard } from "./Figures";
import { Footsteps, GearKey } from "./Notation";
import { type Mode, SongPanel } from "./SongPanel";
import {
  loadSong,
  readCalibration,
  saveSong,
  writeCalibration,
} from "./songFile";
import { useSongWalk } from "./useSongWalk";
import { useWalkthrough as useWalk } from "./useWalkthrough";
import { Reference } from "./Reference";
import { Strip } from "./Strip";

const TIER_ORDER: Tier[] = ["a", "b", "c"];

/**
 * Runs of eight-counts that hold. The source table wrote "Same." five times in
 * a row; one row that says how long the hold lasts is the same fact, findable.
 */
function group(counts: EightCount[]): EightCount[][] {
  const out: EightCount[][] = [];
  for (const count of counts) {
    const last = out[out.length - 1];
    if (count.continues && last?.[0].continues) last.push(count);
    else out.push([count]);
  }
  return out;
}

export function FirstDance({ week }: { week: ReturnType<typeof trainingWeek> }) {
  const [tier, setTier] = useState<Tier>("a");
  const [bpm, setBpm] = useState<number>(SONG.bpm);
  const [sound, setSound] = useState(true);

  const [mode, setMode] = useState<Mode>("metronome");
  const [song, setSong] = useState<{ file: File; url: string } | null>(null);
  /** Measured against the actual file; 0 and 70 until someone taps them in. */
  const [anchor, setAnchor] = useState(0);
  const [songBpm, setSongBpm] = useState<number>(SONG.bpm);
  const [rate, setRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const urlRef = useRef<string | null>(null);

  const movements = useMemo(() => routine(tier), [tier]);
  const counts = useMemo(() => allCounts(tier), [tier]);
  const indexOf = useMemo(
    () => new Map(counts.map((c, i) => [c.n, i])),
    [counts],
  );

  const gearAt = useCallback(
    (index: number) => counts[index]?.gear ?? 2,
    [counts],
  );

  // Both clocks exist; the mode picks which one the page listens to. They are
  // genuinely different machines — one generates the beat, the other reads it
  // off a recording — so they stay separate rather than sharing a muddle.
  const metronome = useWalk({ total: counts.length, gearAt, bpm, sound });
  const toSong = useSongWalk(audioRef, {
    anchor,
    bpm: songBpm,
    total: counts.length,
  });

  const playing = mode === "song" && song ? toSong : metronome;
  const { spot, running, start, stop, park } = playing;
  const canWalk = mode === "metronome" || song !== null;

  // Whatever is on this device from last session.
  useEffect(() => {
    let alive = true;
    void loadSong().then((file) => {
      if (!alive || !file) return;
      const url = URL.createObjectURL(file);
      urlRef.current = url;
      setSong({ file, url });
      const saved = readCalibration(file);
      if (saved) {
        setAnchor(saved.anchor);
        setSongBpm(saved.bpm);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  // Slowing a recording down to learn to it is only useful if it stays in
  // tune. `currentTime` still measures the song, so nothing else has to know.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = rate;
    audio.preservesPitch = true;
  }, [rate, song]);

  const pick = useCallback((file: File) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    setSong({ file, url });
    const saved = readCalibration(file);
    setAnchor(saved?.anchor ?? 0);
    setSongBpm(saved?.bpm ?? SONG.bpm);
    void saveSong(file);
  }, []);

  const calibrate = useCallback(
    (nextAnchor: number, nextBpm: number) => {
      setAnchor(nextAnchor);
      setSongBpm(nextBpm);
      if (song) {
        writeCalibration({
          name: song.file.name,
          size: song.file.size,
          anchor: nextAnchor,
          bpm: nextBpm,
        });
      }
    },
    [song],
  );

  const at = spot?.index;

  // Keep the eight-count you are on in the middle of the screen. Nobody is
  // scrolling a page while counting.
  useEffect(() => {
    if (!running || at === undefined) return;
    const n = counts[at]?.n;
    if (n === undefined) return;
    document
      .querySelector(`[data-counts~="${n}"]`)
      ?.scrollIntoView({ block: "center" });
  }, [running, at, counts]);

  // Space starts and stops, because your hands are busy and the laptop is on a
  // chair at the edge of the floor.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.metaKey || event.ctrlKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a, input, textarea, select, [contenteditable]")) {
        return;
      }
      event.preventDefault();
      if (running) stop();
      else if (canWalk) void start(at ?? 0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, start, stop, at, canWalk]);

  const jump = useCallback(
    (movement: Movement) => {
      const n = movement.counts[0].n;
      park(indexOf.get(n) ?? 0);
      document
        .getElementById(`m-${movement.id}`)
        ?.scrollIntoView({ block: "start" });
    },
    [indexOf, park],
  );

  const here = at === undefined ? undefined : counts[at]?.n;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 h-planner-bar bg-primary text-primary-foreground shadow-md print:hidden">
        <div className="mx-auto flex h-full max-w-3xl items-center gap-2.5 px-4 sm:gap-4 sm:px-6">
          <h1 className="flex-none">
            <Link
              href="/first-dance"
              className="block rounded-sm pt-1 font-corinthia text-3xl leading-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-foreground sm:text-4xl"
            >
              First Dance
            </Link>
          </h1>

          <button
            type="button"
            disabled={!running && !canWalk}
            title={canWalk ? undefined : "Choose the mp3 first"}
            onClick={() => (running ? stop() : void start(at ?? 0))}
            className="flex flex-none items-center gap-1.5 rounded-full bg-primary-foreground px-3 py-1.5 font-raleway text-xs tracking-wide text-primary transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground sm:px-4 motion-reduce:transition-none"
          >
            {running ? (
              <Square className="h-3 w-3 fill-current" strokeWidth={0} />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
            )}
            {running ? "Stop" : "Walk"}
          </button>

          {spot && (
            <p className="flex flex-none items-baseline gap-1.5" aria-live="off">
              <span className="font-mono text-[0.65rem] tracking-wide text-primary-foreground/70 tabular-nums">
                {spot.countIn ? "in" : `E${counts[spot.index]?.n}`}
              </span>
              <span
                className={cn(
                  "font-mono text-2xl leading-none tabular-nums slashed-zero sm:text-3xl",
                  running ? "text-primary-foreground" : "text-primary-foreground/40",
                )}
              >
                {running ? spot.beat : "—"}
              </span>
            </p>
          )}

          <div className="ml-auto flex flex-none items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setSound((s) => !s)}
              title={sound ? "Silence the clicks" : "Click on every beat"}
              className="rounded-sm p-1 text-primary-foreground/70 transition-colors hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground motion-reduce:transition-none"
            >
              {sound ? (
                <Volume2 className="h-4 w-4" strokeWidth={1.5} />
              ) : (
                <VolumeX className="h-4 w-4" strokeWidth={1.5} />
              )}
              <span className="sr-only">
                {sound ? "Silence the clicks" : "Click on every beat"}
              </span>
            </button>
            <Link
              href="/hosts"
              className="rounded-sm font-raleway text-[0.6rem] tracking-[0.2em] text-primary-foreground/70 uppercase transition-colors hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground motion-reduce:transition-none"
            >
              Hosts
            </Link>
          </div>
        </div>
      </header>

      {/* Played from an object URL over a file on this device. Never uploaded,
          and deliberately not in `public/`, which proxy.ts does not guard. */}
      {song && <audio ref={audioRef} src={song.url} preload="auto" />}

      <main className="mx-auto max-w-3xl px-4 pt-[calc(var(--spacing-planner-bar)+2.5rem)] pb-32 sm:px-6">
        <h2 className="font-garamond text-4xl leading-none text-pop sm:text-5xl">
          {SONG.title}
        </h2>
        <p className="mt-3 max-w-[62ch] font-garamond text-lg leading-relaxed text-foreground/85">
          {SONG.artist}, from {SONG.album}. Seventy beats a minute in four,{" "}
          {SONG.key}, cut hard on the resolution at {SONG.endsAt} — thirty-eight
          eight-counts, a touch under seven seconds each.
        </p>

        <p className="mt-6 max-w-[62ch] border-l-2 border-primary pl-4 font-garamond text-lg leading-relaxed">
          <span className="text-pop">
            Week {week.week} of 17 — {week.block.title.replace(/\.$/, "")}.
          </span>{" "}
          <span className="text-foreground/85">
            {week.weeksToDecision > 0
              ? `${week.weeksToDecision} ${week.weeksToDecision === 1 ? "week" : "weeks"} until the tier decision.`
              : "The tier decision is behind you. Dance what you rehearsed."}
          </span>
        </p>

        <Strip
          className="mt-8"
          segments={movements.map((m) => ({
            key: m.id,
            label: m.name,
            detail: clock(startOf(m.counts[0].n)),
            span: m.counts.length,
            intensity: m.heat,
            active: here !== undefined && m.counts.some((c) => c.n === here),
            onSelect: () => jump(m),
            title: `${m.counts.length} eight-counts`,
          }))}
        />
        <p className="mt-2 font-garamond text-base text-muted-foreground">
          Tap a movement to go to it. Press Walk, or the space bar, for{" "}
          {mode === "song" && song
            ? "the bar before it and then the song, with the sheet following the music."
            : "an eight-count of count-in and then the beat, live, down the sheet."}
        </p>

        <SongPanel
          mode={mode}
          onMode={(next) => {
            // Whichever clock was running is not the one you just asked for.
            metronome.stop();
            toSong.stop();
            setMode(next);
          }}
          song={song}
          onPick={pick}
          bpm={bpm}
          onBpm={setBpm}
          anchor={anchor}
          songBpm={songBpm}
          onCalibrate={calibrate}
          rate={rate}
          onRate={setRate}
          audioRef={audioRef}
        />

        <GearKey />

        <div className="mt-16 space-y-20">
          {movements.map((movement) => (
            <MovementBlock
              key={movement.id}
              movement={movement}
              tier={tier}
              onTier={setTier}
              indexOf={indexOf}
              here={here}
              beat={running ? spot?.beat : undefined}
              countIn={spot?.countIn}
              canWalk={canWalk}
              onStart={(index) => void start(index)}
            />
          ))}
        </div>

        <Reference week={week} tier={tier} />
      </main>
    </>
  );
}


function MovementBlock({
  movement,
  tier,
  onTier,
  indexOf,
  here,
  beat,
  countIn,
  canWalk,
  onStart,
}: {
  movement: Movement;
  tier: Tier;
  onTier: (tier: Tier) => void;
  indexOf: Map<number, number>;
  /** The eight-count the walk-through is on, by its number on the sheet. */
  here?: number;
  beat?: number;
  countIn?: boolean;
  /** False in song mode before a file has been chosen. */
  canWalk: boolean;
  onStart: (index: number) => void;
}) {
  const first = movement.counts[0].n;
  const last = movement.counts[movement.counts.length - 1].n;
  // The pattern repeats every eight-count, so the beat lights all the way
  // through the movement rather than only on the one eight-count you are on.
  const inThis =
    here !== undefined && movement.counts.some((count) => count.n === here);

  return (
    <section id={`m-${movement.id}`} className="scroll-mt-24">
      <h2 className="font-garamond text-4xl leading-none text-pop sm:text-5xl">
        {movement.name}
      </h2>
      <p className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="font-mono text-xs tracking-wide text-muted-foreground tabular-nums slashed-zero">
          E{first}–E{last}, from {clock(startOf(first))}
        </span>
        <span className="font-garamond text-base text-muted-foreground">
          {movement.gearLabel}
        </span>
      </p>

      <p className="mt-3 max-w-[64ch] font-garamond text-lg leading-relaxed text-foreground/85">
        {movement.intent}
      </p>

      {movement.failure && (
        <p className="mt-3 max-w-[64ch] border-l-2 border-warn pl-4 font-garamond text-lg leading-relaxed text-warn">
          {movement.failure}
        </p>
      )}

      {movement.figure && <FigureCard figure={movement.figure} />}

      {movement.footwork && (
        <Footsteps
          footwork={movement.footwork}
          on={inThis && !countIn ? beat : undefined}
        />
      )}

      {movement.id === "peak" && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-2">
            {TIER_ORDER.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onTier(t)}
                aria-pressed={t === tier}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 font-garamond text-lg leading-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none",
                  t === tier
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary",
                )}
              >
                {TIERS[t].name}
              </button>
            ))}
            <span className="font-garamond text-lg text-muted-foreground">
              {TIERS[tier].summary}
            </span>
          </div>
          <p className="mt-2 max-w-[64ch] font-garamond text-lg leading-relaxed text-foreground/85">
            {TIERS[tier].blurb}
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={!canWalk}
        onClick={() => onStart(indexOf.get(first) ?? 0)}
        className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary px-4 py-1.5 font-raleway text-xs tracking-wide text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring print:hidden motion-reduce:transition-none"
      >
        <Play className="h-3 w-3 fill-current" strokeWidth={0} />
        Walk {movement.name}
      </button>

      <ol className="mt-6">
        {group(movement.counts).map((block) =>
          block.length === 1 && !block[0].continues ? (
            <CountRow
              key={block[0].n}
              count={block[0]}
              active={here === block[0].n}
              beat={beat}
              countIn={countIn}
              canWalk={canWalk}
              onStart={() => onStart(indexOf.get(block[0].n) ?? 0)}
            />
          ) : (
            <HeldRow
              key={block[0].n}
              counts={block}
              activeIndex={block.findIndex((c) => c.n === here)}
              beat={beat}
              countIn={countIn}
              canWalk={canWalk}
              onStart={() => onStart(indexOf.get(block[0].n) ?? 0)}
            />
          ),
        )}
      </ol>
    </section>
  );
}
