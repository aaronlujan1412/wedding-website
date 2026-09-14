import { cn } from "@/lib/utils";
import { airport } from "./airports";
import {
  dateLine,
  dayShift,
  flightMinutes,
  formatClockIn,
  formatDateIn,
  formatSpan,
  utcToZoned,
  zoneName,
} from "./flights";
import type { TripFlight } from "./types";

/**
 * Two airports and the line between them — and, where the route really
 * crosses it, the International Date Line, with the calendar date flipping on
 * either side.
 *
 * That's this tab's one loud element, because it's the thing people get wrong.
 * You leave Salt Lake on the 4th and land in Tokyo on the 5th, so the hotel
 * needs booking from the 5th; coming home you land at an earlier clock time
 * than you took off. Every time is shown in its own airport's zone.
 */
export function RouteLine({
  flight,
  size = "hero",
}: {
  flight: TripFlight;
  size?: "hero" | "compact";
}) {
  const hero = size === "hero";
  const crossing = dateLine(flight);
  const shift = dayShift(flight);
  const from = airport(flight.from_airport);
  const to = airport(flight.to_airport);

  const dep = utcToZoned(flight.departs_at, flight.departs_tz);
  const arr = utcToZoned(flight.arrives_at, flight.arrives_tz);
  // Compared as local wall clocks: "2026-12-26 09:50" < "2026-12-26 17:00".
  const landsEarlier = `${arr.date} ${arr.time}` < `${dep.date} ${dep.time}`;

  const depDate = formatDateIn(flight.departs_at, flight.departs_tz);
  const arrDate = formatDateIn(flight.arrives_at, flight.arrives_tz);
  const shortDate = (iso: string, tz: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      month: "short",
      day: "numeric",
    }).format(new Date(iso));

  const summary = [
    `${flight.from_airport} to ${flight.to_airport}`,
    formatSpan(flightMinutes(flight)),
    crossing ? "crosses the International Date Line" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="w-full" role="group" aria-label={summary}>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-5">
        <span
          className={cn(
            "font-mono font-medium leading-none tracking-tight text-foreground",
            hero ? "text-5xl sm:text-7xl" : "text-2xl",
          )}
        >
          {flight.from_airport}
        </span>

        <div
          className={cn("relative", hero ? "h-14" : "h-8")}
          aria-hidden="true"
        >
          <span
            className={cn(
              "absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-foreground/40",
              hero && "animate-route-draw motion-reduce:animate-none",
            )}
          />
          <span
            className={cn(
              "absolute top-1/2 right-0 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-foreground/60",
              hero && "animate-route-mark motion-reduce:animate-none",
            )}
          />
          {/* With a date line in the way, the duration moves under the route. */}
          {!crossing && (
            <span
              className={cn(
                "absolute top-0 left-1/2 -translate-x-1/2 font-mono text-muted-foreground tabular-nums slashed-zero",
                hero ? "text-xs" : "text-[0.6rem]",
              )}
            >
              {formatSpan(flightMinutes(flight))}
            </span>
          )}

          {crossing && (
            <span
              className={cn(
                "absolute inset-y-0 flex flex-col items-center",
                hero && "animate-route-mark motion-reduce:animate-none",
              )}
              style={{ left: `${crossing.at * 100}%` }}
            >
              <span
                className={cn(
                  "border-l border-dashed border-seal",
                  hero ? "h-full" : "-my-1 h-[calc(100%+0.5rem)] border-l-[1.5px]",
                )}
              />
              {!hero && (
                <>
                  {/* Compact rows still show the date flipping, just smaller. */}
                  <span className="absolute top-1/2 right-1.5 -translate-y-[120%] font-mono text-[0.55rem] whitespace-nowrap text-muted-foreground tabular-nums slashed-zero">
                    {shortDate(flight.departs_at, flight.departs_tz)}
                  </span>
                  <span className="absolute top-1/2 left-1.5 -translate-y-[120%] font-mono text-[0.55rem] whitespace-nowrap text-seal tabular-nums slashed-zero">
                    {shortDate(flight.arrives_at, flight.arrives_tz)}
                  </span>
                </>
              )}
              {hero && (
                <>
                  {/* The date literally changes here. */}
                  <span className="absolute top-1/2 right-2 -translate-y-[130%] font-mono text-[0.65rem] whitespace-nowrap text-muted-foreground tabular-nums slashed-zero">
                    {shortDate(flight.departs_at, flight.departs_tz)}
                  </span>
                  <span className="absolute top-1/2 left-2 -translate-y-[130%] font-mono text-[0.65rem] whitespace-nowrap text-seal tabular-nums slashed-zero">
                    {shortDate(flight.arrives_at, flight.arrives_tz)}
                  </span>
                  <span className="absolute top-full mt-1 font-raleway text-[0.55rem] tracking-[0.2em] whitespace-nowrap text-seal uppercase">
                    Date line
                  </span>
                </>
              )}
            </span>
          )}
        </div>

        <span
          className={cn(
            "text-right font-mono font-medium leading-none tracking-tight text-foreground",
            hero ? "text-5xl sm:text-7xl" : "text-2xl",
          )}
        >
          {flight.to_airport}
        </span>
      </div>

      <div
        className={cn(
          "grid grid-cols-2 gap-4",
          hero ? (crossing ? "mt-7" : "mt-3") : crossing ? "mt-2" : "mt-1",
        )}
      >
        <Stop
          hero={hero}
          city={flight.from_city ?? from?.city}
          airportName={from?.name}
          date={depDate}
          time={formatClockIn(flight.departs_at, flight.departs_tz)}
          zone={zoneName(flight.departs_at, flight.departs_tz)}
        />
        <Stop
          hero={hero}
          align="right"
          city={flight.to_city ?? to?.city}
          airportName={to?.name}
          date={arrDate}
          time={formatClockIn(flight.arrives_at, flight.arrives_tz)}
          zone={zoneName(flight.arrives_at, flight.arrives_tz)}
          badge={
            shift !== 0
              ? `${shift > 0 ? "+" : "−"}${Math.abs(shift)} day`
              : null
          }
          note={landsEarlier ? "Earlier by the clock than you left" : null}
        />
      </div>

      {crossing && (
        <p className="mt-2 text-center font-mono text-[0.65rem] text-muted-foreground tabular-nums slashed-zero">
          {formatSpan(flightMinutes(flight))} in the air
        </p>
      )}
    </div>
  );
}

function Stop({
  hero,
  align = "left",
  city,
  airportName,
  date,
  time,
  zone,
  badge,
  note,
}: {
  hero: boolean;
  align?: "left" | "right";
  city?: string | null;
  airportName?: string;
  date: string;
  time: string;
  zone: string;
  badge?: string | null;
  note?: string | null;
}) {
  return (
    <div className={align === "right" ? "text-right" : undefined}>
      {hero && city && (
        <p className="font-garamond text-lg leading-tight text-foreground sm:text-xl">
          {city}
          {/* On a phone the airport's full name wraps and knocks the two
              times out of line, and the code above already says which one. */}
          {airportName && airportName !== city && (
            <span className="hidden text-muted-foreground sm:inline"> · {airportName}</span>
          )}
        </p>
      )}
      <p
        className={cn(
          "font-mono text-muted-foreground tabular-nums slashed-zero",
          hero ? "mt-1 text-sm" : "text-[0.65rem]",
        )}
      >
        {date}
      </p>
      <p
        className={cn(
          "flex items-baseline gap-1.5 font-mono text-foreground tabular-nums slashed-zero",
          align === "right" && "justify-end",
          hero ? "text-2xl" : "text-sm",
        )}
      >
        {time}
        <span
          className={cn(
            "text-muted-foreground",
            hero ? "text-xs" : "text-[0.6rem]",
          )}
        >
          {zone}
        </span>
        {badge && (
          <span
            className={cn(
              "rounded-sm border border-seal/50 px-1 font-raleway font-semibold text-seal",
              hero ? "text-[0.65rem]" : "text-[0.55rem]",
            )}
          >
            {badge}
          </span>
        )}
      </p>
      {hero && note && (
        <p className="mt-0.5 font-garamond text-sm text-muted-foreground italic">
          {note}
        </p>
      )}
    </div>
  );
}
