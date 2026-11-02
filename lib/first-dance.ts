/**
 * The first dance, as data.
 *
 * The source was a markdown count sheet: a table per movement, one row per
 * eight-count, every line the same size. That reads fine at a desk and not at
 * all on a dance floor, which is the only place it gets used. So the content is
 * modelled the way it is actually consumed:
 *
 *   - a CUE of three to five words, big enough to read from across the room
 *   - the DETAIL underneath, for the pass where you are standing still
 *   - BEATS, where the choreography is per-beat rather than per-eight-count
 *
 * Nothing here is in the database. It is a fixed artefact of one evening, the
 * two of them are the only readers, and an editor would be more page than the
 * thing needs.
 */

export const SONG = {
  title: "Touching Heaven",
  artist: "JOHNNYSWIM",
  album: "Georgica Pond",
  year: 2016,
  bpm: 70,
  meter: "4/4",
  key: "F♯ major",
  /** The edit: a hard cut at the musical resolution. */
  endsAt: "4:20",
} as const;

/** Both 5'7". Lead ~170 lb, follow ~160 lb — near-equal mass is why the
 *  counterbalances are stable and why nothing here is a hoist. */
export const FLOOR = [
  "Ballgown, and a bustle if she bustles for the reception",
  "Suede soles on hardwood",
  "Audience on all four sides",
  "Follow has wrist limitations — no load through a hand, ever",
] as const;

/* Time -------------------------------------------------------------------- */

export const BEAT_MS = 60_000 / SONG.bpm; // 857.14ms
export const EIGHT_MS = BEAT_MS * 8; // 6.857s
export const TOTAL_EIGHTS = 38;

/**
 * Where an eight-count falls in the track, computed rather than transcribed.
 * The source sheet's timestamps were hand-estimated and drifted against their
 * own section headings — M1 was labelled 0:00–1:00 but its last eight-count was
 * written at 1:16. Deriving every time from the tempo keeps the whole strip
 * self-consistent, and the sheet said to renumber against the real file anyway.
 */
export function startOf(n: number) {
  return ((n - 1) * EIGHT_MS) / 1000;
}

export function clock(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/* Gears ------------------------------------------------------------------- */

export type Gear = 1 | 2 | 3;

export const GEARS: Record<Gear, { name: string; short: string; per: number }> = {
  1: { name: "Gear 1", short: "every two beats", per: 4 },
  2: { name: "Gear 2", short: "every beat", per: 8 },
  3: { name: "Gear 3", short: "every half beat", per: 16 },
};

/** Which of the eight beats carry a weight change. Gear 3 doubles up, which the
 *  pip row draws by splitting each pip rather than by drawing sixteen. */
export function weightedBeats(gear: Gear): number[] {
  if (gear === 1) return [1, 3, 5, 7];
  return [1, 2, 3, 4, 5, 6, 7, 8];
}

/* The routine ------------------------------------------------------------- */

/**
 * A named figure, so it can be looked up and watched.
 *
 * The source sheet described every element physically and named none of them —
 * "single slow 360°, led low at waist height" rather than "free spin". That is
 * fine with a teacher in the room and useless without one, because you cannot
 * search for a description. Every figure here carries the words a video will
 * actually use.
 *
 * `effort` is the honest read on learning it from video with nobody correcting
 * you, and `instead` is where the sheet asks for something harder or less
 * documented than it needs to.
 */
export type Figure = {
  name: string;
  /** Phrases that return the figure, not an essay about weddings. */
  lookUp: string[];
  /** The feet, by count, from the lead's side. */
  steps?: string;
  /** Where the sheet's rhythm differs from how the figure is taught. */
  timing?: string;
  effort: Effort;
  /** A change worth making, and why. */
  instead?: string;
};

/** How much of it you get from watching, and how much only from repetition. */
export type Effort = "session" | "weeks" | "careful";

export const EFFORT: Record<Effort, string> = {
  session: "An evening with a video gets you this.",
  weeks: "Weeks of repetition. Video shows you the shape, not the timing.",
  careful: "This one can hurt someone. Read the mechanics before the reps.",
};

export type BeatSpan = {
  /** 1-indexed beat within the eight-count. */
  from: number;
  /** Inclusive. Omitted for a single beat. */
  to?: number;
  text: string;
};

/**
 * The feet, by beat, for each of you.
 *
 * Deliberately the same shape as `BeatSpan` so it draws on the same eight
 * columns as the choreography does — the footwork is not a different kind of
 * fact, it is the same eight beats read from the floor up. Seeing both rows
 * against each other is also the only way to check the thing beginners get
 * wrong most: which foot you are supposed to finish on.
 */
export type Footwork = {
  lead: BeatSpan[];
  follow: BeatSpan[];
  /** Shape, direction, or the thing the feet alone do not say. */
  note?: string;
};

export type EightCount = {
  n: number;
  /**
   * Stable name for the move itself, where the same move appears in both
   * endings. Tier edits key off this rather than off `n`, because the two
   * endings put the catch, the dip and the spin at different numbers.
   */
  id?: string;
  /** Three to five words. The thing you read while moving. */
  cue: string;
  detail: string;
  gear: Gear;
  /** Set where the eight-count is choreographed beat by beat. */
  beats?: BeatSpan[];
  /** Mechanics that belong to this moment rather than to the whole sheet. */
  note?: { title: string; body: string };
  /** A hold: identical to the eight-count before it. Consecutive holds render
   *  as one stretch instead of five rows reading "Same." */
  continues?: boolean;
  /** Carries load, or altitude. Drawn heavier, and never drilled cold. */
  care?: boolean;
  /** Set where this eight-count is its own nameable figure. */
  figure?: Figure;
  /** Set where the feet depart from the movement's pattern. */
  footwork?: Footwork;
};

export type Movement = {
  id: string;
  ord: number;
  name: string;
  /** What the movement is for, in the room's terms rather than the dancer's. */
  intent: string;
  /** The way it goes wrong. Absent where the source sheet named none. */
  failure?: string;
  gearLabel: string;
  /** 0–1. Drives how heavily the movement's spine is drawn: the page's own
   *  picture of the song's arc, quiet through the peak and back. */
  heat: number;
  /** The figure the movement is mostly made of. Individual eight-counts carry
   *  their own where they depart from it. */
  figure?: Figure;
  /** The repeating pattern under the movement, for the same reason. */
  footwork?: Footwork;
  counts: EightCount[];
};

export const MOVEMENTS: Movement[] = [
  {
    id: "settle",
    ord: 1,
    name: "Settle",
    gearLabel: "Gear 1 throughout",
    heat: 0.15,
    figure: {
      name: "Box step, turning",
      lookUp: ["rumba box step", "box step turning left"],
      steps:
        "Lead: forward L · side R · close L · back R · side L · close R. Follow mirrors it, starting back on the right. Six steps and you are where you began, which is what makes it a box.",
      timing:
        "Schools count the box differently — slow-quick-quick and quick-quick-slow are both taught — but the footprint is identical in all of them, so any video works. Gear 1 gives you four even changes rather than six.",
      effort: "session",
      instead:
        "Dance the real six-step box rather than four even changes. Nothing on the sheet depends on the count of four, and every video you find will show six — translating each one is friction you will pay forty times over. Turn it LEFT, too: a left-turning box is the version everybody teaches.",
    },
    footwork: {
      lead: [
        { from: 1, to: 2, text: "L forward" },
        { from: 3, to: 4, text: "R side" },
        { from: 5, to: 6, text: "L back" },
        { from: 7, to: 8, text: "R closes" },
      ],
      follow: [
        { from: 1, to: 2, text: "R back" },
        { from: 3, to: 4, text: "L side" },
        { from: 5, to: 6, text: "R forward" },
        { from: 7, to: 8, text: "L closes" },
      ],
      note: "This is the six-step box with its two closing steps absorbed, which is what Gear 1's four changes leave room for. The eighth of a turn comes out of the forward and back steps angling a few degrees — never from twisting the frame, which just unscrews you from each other.",
    },
    intent:
      "Deliberately unimpressive. You are setting the baseline that everything after it contrasts against. The slow full rotation is also the answer to a round room: over one minute, every section of it gets a front view without you doing anything.",
    failure:
      "Rushing. At Gear 1 it will feel like you are barely moving. That is correct.",
    counts: [
      {
        n: 1,
        cue: "Walk on",
        detail:
          "Enter from opposite sides of the floor. Walk, don't dance. Eyes up, and find each other.",
        gear: 1,
      },
      {
        n: 2,
        cue: "Converge",
        detail:
          "Keep closing. Match your walking speed to each other by eye — this is the first unison the room sees, and it happens before the dance starts.",
        gear: 1,
      },
      {
        n: 3,
        cue: "Meet, and stop",
        detail:
          "Meet at centre. A full beat of stillness and level eye contact before either of you moves.",
        gear: 1,
        beats: [
          { from: 1, text: "meet" },
          { from: 2, text: "still" },
          { from: 5, text: "he offers" },
          { from: 7, text: "she takes" },
        ],
      },
      {
        n: 4,
        cue: "Frame up",
        detail:
          "Establish the ballgown frame. Four weight changes. No travel at all.",
        gear: 1,
      },
      {
        n: 5,
        cue: "Begin the turn",
        detail:
          "Start a slow clockwise rotation — an eighth of a turn per eight-count, and no more.",
        gear: 1,
      },
      { n: 6, cue: "Keep turning", detail: "", gear: 1, continues: true },
      {
        n: 7,
        cue: "Drift it wider",
        detail:
          "The rotation carries on; add a small drift so it opens into a circle about six feet across, around the point where you met.",
        gear: 1,
      },
      { n: 8, cue: "Keep turning", detail: "", gear: 1, continues: true },
      { n: 9, cue: "Keep turning", detail: "", gear: 1, continues: true },
      { n: 10, cue: "Keep turning", detail: "", gear: 1, continues: true },
      { n: 11, cue: "Keep turning", detail: "", gear: 1, continues: true },
      {
        n: 12,
        cue: "Close the circle",
        detail:
          "A full 360° is complete across E5–E12. The room has now seen both your faces.",
        gear: 1,
        beats: [{ from: 7, to: 8, text: "he opens the frame" }],
      },
    ],
  },
  {
    id: "open",
    ord: 2,
    name: "Open",
    gearLabel: "Gear 2",
    heat: 0.35,
    figure: {
      name: "Progressive walks, curving",
      lookUp: ["rumba walks", "rumba open break"],
      steps:
        "One-hand hold, facing. He walks forward along the inside of the arc, she walks back along the outside, one step per beat. The arc comes from both of you angling a little on every step, not from steering.",
      effort: "session",
      instead:
        "The sheet does not say whether you face each other or travel side by side. Face each other: a round room then sees a front and a back rather than two profiles, and backward travel is led rather than guessed — which matters in a gown she cannot see behind.",
    },
    footwork: {
      lead: [
        { from: 1, text: "L fwd" },
        { from: 2, text: "R" },
        { from: 3, text: "L" },
        { from: 4, text: "R" },
        { from: 5, text: "L" },
        { from: 6, text: "R" },
        { from: 7, text: "L" },
        { from: 8, text: "R" },
      ],
      follow: [
        { from: 1, text: "R back" },
        { from: 2, text: "L" },
        { from: 3, text: "R" },
        { from: 4, text: "L" },
        { from: 5, text: "R" },
        { from: 6, text: "L" },
        { from: 7, text: "R" },
        { from: 8, text: "L" },
      ],
      note: "Eight steps means you finish on the other foot and start the next eight-count on the one you began with — check that and you will catch a dropped step before it compounds. He walks the inside of the arc, so his steps are shorter than hers; the curve comes from both of you angling a few degrees each step rather than from him steering.",
    },
    intent:
      "The first “look at that” moment is literally just walking. Covering real ground with intent reads as trained; rotating on the spot reads as a school dance. The skirt does the rest.",
    counts: [
      {
        n: 13,
        cue: "Break open",
        detail:
          "Open position, his left to her right. Begin a large arc — curved travel on a radius of about eight feet.",
        gear: 2,
      },
      {
        n: 14,
        cue: "Walk the arc",
        detail: "Eight walking steps per eight-count, square on the beat.",
        gear: 2,
      },
      {
        n: 15,
        cue: "Halfway round",
        detail: "Keep going. You should be at the far side of the circle.",
        gear: 2,
      },
      {
        n: 16,
        cue: "Back to centre",
        detail: "Complete the circle, closing toward the middle of the floor.",
        gear: 2,
      },
      {
        n: 17,
        cue: "First spin",
        detail:
          "A single slow 360°, led low at waist height with a body-rotation cue. She spots. The skirt flares.",
        gear: 2,
        figure: {
          name: "Free spin",
          lookUp: ["free spin salsa", "how to spot a turn dancing"],
          steps:
            "He releases on 1 with a small body-rotation cue; she turns on her own and he takes the hand again as she arrives. Spotting is the whole technique: eyes hold one point, head whips round last.",
          effort: "weeks",
          instead:
            "The usual figure here is an underarm turn, and the sheet rules it out for good reason at equal height. A free spin is the named alternative — no raised arm, and no load through her wrists at all, which suits the wrist protocol better than the standard figure does.",
        },
        footwork: {
          lead: [
            { from: 1, text: "release" },
            { from: 2, to: 4, text: "hold your ground, stay square to her" },
            { from: 5, text: "offer the hand" },
            { from: 6, to: 8, text: "settle, frame back up" },
          ],
          follow: [
            { from: 1, text: "step out" },
            { from: 2, to: 3, text: "walk the turn round, spotting" },
            { from: 4, text: "close, facing him" },
            { from: 5, to: 8, text: "take the hand, settle" },
          ],
          note: "A 360° over four beats at this tempo is walked round, not whipped — closer to four steps on a small circle than to a spin. Her head is the only fast thing in it.",
        },
        beats: [
          { from: 1, to: 4, text: "turn" },
          { from: 5, to: 8, text: "settle" },
        ],
        note: {
          title: "Skirt radius",
          body: "Know it, and mark it on the practice floor. You cannot step where you think you can.",
        },
      },
      {
        n: 18,
        cue: "Back to frame",
        detail: "Return to the closed frame. Prep for the release.",
        gear: 2,
      },
    ],
  },
  {
    id: "break",
    ord: 3,
    name: "Break",
    gearLabel: "Gear 2, the mirrored unison",
    heat: 0.5,
    figure: {
      name: "Apart work",
      lookUp: ["dance shines", "port de bras arms"],
      steps:
        "Nothing here is a partner figure — you are apart for five eight-counts. The walking needs no technique; the arms do.",
      effort: "weeks",
    },
    intent:
      "Side-by-side unison only reads from two sides of a round room. Mirrored and facing, every guest sees one of you in profile and one head-on executing the same phrase — so it reads from every seat.",
    failure:
      "Timing, not shape quality. Match the count and sloppy shapes still read as unison; miss by a quarter beat and clean shapes read as chaos.",
    counts: [
      {
        n: 19,
        cue: "Release",
        detail:
          "Both step back to about eight feet apart. The synchronised release is itself the signal — nothing else announces it.",
        gear: 2,
        beats: [
          { from: 1, text: "back" },
          { from: 3, text: "back" },
          { from: 5, text: "back" },
          { from: 7, to: 8, text: "hold" },
        ],
        footwork: {
          lead: [
            { from: 1, to: 2, text: "L back" },
            { from: 3, to: 4, text: "R back" },
            { from: 5, to: 6, text: "L back" },
            { from: 7, to: 8, text: "hold, weight centred" },
          ],
          follow: [
            { from: 1, to: 2, text: "L back" },
            { from: 3, to: 4, text: "R back" },
            { from: 5, to: 6, text: "L back" },
            { from: 7, to: 8, text: "hold, weight centred" },
          ],
          note: "The SAME foot each, not mirrored feet. Facing each other and both starting on the left is what the room reads as a mirror; opposite feet would read as one of you getting it wrong.",
        },
      },
      {
        n: 20,
        cue: "Orbit",
        detail:
          "Walk a circle around a common centre, staying diametrically opposite. Eyes locked across the gap. Eight steps.",
        gear: 2,
        footwork: {
          lead: [
            { from: 1, text: "L fwd" },
            { from: 2, text: "R" },
            { from: 3, text: "L" },
            { from: 4, text: "R" },
            { from: 5, text: "L" },
            { from: 6, text: "R" },
            { from: 7, text: "L" },
            { from: 8, text: "R" },
          ],
          follow: [
            { from: 1, text: "L fwd" },
            { from: 2, text: "R" },
            { from: 3, text: "L" },
            { from: 4, text: "R" },
            { from: 5, text: "L" },
            { from: 6, text: "R" },
            { from: 7, text: "L" },
            { from: 8, text: "R" },
          ],
          note: "Both walking forward, same foot, half a circle each across the eight-count. If you can see the other's face straight across the middle the whole way, you are still opposite — that is the only check you need, and it is why the eyes stay locked.",
        },
      },
      {
        n: 21,
        cue: "Finish the orbit",
        detail:
          "Eight more steps. Every section of the room has now watched one of you pass in front of it.",
        gear: 2,
      },
      {
        n: 22,
        cue: "Mirror, facing",
        detail:
          "Both stop, facing each other, and run the phrase as a mirror rather than side by side.",
        gear: 2,
        figure: {
          name: "Port de bras, mirrored",
          lookUp: ["port de bras", "ballroom arm styling"],
          steps:
            "Arms only, with a quarter turn in the middle. Port de bras is the name for carrying the arms as a shape rather than waving them; it is where to look for the quality.",
          effort: "weeks",
          instead:
            "This is the only passage in the routine with no figure behind it — somebody invented it, so no video shows it. Consider halving it: one slow sweep and the quarter turn, holding 5–8. Two people doing one simple thing together beats two people nearly doing four.",
        },
        beats: [
          { from: 1, to: 2, text: "sweep up and out" },
          { from: 3, to: 4, text: "quarter turn away" },
          { from: 5, to: 6, text: "sweep down, shift" },
          { from: 7, to: 8, text: "turn back to face" },
        ],
        footwork: {
          lead: [
            { from: 1, to: 2, text: "feet still, weight centred" },
            { from: 3, to: 4, text: "quarter turn on both balls" },
            { from: 5, to: 6, text: "weight to the outside foot" },
            { from: 7, to: 8, text: "quarter turn back" },
          ],
          follow: [
            { from: 1, to: 2, text: "feet still, weight centred" },
            { from: 3, to: 4, text: "quarter turn on both balls" },
            { from: 5, to: 6, text: "weight to the outside foot" },
            { from: 7, to: 8, text: "quarter turn back" },
          ],
          note: "Almost no footwork, which is exactly why it is hard — with nothing travelling, the only thing keeping you together is the count. Both of you turn away from each other on 3, so the room sees the shape open outward.",
        },
        note: {
          title: "Drill this one dry",
          body: "Metronome, no music, until it is automatic — then put the song back. This is the eight-count most worth over-rehearsing.",
        },
      },
      {
        n: 23,
        cue: "Walk back in",
        detail: "Eight slow steps toward each other.",
        gear: 2,
        footwork: {
          lead: [
            { from: 1, text: "L fwd" },
            { from: 2, text: "R" },
            { from: 3, text: "L" },
            { from: 4, text: "R" },
            { from: 5, text: "L" },
            { from: 6, text: "R" },
            { from: 7, text: "L" },
            { from: 8, text: "R closes" },
          ],
          follow: [
            { from: 1, text: "L fwd" },
            { from: 2, text: "R" },
            { from: 3, text: "L" },
            { from: 4, text: "R" },
            { from: 5, text: "L" },
            { from: 6, text: "R" },
            { from: 7, text: "L" },
            { from: 8, text: "R closes" },
          ],
          note: "Eight feet of floor in eight steps, so they are ordinary walking steps, not lunges. Same foot each again — you are still mirrored until the moment you close.",
        },
        beats: [{ from: 8, text: "close" }],
      },
    ],
  },
  {
    id: "build",
    ord: 4,
    name: "Build",
    gearLabel: "Gear 2 → 3 → 2",
    heat: 0.75,
    figure: {
      name: "Closed-position walks, curving",
      lookUp: ["closed position walks dance", "rumba progressive walks"],
      steps:
        "The walking from Open, but in closed frame and on a wider circle. He goes forward, she goes back, one step a beat.",
      timing:
        "Gear 2 is eight changes an eight-count and a box is six steps, so this cannot be a box however it is shaped. Settle is the box; Build is the same walking as Open with the frame closed.",
      effort: "session",
    },
    footwork: {
      lead: [
        { from: 1, text: "L fwd" },
        { from: 2, text: "R" },
        { from: 3, text: "L" },
        { from: 4, text: "R" },
        { from: 5, text: "L" },
        { from: 6, text: "R" },
        { from: 7, text: "L" },
        { from: 8, text: "R" },
      ],
      follow: [
        { from: 1, text: "R back" },
        { from: 2, text: "L" },
        { from: 3, text: "R" },
        { from: 4, text: "L" },
        { from: 5, text: "R" },
        { from: 6, text: "L" },
        { from: 7, text: "R" },
        { from: 8, text: "L" },
      ],
      note: "Open's walk with the frame closed and the circle wider. In closed hold she cannot see where she is going at all, so he checks the path over her shoulder and the steps stay short enough to stop inside one.",
    },
    intent:
      "The gear change is the point. The room's ear is calibrated to 70 by now; at E27 the rate of visible events doubles. It costs almost nothing technically and reads as a burst of skill.",
    counts: [
      {
        n: 24,
        cue: "Travel, big frame",
        detail:
          "Closed frame, travelling a large circle — wider than the one in Settle.",
        gear: 2,
      },
      {
        n: 25,
        cue: "Let it rise",
        detail: "Keep travelling. The energy comes up with the arrangement.",
        gear: 2,
      },
      {
        n: 26,
        cue: "Compress in",
        detail: "Still travelling, but gather toward the centre at the end.",
        gear: 2,
        beats: [{ from: 7, to: 8, text: "compress" }],
      },
      {
        n: 27,
        cue: "Double time",
        detail:
          "A full eight-count at Gear 3. Small quick steps, tight couple rotation, two to three full turns. The skirt is at flare the whole way.",
        gear: 3,
        figure: {
          name: "Couple pivots",
          lookUp: ["pivot turns ballroom", "couple pivots dance"],
          steps:
            "Both of you rotate around a shared centre, stepping between each other's feet — his right foot forward between hers as hers goes back between his, and alternating. Sixteen small steps in the eight-count.",
          effort: "weeks",
          instead:
            "Build to one full rotation, then two. Three at speed is a lot of dizziness to carry into what comes after, and a skirt at flare is a skirt you can stand on.",
        },
        footwork: {
          lead: [
            { from: 1, to: 4, text: "eight small steps — about one turn" },
            { from: 5, to: 8, text: "eight more — the second turn" },
          ],
          follow: [
            { from: 1, to: 4, text: "eight small steps, mirroring him" },
            { from: 5, to: 8, text: "eight more, square up on 8" },
          ],
          note: "Sixteen steps in the eight-count, one every half beat. Keep every one of them underneath your own body — a rotation that travels is a rotation that finds the cake table. Neither of you steers: rotate as one piece and let the frame hold the shape.",
        },
      },
      {
        n: 28,
        cue: "Breathe out",
        detail:
          "Back to Gear 2. A big shape, arms extended, and recover the breath — you will need it.",
        gear: 2,
      },
    ],
  },
];

/* The ending -------------------------------------------------------------- */

/**
 * Two arrangements of the last ten eight-counts.
 *
 * Everything through E28 is the same dance either way, and both endings are
 * exactly eighty counts, which is the only reason they are interchangeable at
 * all: the recording is fixed, so an ending that ran long would not be a
 * variation, it would be a different edit of the song.
 */
export type Ending = "planned" | "flow";

export const ENDINGS: Record<
  Ending,
  { name: string; summary: string; blurb: string }
> = {
  planned: {
    name: "As planned",
    summary: "Leans, then the lift",
    blurb:
      "The ending as it was choreographed: spin out, a dip, into and out of a colgada, then the spin, the lift and the second dip. The band's return at 3:33 lands on the colgada resolving.",
  },
  flow: {
    name: "Flowed",
    summary: "The lift on the return, the dip out of the turn",
    blurb:
      "The same material reordered so the lift lands on the band's return at 3:33, with stillness before it and a travelling turn between the lift and the dip. Three care moves instead of five, and no weight reversal without counts to recover in.",
  },
};

/* Figures the two endings share. Written once so a correction to the mechanics
   cannot land on one version of the ending and not the other. */

const COLGADA: Figure = {
  name: "Colgada",
  lookUp: [
    "tango colgada",
    "colgada technique partner",
    "acroyoga counterbalance",
    "partner counterbalance two person",
  ],
  steps:
    "Forearm to forearm, each hand closing below the other's elbow. Both lean away until the connection is carrying you, spines long, hips under you. A colgada is a counterbalance with a tango name — the physics is the same, and the acro videos explain it better because they talk about the forces rather than the styling.",
  effort: "careful",
  instead:
    "Take the angle in stages across the weeks — 20°, then 25°, then 30°. At near-equal mass the shape is self-correcting at a shallow angle: too little lean and you simply stand up, too much and you feel it immediately. Deep is different. At 35° a broken connection puts both of you down, and the only thing that stops it breaking is having done it enough times to feel it going.",
};

const COLGADA_FOOTWORK: Footwork = {
  lead: [
    { from: 1, to: 2, text: "feet apart, plant, set the grip" },
    { from: 3, to: 8, text: "shuffle round — small steps, never crossed" },
  ],
  follow: [
    { from: 1, to: 2, text: "feet apart, plant, set the grip" },
    { from: 3, to: 8, text: "shuffle round, weight back the whole way" },
  ],
  note: "Feet stay wide and never cross — a crossed foot is the one thing that can take the base out from under a colgada. You rotate by shuffling, not by stepping over.",
};

const LEAN_AWAY = {
  title: "Both of you lean away",
  body: "The connection is what holds you up. Keep your spines long — the failure is bending at the waist, which collapses the shape and dumps the load onto arms. If it feels like either of you is holding the other up, the angle is wrong.",
};

const SPIN: Figure = {
  name: "Multiple free spins",
  lookUp: ["multiple spins spotting", "how to do multiple turns dance"],
  steps:
    "The same spin as E17, repeated without stopping. Spotting is the only thing that makes more than one possible.",
  effort: "careful",
  instead:
    "Cut it to two rotations. Three or four consecutive turns is months of work on its own, and this is the eight-count that hands you into the catch — she has to come out of it on her feet and knowing where he is.",
};

const SPIN_FOOTWORK: Footwork = {
  lead: [
    { from: 1, text: "low cue, release" },
    { from: 2, to: 6, text: "hold square, track her" },
    { from: 7, to: 8, text: "square up, find her" },
  ],
  follow: [
    { from: 1, text: "step out" },
    { from: 2, to: 6, text: "turn, spotting every one" },
    { from: 7, to: 8, text: "last turn, find him, feet under you" },
  ],
  note: "He stays square and still the whole way through, which is what gives her something to spot. Her spot point has to be him, not a wall — she arrives needing to know where he is, not where the room is. This is the eight-count the whole ending hangs on: everything after it assumes you both finish it facing each other and balanced.",
};

const LIFT: Figure = {
  name: "Waist lift, half turn",
  lookUp: ["waist lift partner dance", "beginner dance lift technique"],
  steps:
    "She jumps and he redirects that jump upward, hands at the natural waist above the skirt. He turns 180° with her up, and sets her down on two feet.",
  effort: "careful",
  instead:
    "Dance Tier B. Not because the lift is beyond you, but because of what it is entered from: she has to find a jump on a specific count while dizzy out of a multi-turn spin, and he has to receive a body arriving with momentum he cannot predict. That combination is what drops people, and it is the one thing on this sheet that no amount of careful reading substitutes for someone spotting you.",
};

const SHE_JUMPS = {
  title: "She jumps; he redirects",
  body: "He is never hoisting dead weight. If it feels like lifting, the count is off — not the strength. The waist is the only viable grip on a structured ballgown: the bodice gives you something to hold, the skirt gives you nothing.",
};

const DIP: Figure = {
  name: "Dip",
  lookUp: ["how to dip your partner", "ballroom dip technique"],
  steps:
    "She keeps a straight supporting leg under her and her own core loaded; he lowers by bending his knees, never by leaning back. Her head follows her spine rather than dropping on its own.",
  effort: "careful",
  instead:
    "Take the standard depth, head above hips — Tier C's version. An inverted dip needs her to hold her own weight upside down and him to have a base that does not move, and on camera the difference between a clean standard dip and a wobbling deep one is all in the wobble.",
};

const SUPPORTED = {
  title: "Supported, not held",
  body: "Her centre of mass stays over the line between her supporting foot and his, and she keeps her own core loaded. Watch for the skirt bunching behind her and wedging — practise this one in the actual crinoline.",
};

const UP_AND_HOLD: EightCount = {
  n: 0,
  id: "up-and-hold",
  cue: "Up, and hold",
  detail: "Three seconds of recovery, straight up, into a held close position.",
  gear: 2,
  footwork: {
    lead: [
      { from: 1, to: 4, text: "straighten the knees — no pulling with the arms" },
      { from: 5, to: 8, text: "close, held" },
    ],
    follow: [
      { from: 1, to: 4, text: "come up through your own standing leg" },
      { from: 5, to: 8, text: "close, held" },
    ],
    note: "Up the same way you went down and at the same speed. A dip that drops in three seconds and snaps up in one looks like a rescue.",
  },
};

const LAND_IT: EightCount = {
  n: 38,
  id: "land-it",
  cue: "Land it",
  detail:
    "Closed frame, near-motionless, one slow quarter rotation. Kiss or held pose on the final chord — and stay there until the track has genuinely ended.",
  gear: 2,
  footwork: {
    lead: [
      { from: 1, to: 8, text: "a quarter turn across the whole eight-count. Almost nothing." },
    ],
    follow: [
      { from: 1, to: 8, text: "a quarter turn across the whole eight-count. Almost nothing." },
    ],
    note: "There is no footwork left to get wrong here, which is the point. The only mistake available is moving too soon.",
  },
};

const LAND: Movement = {
  id: "land",
  ord: 7,
  name: "Land",
  gearLabel: "Near-motionless",
  heat: 0.2,
  intent:
    "Hold until the audio actually stops. Breaking early undoes the whole ending, and the ending is the part people carry out of the room.",
  counts: [LAND_IT],
};

/**
 * The closing movements, per ending. Both run out of E28 and both finish on
 * E38, so the strip, the walk-through and every timecode on the page are
 * computed the same way whichever one is on screen.
 */
export const ENDING_MOVEMENTS: Record<Ending, Movement[]> = {
  planned: [
    {
      id: "leans",
      ord: 5,
      name: "The leans",
      gearLabel: "Gear 2",
      heat: 0.8,
      intent:
        "Four eight-counts of weight thrown away from centre and caught: a spin out into a lean, a dip, and a colgada in and out of itself. It is the loudest thing in the routine before the lift.",
      failure:
        "The direction reverses on every count and there is nowhere to recover. Out, down, out, out — then E33 asks you both to be back on your own axis, spinning. Nothing here is beyond you individually; it is the joins that have no counts in them.",
      counts: [
        {
          n: 29,
          id: "spin-out",
          cue: "Spin out",
          detail:
            "His left arm goes out and she spins out of the frame along it, then comes back in to a lean on his left shoulder.",
          gear: 2,
          care: true,
          note: {
            title: "The arm guides, it does not pull",
            body: "She turns herself; his arm is the track she turns around. Her wrists cannot take load, so the moment the spin needs his hand to drive it, it has become the wrong figure — slow the lead down instead.",
          },
        },
        {
          n: 30,
          id: "dramatic-dip",
          cue: "Dramatic dip",
          detail:
            "She steps in on her left and commits her weight into a dip; he catches it and holds to about 5, then brings her up.",
          gear: 2,
          care: true,
          figure: DIP,
          note: {
            title: "This is the first of two dips",
            body: "E36 is a dip as well. Two dips eight eight-counts apart read as one idea repeated rather than two moments, and the second one is the one the song is paying for — so this one stays shallow and brisk, or it steals from the real one.",
          },
        },
        {
          n: 31,
          id: "colgada",
          cue: "Colgada",
          detail:
            "She comes back up and steps right to prep; he comes back up and steps left. Then both lean away into the colgada.",
          gear: 2,
          care: true,
          figure: COLGADA,
          footwork: COLGADA_FOOTWORK,
          note: LEAN_AWAY,
        },
        {
          n: 32,
          id: "finish-colgada",
          cue: "Finish the colgada",
          detail:
            "Come out of it, and he holds the lean at the end with his left foot extended out as the support.",
          gear: 2,
          care: true,
          note: {
            title: "The band comes back here",
            body: "3:33 is the biggest event in the recording — a jump of about 35 dB out of six seconds of near-silence. In this version it arrives on a lean resolving, which is a shape finishing rather than a shape starting. That mismatch is the whole argument for the other ending.",
          },
        },
      ],
    },
    {
      id: "peak",
      ord: 6,
      name: "Peak",
      gearLabel: "Gear 2, and the tier choice",
      heat: 1,
      intent:
        "The spin into the lift into the dip, back to back. It runs in from E32 and out through E37 the same way at every tier, so dropping a tier in November costs you nothing you have already rehearsed.",
      counts: [
        {
          n: 33,
          id: "continuous-spin",
          cue: "Continuous spin",
          detail:
            "He leads her into three to four continuous rotations from a low connection and holds his own orientation, so he is square and still when she comes out of them. This is the visual peak of the whole thing.",
          gear: 2,
          figure: SPIN,
          footwork: SPIN_FOOTWORK,
        },
        {
          n: 34,
          cue: "Keep spinning",
          detail: "",
          gear: 2,
          continues: true,
        },
        {
          n: 35,
          id: "the-catch",
          cue: "The catch",
          detail:
            "She exits the spin into his frame. He receives at the natural waist, above the skirt volume, on her jump. Hips rise about eighteen inches and he rotates 180° with her airborne for a second and a half.",
          gear: 2,
          care: true,
          figure: LIFT,
          footwork: {
            lead: [
              { from: 1, to: 4, text: "feet apart, knees soft, hands ready at her waist" },
              { from: 5, text: "catch, from the legs" },
              { from: 6, text: "turn 180°" },
              { from: 7, text: "set down" },
              { from: 8, text: "settle" },
            ],
            follow: [
              { from: 1, to: 4, text: "exit the spin, feet under you, find him" },
              { from: 5, text: "jump" },
              { from: 6, text: "stay long" },
              { from: 7, text: "land, both feet" },
              { from: 8, text: "settle" },
            ],
            note: "Her jump comes from the knees and she stays long in the air; he takes it with his legs, never by pulling with his arms. The timing is hers and he only redirects it. If he is pulling on 5, the count went wrong — stop and reset rather than finishing it. Practise the jump and catch standing still, on a count, dozens of times before it ever comes out of a spin.",
          },
          beats: [{ from: 7, text: "down" }],
          note: SHE_JUMPS,
        },
        {
          n: 36,
          id: "the-dip",
          cue: "The dip",
          detail:
            "Three seconds down. Head below hips, her supporting leg loaded, free leg extended. His descent is knee-driven, not a backward lean. Hold at the bottom.",
          gear: 2,
          care: true,
          figure: DIP,
          footwork: {
            lead: [
              { from: 1, to: 4, text: "down over three seconds — bend the knees, spine stays upright" },
              { from: 5, to: 8, text: "hold, and keep breathing" },
            ],
            follow: [
              { from: 1, to: 4, text: "supporting leg straight under you, free leg extends" },
              { from: 5, to: 8, text: "hold — your core, not his arms" },
            ],
            note: "His feet are apart and staggered, front foot between hers, so the base is a triangle rather than a line. Her weight stays over the line between her standing foot and his front one; the moment it goes outside that, he is lifting instead of supporting.",
          },
          note: SUPPORTED,
        },
        { ...UP_AND_HOLD, n: 37 },
      ],
    },
    LAND,
  ],

  flow: [
    {
      id: "peak",
      ord: 5,
      name: "Peak",
      gearLabel: "Gear 2, and the tier choice",
      heat: 1,
      intent:
        "Seven eight-counts built around one event: the band coming back at 3:33. The spin fills the last of the loud stretch, the hole gets stillness, the lift lands on the return, and the dip is what the lift's momentum turns into rather than a second thing that happens afterwards.",
      failure:
        "Stopping anywhere between E32 and E34. The lift, the travel and the dip are one shape; if the landing settles before the turn starts, it becomes a lift and then a dip, which is what the other ending already does.",
      counts: [
        {
          n: 29,
          id: "continuous-spin",
          cue: "Continuous spin",
          detail:
            "He leads her into three to four continuous rotations from a low connection and holds his own orientation, so he is square and still when she comes out of them. The band is still at full height here — this is what spends the end of it.",
          gear: 2,
          figure: SPIN,
          footwork: SPIN_FOOTWORK,
        },
        {
          n: 30,
          cue: "Keep spinning",
          detail: "",
          gear: 2,
          continues: true,
        },
        {
          n: 31,
          id: "hold-breathe",
          cue: "Hold, and breathe",
          detail:
            "The track falls away to almost nothing here — the quietest six seconds in the song, about −40 dB. Counts 1–5: closed position, weight settled, no rotation and no weight changes at all. Look at each other. Count 6: his hands find her waist, above the skirt volume. Counts 7–8: both sink into a plié together, slowly, so it reads as a breath rather than a prep.",
          gear: 1,
          beats: [
            { from: 1, to: 5, text: "still" },
            { from: 6, text: "hands set" },
            { from: 7, to: 8, text: "sink" },
          ],
          note: {
            title: "Stillness is not a seam",
            body: "A pause mid-phrase while the band is going reads as something gone wrong. A pause in near-silence reads as tension and the room leans in. Same stillness, opposite effect — the difference is entirely whether the music is holding its breath with you. The sink on 7–8 is the only thing that moves in six seconds, and it is where the jump comes from: nobody jumps from straight legs.",
          },
        },
        {
          n: 32,
          id: "the-catch",
          cue: "The catch",
          detail:
            "She jumps out of the plié and he redirects it; hands at the natural waist, above the skirt volume. He completes the whole 180° while she is airborne so he is square and planted before she comes down, and sets her on two feet by 5. Then the landing does not stop — her weight transfers straight out of it and the two of you begin to turn.",
          gear: 2,
          care: true,
          figure: LIFT,
          footwork: {
            lead: [
              { from: 1, to: 2, text: "take the jump — lift from the legs" },
              { from: 3, to: 4, text: "turn 180°, square and planted" },
              { from: 5, text: "set her down, both feet" },
              { from: 6, to: 8, text: "step out of it and start the rotation" },
            ],
            follow: [
              { from: 1, to: 2, text: "jump out of the plié" },
              { from: 3, to: 4, text: "airborne, stay long" },
              { from: 5, text: "land, both feet" },
              { from: 6, to: 8, text: "weight straight out of the landing, begin to turn" },
            ],
            note: "Everything is a count and a half earlier than it would be if the lift were the end of the phrase, and that is deliberate: counts 6–8 are what the travel is made of. Her jump comes from the knees; he takes it with his legs, never by pulling with his arms. If he is pulling, the count went wrong — stop and reset rather than finishing it. Practise the jump and the catch standing still, on a count, dozens of times before it ever comes out of a spin.",
          },
          beats: [
            { from: 5, text: "down" },
            { from: 6, to: 8, text: "and out, turning" },
          ],
          note: SHE_JUMPS,
        },
        {
          n: 33,
          id: "carry-the-turn",
          cue: "Carry the turn",
          detail:
            "The horizontal part of the arc, and the reason the ending stops reading as two separate stunts. A travelling closed rotation, two or three steps, living off the momentum the landing gave you. Nothing technical here — this is just the two of you dancing.",
          gear: 2,
          note: {
            title: "Why there is a plain eight-count here",
            body: "A lift goes up and a dip goes down, so up-then-down is a reversal, and reversals always read as a stop. Put a horizontal between the two verticals and it becomes an arc: up, across, down. This is also why real routines dip out of a turn rather than from standing — the dip needs something to grow out of.",
          },
        },
        {
          n: 34,
          id: "the-dip",
          cue: "The dip",
          detail:
            "Led out of the rotation, never from a standstill. Counts 1–2: he checks the turn, and the momentum that was going around goes down instead — that redirection is the entry, so there is nothing to start and nothing to brace for. Counts 3–6: three seconds down, head below hips, her supporting leg straight and loaded, free leg extended, his descent knee-driven with a long back. Counts 7–8: hold at the bottom.",
          gear: 2,
          care: true,
          figure: DIP,
          footwork: {
            lead: [
              { from: 1, to: 2, text: "check the turn — the rotation becomes the descent" },
              { from: 3, to: 6, text: "down over three seconds, knee-driven, spine upright" },
              { from: 7, to: 8, text: "hold, and keep breathing" },
            ],
            follow: [
              { from: 1, to: 2, text: "let the turn stop you, weight onto the supporting leg" },
              { from: 3, to: 6, text: "supporting leg straight under you, free leg extends" },
              { from: 7, to: 8, text: "hold — your core, not his arms" },
            ],
            note: "His feet are apart and staggered by the end of 2, front foot between hers, so the base is a triangle rather than a line. Her weight stays over the line between her standing foot and his front one; the moment it goes outside that, he is lifting instead of supporting. The entry is the new part — the descent itself is the same dip as ever.",
          },
          note: SUPPORTED,
        },
        { ...UP_AND_HOLD, n: 35 },
      ],
    },
    {
      id: "land",
      ord: 6,
      name: "Land",
      gearLabel: "Gear 2, winding down",
      heat: 0.3,
      intent:
        "The band is still big until about 4:08 and then goes. Three eight-counts that spend what is left of it and arrive at the final pose already nearly still, rather than stopping dead on the last chord.",
      counts: [
        {
          n: 36,
          id: "spin-out",
          cue: "Spin out",
          detail:
            "His left arm goes out and she spins out of the frame along it, then comes back in to a lean on his left shoulder.",
          gear: 2,
          care: true,
          note: {
            title: "The arm guides, it does not pull",
            body: "She turns herself; his arm is the track she turns around. Her wrists cannot take load, so the moment the spin needs his hand to drive it, it has become the wrong figure — slow the lead down instead.",
          },
        },
        {
          n: 37,
          id: "slow-turn",
          cue: "Slow the turn",
          detail:
            "The band starts dropping away around 4:10. Let the travel die into a slow closed rotation with the weight changes getting further apart, so you arrive at the final pose already nearly still.",
          gear: 1,
        },
        LAND_IT,
      ],
    },
  ],
};

/* Tiers ------------------------------------------------------------------- */

export type Tier = "a" | "b" | "c";

export const TIERS: Record<
  Tier,
  { name: string; summary: string; blurb: string }
> = {
  a: {
    name: "Tier A",
    summary: "Lift, inverted dip",
    blurb:
      "The target. Four rotations, the catch, and a full dip with her head below her hips.",
  },
  b: {
    name: "Tier B",
    summary: "No lift",
    blurb:
      "Drop the altitude and nothing else. She exits the spin into a held shape with both feet down, and the ending carries on exactly as written.",
  },
  c: {
    name: "Tier C",
    summary: "Two spins, no lift, standard dip",
    blurb:
      "The safety version, and still a routine: two rotations instead of four, no altitude, and a standard-depth dip with her head above her hips. It reads as confident and rehearsed, just with less in it that can go wrong.",
  },
};

/**
 * Tier edits are keyed by an eight-count's `id` rather than its number,
 * because the two endings put the same three moves at different numbers. An
 * id the current ending does not contain is simply not applied, which is how
 * one table covers both.
 */
const TIER_EDITS: Record<
  Exclude<Tier, "a">,
  Record<string, Partial<EightCount>>
> = {
  b: {
    "the-catch": {
      cue: "The catch, feet down",
      detail:
        "She exits the spin and he catches her into a held shape with both feet on the floor. Everything either side of this is unchanged.",
      beats: undefined,
      figure: undefined,
      footwork: undefined,
      note: {
        title: "Why this is the first thing to go",
        body: "The lift is the only element carrying altitude, and it is the one the rest of the ending does not depend on. Removing it changes one eight-count.",
      },
    },
  },
  c: {
    "continuous-spin": {
      cue: "Spin, twice",
      detail:
        "Two rotations from the low connection, taken slowly across the full sixteen counts, with him square and still. Two is comfortably inside what a 3″ heel on suede will give you.",
      figure: {
        name: "Double free spin",
        lookUp: ["double spin dance spotting", "how to spot a turn dancing"],
        steps:
          "E17's spin, twice through, without stopping between. Spotting is the whole of it — the head holds its point and whips round last, twice.",
        effort: "weeks",
      },
    },
    "the-catch": {
      cue: "Close the frame",
      detail:
        "She exits the spin into a closed frame, both feet down. Settle, and carry on.",
      beats: undefined,
      figure: undefined,
      footwork: undefined,
      note: undefined,
      care: false,
    },
    "the-dip": {
      cue: "The dip, standard depth",
      detail:
        "Three seconds down to a standard depth — no inversion, head stays above hips. Her supporting leg loaded, his descent knee-driven. Hold.",
      figure: {
        name: "Dip, standard depth",
        lookUp: ["how to dip your partner", "ballroom dip technique"],
        steps:
          "She keeps a straight supporting leg under her and her own core loaded; he lowers by bending his knees, never by leaning back. Head stays above hips.",
        effort: "session",
      },
      note: {
        title: "Still practise it in the crinoline",
        body: "A shallower dip does not stop the skirt bunching behind her and wedging. That is a gown problem, not a depth problem.",
      },
    },
  },
};

/** Which ending the page opens on. */
export const DEFAULT_ENDING: Ending = "planned";

/** The routine as danced, at a given tier and with a given ending. */
export function routine(tier: Tier, ending: Ending = DEFAULT_ENDING): Movement[] {
  const all = [...MOVEMENTS, ...ENDING_MOVEMENTS[ending]];
  if (tier === "a") return all;
  const edits = TIER_EDITS[tier];
  return all.map((movement) => {
    if (!movement.counts.some((c) => c.id && edits[c.id])) return movement;
    return {
      ...movement,
      counts: movement.counts.map((c) =>
        c.id && edits[c.id] ? { ...c, ...edits[c.id] } : c,
      ),
    };
  });
}

/** Flat, in order — what the walk-through steps through. */
export function allCounts(tier: Tier, ending: Ending = DEFAULT_ENDING) {
  return routine(tier, ending).flatMap((m) => m.counts);
}

export function movementOf(
  n: number,
  tier: Tier = "a",
  ending: Ending = DEFAULT_ENDING,
) {
  return routine(tier, ending).find((m) => m.counts.some((c) => c.n === n));
}

/**
 * Every named figure in the routine, in order, with where it happens. One list
 * so the whole thing can be watched through in a sitting rather than hunted
 * down a movement at a time.
 */
export function allFigures(tier: Tier = "a", ending: Ending = DEFAULT_ENDING) {
  const found: { where: string; figure: Figure }[] = [];
  for (const movement of routine(tier, ending)) {
    if (movement.figure) {
      found.push({ where: movement.name, figure: movement.figure });
    }
    for (const count of movement.counts) {
      if (count.figure) {
        found.push({ where: `E${count.n}, ${count.cue}`, figure: count.figure });
      }
    }
  }
  return found;
}

/* Protocols --------------------------------------------------------------- */

export type Protocol = { id: string; title: string; lede: string; rules: string[] };

export const CONVENTIONS: Protocol[] = [
  {
    id: "frame",
    title: "Ballgown frame",
    lede: "Closed position, with the skirt given its own room.",
    rules: [
      "His right hand on her left shoulder blade.",
      "Her left hand rests on his right upper arm. No weight through it.",
      "Left-to-right hands joined at chest height.",
      "Expect eighteen to twenty-four inches of air at the waist. Don't fight the gap — hold the upper body cleanly and let the skirt occupy its own space.",
    ],
  },
  {
    id: "grip",
    title: "Counterbalance grip",
    lede: "Forearm to forearm, each hand closing just below the other's elbow.",
    rules: [
      "Never hand-to-hand under load.",
      "This routes force through elbow and shoulder and keeps her wrists out of the path entirely.",
    ],
  },
  {
    id: "spins",
    title: "Spin leads",
    lede: "Every turn is led low.",
    rules: [
      "From a connection at waist height, or from her shoulder blade.",
      "No overhead arm. At equal height it looks strained and forces her to duck.",
      "She spots: head holds a fixed point, then whips round last.",
    ],
  },
  {
    id: "room",
    title: "Eyes, and the round room",
    lede: "Four sides are watching and you are the same height.",
    rules: [
      "Eyes level and direct, on each other. Her feet are invisible under the gown; there is nothing down there to look at.",
      "Any figure held longer than four counts should be rotating slowly, so every side gets a front view.",
    ],
  },
];

export const CARE: Protocol[] = [
  {
    id: "wrist",
    title: "Wrists",
    lede: "The constraint the whole routine was designed around.",
    rules: [
      "Every load-bearing connection is forearm to forearm. No exceptions.",
      "She never takes weight through an extended arm or an open hand.",
      "In closed frame her left hand rests. It carries no load.",
      "Led low or from the shoulder blade, spins need no wrist involvement at all.",
      "If practice volume starts aggravating it, cut reps that day. There is enormous schedule margin.",
      "If it reaches elbows or shoulders too, the counterbalance design needs revisiting — say so rather than working through it.",
    ],
  },
  {
    id: "gown",
    title: "The gown",
    lede: "Rehearse in the actual crinoline from week 6. A bedsheet doesn't simulate volume.",
    rules: [
      "Measure the skirt radius, mark it on the practice floor, and treat it as a no-step zone.",
      "If she's bustling for the reception, rehearse in the bustled configuration — not the full train.",
      "She cannot see behind her. All backward travel is led, with him checking the path.",
      "Expect the frame gap. The design accepted it; don't try to close it.",
    ],
  },
  {
    id: "shoes",
    title: "Shoes and floor",
    lede: "Suede soles, and a floor you may only meet once.",
    rules: [
      "Brush the soles before each session. They need breaking in.",
      "Never wear them outside. Grit in suede changes the friction completely and you will not be able to spin.",
      "Lock the model and heel height early. Spin count is heel-dependent — a 3″ heel meaningfully reduces achievable rotations against a 2″.",
      "Test the venue floor if you can get access. Hardwood over a springy subfloor behaves differently from hardwood over slab.",
    ],
  },
];

/* The 17 weeks ------------------------------------------------------------ */

/** Week 1 began here. Seventeen weeks out from the wedding. */
export const TRAINING_START = "2026-07-31";
export const TRAINING_WEEKS = 17;

export type Block = {
  id: string;
  weeks: [number, number];
  months: string;
  title: string;
  body: string;
};

export const BLOCKS: Block[] = [
  {
    id: "technique",
    weeks: [1, 4],
    months: "August",
    title: "Technique only. Zero choreography.",
    body: "Frame and connection. Walking on the beat. Weight transfer at all three gears. Spin technique with spotting. Counterbalance drills at increasing angles. Book three to five private lessons in here — frame and spin are proprioceptive and cannot be self-corrected from video.",
  },
  {
    id: "set",
    weeks: [5, 10],
    months: "September to mid-October",
    title: "Set the choreography, backwards.",
    body: "Peak first, then Build, Break, Open, Settle. Whatever you drill first accumulates the most reps; working forward leaves your ending permanently under-rehearsed, and the ending is what people remember.",
  },
  {
    id: "integrate",
    weeks: [11, 15],
    months: "mid-October to mid-November",
    title: "Integration.",
    body: "Full run-throughs. Crinoline and shoes every session. Venue floor if you can get it. Record from guest eye level every time — the video will show you you're both looking down, and that is the single biggest fixable thing.",
  },
  {
    id: "maintain",
    weeks: [16, 17],
    months: "late November",
    title: "Maintenance.",
    body: "Two or three full runs a week. No new material, no refinements. Deload and let it settle.",
  },
];

/** The tier decision is made at the end of week 15, not on the day. */
export const DECISION_WEEK = 15;

export const SESSION = [
  { minutes: 5, what: "Walking on the beat, no partner. Metronome at 70." },
  { minutes: 10, what: "Frame and connection. Gear 1 and 2 weight transfer." },
  { minutes: 20, what: "The block's material. One movement per session in Block 2." },
  { minutes: 5, what: "One full run of everything set so far, recorded." },
  { minutes: 5, what: "Watch it back together. Name one thing each to fix next time." },
] as const;

/** Which week of the plan today falls in, and what that week is for. Clamped,
 *  so the page still reads sensibly before week 1 and after the wedding. */
export function trainingWeek(now = new Date()) {
  const start = new Date(`${TRAINING_START}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.floor((today.getTime() - start.getTime()) / 86_400_000);
  const raw = Math.floor(days / 7) + 1;
  const week = Math.min(Math.max(raw, 1), TRAINING_WEEKS);
  return {
    week,
    /** Before the plan starts, or after the wedding. */
    outside: raw !== week,
    block: BLOCKS.find((b) => week >= b.weeks[0] && week <= b.weeks[1]) ?? BLOCKS[0],
    weeksToDecision: DECISION_WEEK - week,
  };
}
