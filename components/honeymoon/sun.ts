import { parseDay } from "./trip";

/**
 * When it gets dark, for shading the hours.
 *
 * In December Tokyo's sun is down by half past four, and a garden at five or a
 * viewpoint booked for "the evening" is a plan that only looks fine until you
 * are standing in the dark. The Hours layout shades the time after sunset so
 * that reads off the grid instead of off a search.
 *
 * NOAA's general solar position approximation: within a couple of minutes,
 * which is far better than anything this is used for needs.
 */

/** Japan keeps one clock and no daylight saving. */
const JST_OFFSET_MINUTES = 9 * 60;

/**
 * Where the route might go. Legs are free text with no coordinates, so a leg
 * is matched to the first place its name mentions. A miss is harmless — it
 * falls back to the middle of Honshu and the header says the time is rough.
 */
const PLACES: { match: string; lat: number; lng: number }[] = [
  { match: "tokyo", lat: 35.68, lng: 139.69 },
  { match: "yokohama", lat: 35.44, lng: 139.64 },
  { match: "kamakura", lat: 35.32, lng: 139.55 },
  { match: "hakone", lat: 35.23, lng: 139.02 },
  { match: "nikko", lat: 36.75, lng: 139.6 },
  { match: "fuji", lat: 35.5, lng: 138.76 },
  { match: "kawaguchiko", lat: 35.5, lng: 138.76 },
  { match: "matsumoto", lat: 36.24, lng: 137.97 },
  { match: "takayama", lat: 36.14, lng: 137.25 },
  { match: "kanazawa", lat: 36.56, lng: 136.66 },
  { match: "nagoya", lat: 35.18, lng: 136.91 },
  { match: "kyoto", lat: 35.01, lng: 135.77 },
  { match: "nara", lat: 34.69, lng: 135.8 },
  { match: "osaka", lat: 34.69, lng: 135.5 },
  { match: "kobe", lat: 34.69, lng: 135.2 },
  { match: "himeji", lat: 34.82, lng: 134.69 },
  { match: "hiroshima", lat: 34.39, lng: 132.46 },
  { match: "miyajima", lat: 34.3, lng: 132.32 },
  { match: "fukuoka", lat: 33.59, lng: 130.4 },
  { match: "sapporo", lat: 43.06, lng: 141.35 },
];

/** Within about twenty minutes of sunset anywhere from Tokyo to Osaka. */
const MIDDLE = { lat: 35.2, lng: 137.0 };

export type Sun = {
  /** Minutes past midnight, Japan time. */
  rise: number;
  set: number;
  /** True when the place wasn't recognised and the middle of Honshu stood in. */
  approximate: boolean;
};

/**
 * Sunset for the first of `places` this recognises. A draft leg called
 * "Akihabara" isn't in the table, but the agreed "Tokyo" leg on the same day
 * is, so callers pass both.
 */
export function sunOn(
  iso: string,
  ...places: (string | null | undefined)[]
): Sun {
  const names = places.map((p) => p?.toLowerCase()).filter(Boolean);
  const known = names
    .map((name) => PLACES.find((p) => name!.includes(p.match)))
    .find(Boolean);
  const { lat, lng } = known ?? MIDDLE;
  return { ...sunTimes(iso, lat, lng), approximate: !known };
}

function sunTimes(iso: string, lat: number, lng: number) {
  const day = parseDay(iso);
  const dayOfYear =
    Math.round(
      (Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) -
        Date.UTC(day.getFullYear(), 0, 1)) /
        86_400_000,
    ) + 1;

  // The fractional year at local noon, in radians.
  const g = ((2 * Math.PI) / 365) * (dayOfYear - 1);
  const equationOfTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g));
  const declination =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);

  // 90.833° allows for refraction and the sun's own radius: sunset is when
  // the top edge goes, not the middle.
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const latitude = rad(lat);
  const hourAngle =
    (Math.acos(
      Math.cos(rad(90.833)) / (Math.cos(latitude) * Math.cos(declination)) -
        Math.tan(latitude) * Math.tan(declination),
    ) *
      180) /
    Math.PI;

  const rise = 720 - 4 * (lng + hourAngle) - equationOfTime;
  const set = 720 - 4 * (lng - hourAngle) - equationOfTime;
  return {
    rise: Math.round(rise + JST_OFFSET_MINUTES),
    set: Math.round(set + JST_OFFSET_MINUTES),
  };
}
