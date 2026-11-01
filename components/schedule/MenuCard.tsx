import { CROCK_POT_ROUTINE, crockPotCount, type Prep, type Station } from "./menu";
import { joinNames } from "./timeline";

function prepLabel(prep: Prep) {
  switch (prep.kind) {
    case "crock-pot":
      return `Crock pot, ${prep.tool}`;
    case "oven":
      return "Oven";
    case "prepped-ahead":
      return `Prepped ${prep.when}`;
    case "set-out":
      return "Just set out";
  }
}

/**
 * The buffet as a recipe card: one station per block, the crock pot routine
 * said once at the top, and each dish down to what's different about it.
 */
export function MenuCard({ stations }: { stations: Station[] }) {
  const dishes = stations.flatMap((s) => s.dishes);
  const ovenDishes = dishes
    .filter((d) => d.prep?.kind === "oven")
    .map((d) => d.name.toLowerCase());

  return (
    <div className="mt-5 rounded-lg border border-border bg-card p-5 break-inside-avoid md:p-7">
      <h4 className="font-garamond text-2xl text-foreground">The buffet</h4>
      <p className="mt-1 font-garamond text-lg text-foreground/90">
        {crockPotCount(stations)} crock pots
        {ovenDishes.length > 0 && <>, and the oven for the {joinNames(ovenDishes)}</>}
        .
      </p>
      <p className="mt-2 font-garamond text-base leading-relaxed text-muted-foreground">
        {CROCK_POT_ROUTINE}
      </p>

      <div className="mt-6 grid gap-x-10 gap-y-7 sm:grid-cols-2">
        {stations.map((station) => (
          <section key={station.name}>
            <h5 className="border-b border-border pb-1 font-garamond text-xl text-foreground">
              {station.name}
            </h5>
            <ul className="mt-2 space-y-2.5">
              {station.dishes.map((dish) => (
                <li key={dish.name}>
                  <p className="flex flex-wrap items-baseline justify-between gap-x-3 font-garamond text-lg text-foreground/90">
                    {dish.name}
                    {dish.prep && (
                      <span className="font-raleway text-xs text-pop2">
                        {prepLabel(dish.prep)}
                      </span>
                    )}
                  </p>
                  {dish.prep && "note" in dish.prep && dish.prep.note && (
                    <p className="font-garamond text-base italic leading-snug text-muted-foreground">
                      {dish.prep.note}
                    </p>
                  )}
                  {dish.toppings && (
                    <p className="font-garamond text-base leading-snug text-muted-foreground">
                      With {joinNames(dish.toppings)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            {station.toppings && (
              <p className="mt-2 font-garamond text-base leading-snug text-muted-foreground">
                Toppings: {joinNames(station.toppings)}
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
