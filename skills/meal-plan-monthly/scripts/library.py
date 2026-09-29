#!/usr/bin/env python3
"""Read the meal library from the site.

The library used to live in two markdown files next to this skill, and the
month's data was hand-written as a 1,615-line Python file. Both are now rows in
a database the site owns, which is why this exists: one fetch replaces both
reference files, and it is current rather than as-of-whenever-it-was-edited.

Read-only by design. Choosing a menu is the skill's job; writing prices,
recipes and plans happens on the site, where a person sees what changed.

Environment:
    MEALS_API_URL      https://<site>/api/meals
    MEALS_API_SECRET   bearer token, read-only and meals-only

Usage:
    python3 library.py                  everything, as JSON
    python3 library.py --summary        what is in the library, as prose
    python3 library.py --menu           dishes with their windows and costs
    python3 library.py --gaps           dishes that cannot be shopped for
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

URL = os.environ.get("MEALS_API_URL", "")
SECRET = os.environ.get("MEALS_API_SECRET", "")

# Cloudflare fronts the site and blocks urllib's default agent outright: 403
# with error 1010, which reads exactly like an auth failure and is not one.
USER_AGENT = "meal-plan-skill/1.0"


def fetch(part: str | None = None) -> dict:
    if not URL or not SECRET:
        sys.exit("MEALS_API_URL and MEALS_API_SECRET must both be set.")

    url = f"{URL}?part={part}" if part else URL
    request = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {SECRET}", "User-Agent": USER_AGENT},
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.loads(response.read())
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", "replace")[:300]
        sys.exit(f"could not read the library: HTTP {exc.code} {body}")
    except urllib.error.URLError as exc:
        sys.exit(f"could not read the library: {exc.reason}")


def money(cents: int | None) -> str:
    return "—" if cents is None else f"${cents / 100:,.2f}"


def summary(data: dict) -> None:
    s = data.get("settings", {})
    print(f"Budget {money(s.get('budget_cents'))} a month, "
          f"{s.get('orders_per_month')} deliveries.")
    print(f"Aaron ~{s.get('aaron_kcal')} cal/day, Savea ~{s.get('savea_kcal')} cal/day. "
          f"Kid cycle {s.get('kid_cycle_days')} days.")
    if s.get("notes"):
        print(f"  {s['notes']}")

    print(f"\n{len(data.get('items', []))} priced items, "
          f"{len(data.get('recipes', []))} dishes.")

    print("\nRules:")
    for rule in data.get("rules", []):
        term = f"  [never: {rule['forbidden_term']}]" if rule.get("forbidden_term") else ""
        print(f"  - {rule['label']}: {rule['detail']}{term}")


def menu(data: dict) -> None:
    """Dishes by how long after a delivery they can still be cooked.

    Printed in window order because that is the order they get PLACED in: the
    things that will not wait go first, and what is left fills the tail. A list
    sorted by name would have to be re-sorted in the head every time.
    """
    items = {i["id"]: i for i in data.get("items", [])}
    order = {"day0-2": 0, "early": 1, "mid": 2, "any": 3}
    dishes = [r for r in data.get("recipes", []) if r["kind"] == "dinner"]
    dishes.sort(key=lambda r: (order.get(r["window_when"], 9), r["name"]))

    for r in dishes:
        packs = sum(
            items[i["item_id"]]["price_cents"] or 0
            for i in r["ingredients"]
            if i["item_id"] in items
        )
        print(f"\n{r['name']}")
        print(f"  {r['window_when']} · serves {r['serves']} · {r['kcal']} kcal · "
              f"{r['protein_g']}g protein")
        if r["ingredients"]:
            print(f"  a pack of each: {money(packs)}")
            print("  " + ", ".join(i["name"] for i in r["ingredients"] if i["name"]))
        else:
            print("  NO INGREDIENTS — cannot be shopped for")
        if r.get("notes"):
            print(f"  {r['notes']}")


def gaps(data: dict) -> None:
    """Dishes that would be scheduled and leave you with nothing to cook.

    The failure this catches is silent: a dish with no ingredients is perfectly
    schedulable and contributes nothing to the shopping list, so it only shows
    up on the night.
    """
    missing = [r for r in data.get("recipes", []) if not r["ingredients"]]
    if not missing:
        print("Every dish has ingredients recorded.")
        return

    print(f"{len(missing)} dishes cannot be shopped for:")
    for r in missing:
        print(f"  {r['kind']:<8} {r['name']}")
    print("\nAdd ingredients on the site before planning a month around these.")

    unpriced = [i for i in data.get("items", []) if i["price_cents"] is None]
    if unpriced:
        print(f"\n{len(unpriced)} items have no price:")
        for i in unpriced:
            print(f"  {i['name']}")


def main() -> int:
    args = set(sys.argv[1:])
    data = fetch()
    if not data.get("ok"):
        sys.exit(f"the library said: {data.get('error', 'no')}")

    if "--summary" in args:
        summary(data)
    elif "--menu" in args:
        menu(data)
    elif "--gaps" in args:
        gaps(data)
    else:
        json.dump(data, sys.stdout, indent=2)
        print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
