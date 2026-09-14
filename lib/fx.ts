import "server-only";
import { after } from "next/server";
import { supabase } from "./supabase";
import { FALLBACK_YEN_PER_USD } from "@/components/honeymoon/trip";
import type { Rate } from "@/components/honeymoon/types";

/**
 * Yen per dollar, from the ECB reference rate via Frankfurter — free, no key,
 * and published once each business day.
 *
 * The board re-renders every 12 seconds while it's open, so it must never call
 * the feed on the request path. The rate is cached in `fx_rates`; a read that
 * finds it more than half a day old serves the cached value immediately and
 * refreshes it after the response has gone out. The one exception is a
 * brand-new database with no row at all, which waits for a single fetch.
 */
const FEED = "https://api.frankfurter.dev/v1/latest?base=USD&symbols=JPY";
const PAIR = "USD_JPY";
const STALE_AFTER_MS = 12 * 60 * 60 * 1000;

export async function getRate(): Promise<Rate> {
  const { data } = await supabase
    .from("fx_rates")
    .select("rate, as_of, fetched_at")
    .eq("pair", PAIR)
    .maybeSingle();

  if (!data) {
    return (await refresh()) ?? fallback();
  }

  if (Date.now() - new Date(data.fetched_at).getTime() > STALE_AFTER_MS) {
    after(refresh);
  }

  return { yenPerUsd: data.rate, asOf: data.as_of, live: true };
}

function fallback(): Rate {
  return { yenPerUsd: FALLBACK_YEN_PER_USD, asOf: null, live: false };
}

/** Never throws: a dead feed means an older rate, not a broken board. */
async function refresh(): Promise<Rate | null> {
  try {
    const res = await fetch(FEED, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;

    const body = (await res.json()) as {
      date?: string;
      rates?: { JPY?: number };
    };
    const rate = body.rates?.JPY;
    if (!rate || rate <= 0 || !body.date) return null;

    await supabase.from("fx_rates").upsert({
      pair: PAIR,
      rate,
      as_of: body.date,
      fetched_at: new Date().toISOString(),
    });

    return { yenPerUsd: rate, asOf: body.date, live: true };
  } catch {
    return null;
  }
}
