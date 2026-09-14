/**
 * Airports this trip could plausibly touch: the home airport, the US hubs with
 * Pacific routes, Japan, and the usual Asian and Pacific connections.
 *
 * Deliberately a short hand-kept list rather than an 8,000-row dataset. Each
 * entry carries what a confirmation email doesn't: the IANA time zone, so times
 * can be typed exactly as printed, and the longitude, so the page knows
 * whether a route really crosses the date line rather than guessing from the
 * clocks. Anything missing can still be entered as "another airport" with a
 * time zone picked by hand.
 */
export type Airport = {
  code: string;
  city: string;
  name: string;
  tz: string;
  country: string;
  lon: number;
};

export const AIRPORTS: Airport[] = [
  // Home
  {
    code: "SLC",
    city: "Salt Lake City",
    name: "Salt Lake City International",
    tz: "America/Denver",
    country: "US",
    lon: -111.98,
  },

  // US gateways to Japan
  {
    code: "LAX",
    city: "Los Angeles",
    name: "Los Angeles International",
    tz: "America/Los_Angeles",
    country: "US",
    lon: -118.41,
  },
  {
    code: "SFO",
    city: "San Francisco",
    name: "San Francisco International",
    tz: "America/Los_Angeles",
    country: "US",
    lon: -122.38,
  },
  {
    code: "SEA",
    city: "Seattle",
    name: "Seattle–Tacoma International",
    tz: "America/Los_Angeles",
    country: "US",
    lon: -122.31,
  },
  {
    code: "PDX",
    city: "Portland",
    name: "Portland International",
    tz: "America/Los_Angeles",
    country: "US",
    lon: -122.6,
  },
  {
    code: "SAN",
    city: "San Diego",
    name: "San Diego International",
    tz: "America/Los_Angeles",
    country: "US",
    lon: -117.19,
  },
  {
    code: "LAS",
    city: "Las Vegas",
    name: "Harry Reid International",
    tz: "America/Los_Angeles",
    country: "US",
    lon: -115.15,
  },
  {
    code: "PHX",
    city: "Phoenix",
    name: "Phoenix Sky Harbor",
    tz: "America/Phoenix",
    country: "US",
    lon: -112.01,
  },
  {
    code: "DEN",
    city: "Denver",
    name: "Denver International",
    tz: "America/Denver",
    country: "US",
    lon: -104.67,
  },
  {
    code: "DFW",
    city: "Dallas",
    name: "Dallas/Fort Worth International",
    tz: "America/Chicago",
    country: "US",
    lon: -97.04,
  },
  {
    code: "ORD",
    city: "Chicago",
    name: "O'Hare International",
    tz: "America/Chicago",
    country: "US",
    lon: -87.91,
  },
  {
    code: "JFK",
    city: "New York",
    name: "John F. Kennedy International",
    tz: "America/New_York",
    country: "US",
    lon: -73.78,
  },
  {
    code: "ANC",
    city: "Anchorage",
    name: "Ted Stevens Anchorage International",
    tz: "America/Anchorage",
    country: "US",
    lon: -149.99,
  },
  {
    code: "HNL",
    city: "Honolulu",
    name: "Daniel K. Inouye International",
    tz: "Pacific/Honolulu",
    country: "US",
    lon: -157.92,
  },
  {
    code: "YVR",
    city: "Vancouver",
    name: "Vancouver International",
    tz: "America/Vancouver",
    country: "CA",
    lon: -123.18,
  },

  // Japan
  {
    code: "HND",
    city: "Tokyo",
    name: "Haneda",
    tz: "Asia/Tokyo",
    country: "JP",
    lon: 139.78,
  },
  {
    code: "NRT",
    city: "Tokyo",
    name: "Narita",
    tz: "Asia/Tokyo",
    country: "JP",
    lon: 140.39,
  },
  {
    code: "KIX",
    city: "Osaka",
    name: "Kansai International",
    tz: "Asia/Tokyo",
    country: "JP",
    lon: 135.24,
  },
  {
    code: "ITM",
    city: "Osaka",
    name: "Itami",
    tz: "Asia/Tokyo",
    country: "JP",
    lon: 135.44,
  },
  {
    code: "NGO",
    city: "Nagoya",
    name: "Chubu Centrair",
    tz: "Asia/Tokyo",
    country: "JP",
    lon: 136.81,
  },
  {
    code: "FUK",
    city: "Fukuoka",
    name: "Fukuoka",
    tz: "Asia/Tokyo",
    country: "JP",
    lon: 130.45,
  },
  {
    code: "CTS",
    city: "Sapporo",
    name: "New Chitose",
    tz: "Asia/Tokyo",
    country: "JP",
    lon: 141.69,
  },
  {
    code: "OKA",
    city: "Okinawa",
    name: "Naha",
    tz: "Asia/Tokyo",
    country: "JP",
    lon: 127.65,
  },
  {
    code: "HIJ",
    city: "Hiroshima",
    name: "Hiroshima",
    tz: "Asia/Tokyo",
    country: "JP",
    lon: 132.92,
  },
  {
    code: "SDJ",
    city: "Sendai",
    name: "Sendai",
    tz: "Asia/Tokyo",
    country: "JP",
    lon: 140.92,
  },

  // Common connections
  {
    code: "ICN",
    city: "Seoul",
    name: "Incheon International",
    tz: "Asia/Seoul",
    country: "KR",
    lon: 126.45,
  },
  {
    code: "TPE",
    city: "Taipei",
    name: "Taoyuan International",
    tz: "Asia/Taipei",
    country: "TW",
    lon: 121.23,
  },
  {
    code: "HKG",
    city: "Hong Kong",
    name: "Hong Kong International",
    tz: "Asia/Hong_Kong",
    country: "HK",
    lon: 113.92,
  },
  {
    code: "MNL",
    city: "Manila",
    name: "Ninoy Aquino International",
    tz: "Asia/Manila",
    country: "PH",
    lon: 121.02,
  },
  {
    code: "GUM",
    city: "Guam",
    name: "Antonio B. Won Pat International",
    tz: "Pacific/Guam",
    country: "GU",
    lon: 144.8,
  },
];

const BY_CODE = new Map(AIRPORTS.map((a) => [a.code, a]));

export function airport(code: string): Airport | undefined {
  return BY_CODE.get(code.toUpperCase());
}

/** Where "home time" is measured from, and which arrivals count as going home. */
export const HOME_AIRPORT = "SLC";
export const HOME_TZ = "America/Denver";
