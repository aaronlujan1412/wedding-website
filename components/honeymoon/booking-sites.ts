/**
 * Where a booking was made, read off its own link.
 *
 * Not a column: the link already carries it, and a site typed by hand beside a
 * link that says otherwise is the kind of disagreement nobody notices until
 * they're at a desk. A stay booked over the phone has no link and no site to
 * show, which is honest — there is no page to open.
 *
 * The names are what the site calls itself, so the word on screen matches the
 * word on the confirmation email you're looking for in your inbox.
 */

const SITES: Record<string, string> = {
  "booking.com": "Booking.com",
  "agoda.com": "Agoda",
  "travel.rakuten.co.jp": "Rakuten Travel",
  "travel.rakuten.com": "Rakuten Travel",
  "rakuten.co.jp": "Rakuten Travel",
  "jalan.net": "Jalan",
  "ikyu.com": "Ikyu",
  "japanican.com": "Japanican",
  "expedia.com": "Expedia",
  "expedia.co.jp": "Expedia",
  "hotels.com": "Hotels.com",
  "airbnb.com": "Airbnb",
  "airbnb.co.jp": "Airbnb",
  "hostelworld.com": "Hostelworld",
  "marriott.com": "Marriott",
  "hilton.com": "Hilton",
  "ihg.com": "IHG",
  "hyatt.com": "Hyatt",
  "tripadvisor.com": "Tripadvisor",
  "trip.com": "Trip.com",
  "klook.com": "Klook",
};

/**
 * The name of the site a link points at, or the bare host when it's one we
 * don't keep a name for — a hotel's own site is most of that case, and its
 * domain is usually its name anyway.
 */
export function bookingSite(url: string | null | undefined): string | null {
  if (!url) return null;

  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    // Someone pasted something that isn't a URL. Nothing to name.
    return null;
  }
  if (!host) return null;

  // Longest match wins, so travel.rakuten.co.jp beats rakuten.co.jp.
  const known = Object.keys(SITES)
    .filter((domain) => host === domain || host.endsWith(`.${domain}`))
    .sort((a, b) => b.length - a.length)[0];

  return known ? SITES[known] : host;
}
