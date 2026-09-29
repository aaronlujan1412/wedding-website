---
name: meal-plan-monthly
description: Build Aaron and Savea's monthly grocery and meal plan - every dinner, lunch and snack for a date range against an $800 budget, ordered as two Instacart deliveries. The dishes, prices and ingredients live in a database at /me/meals; this skill reads them, chooses the menu, and produces the workbook. Use whenever the user asks for a meal plan, a monthly food plan, a grocery plan, a shopping list for the month, "the October plan", "next month's plan", or mentions meal planning, kid weeks, Instacart orders, the grab bench, or the $800 grocery budget - even if they don't say the word "skill". Also use it when revising, re-pricing or extending an existing plan.
---

# Monthly meal plan

**Read the library first. It is the source of truth and this file is not.**

```bash
python3 scripts/library.py --summary    # budget, targets, rules
python3 scripts/library.py --menu       # dishes by window, with pack costs
python3 scripts/library.py --gaps       # dishes that cannot be shopped for
python3 scripts/library.py              # the lot, as JSON
```

Needs `MEALS_API_URL` and `MEALS_API_SECRET`. Read-only: choosing the menu is
this skill's job, and changing prices, dishes or ingredients happens on the site
where a person can see what changed.

---

## What changed, and why it matters

This skill used to carry its own price book and recipe library as markdown, and
rebuild a ~1,600-line data file by hand every month. Two things went wrong every
time, both recorded in its own notes:

- **A first pass priced from memory came in 75% over an $800 budget.** Unit
  prices guessed 10-20% high, and roughly 20 lb of surplus protein.
- **Meals got planned around ingredients that could not survive to the day they
  were needed** — the single recurring failure, and the reason the old file had
  a whole section of manual coverage discipline.

Both are now arithmetic rather than judgement. The site holds the dishes, the
items, the prices and — the part that matters — **which items each dish needs**,
so a shopping list is computed from a menu rather than written alongside it.
`/me/meals` will schedule a month and cost it in two clicks.

**So the work here is the part that is actually judgement: which dishes, on
which nights, for these people, this month.** Do not rebuild what the database
does.

## 1. The household

- **Two adults.** Aaron ~1,800-2,000 cal/day. Savea ~1,200, and wants
  low-calorie, **no-prep, grab-and-go** snacks, sweet and savoury.
- **One child, Daniel, part-time**, every other week: **Wednesday dinner through
  Saturday morning**, about 8 days a month. Which weeks shifts — confirm it.
- **No allergies.**
- **Kitchen:** air fryer, oven, stove, sous vide, microwave, vacuum sealer,
  grill, pizza oven. Use them.

Budget, calorie targets and the kid cycle are in the library, not here. If this
section and `--summary` disagree, **the library is right.**

## 2. Rules

`--summary` prints them. They are rows, so they change without editing this
file, and a rule with a banned word is checked mechanically. Do not hardcode the
list: read it, apply it, and check the finished plan against it.

## 3. Intake — ask only these

Most of the plan is already decided. Use the tappable-options tool if available.

1. **Which month and exact date range?**
2. **Which weeks is Daniel here?** Offer the every-other-week continuation from
   last month and let the user correct it.
3. **Any guests, events or gatherings?** If yes: how many, which days, and
   **fancy** (surf and turf), **fun family** (sushi night), or a **cookout**?
   These differ by roughly $100 at 7 people, so present the tradeoff rather than
   choosing silently.
4. **Anything new** — a new dislike, a craving, a dish to add or retire?

Then **read the calendar back before building**: dates, day grid, kid weeks,
where a special meal lands, order dates, edge cases. Treat inferences as
assumptions the user can fix in one line.

## 4. Choosing the menu — the actual work

Every dish carries a **window**: how far after a delivery it can still be
cooked. `day0-2` needs produce that will not wait; `any` is frozen or hardy.

The rule that makes a month work is not "pick dishes that fit" — it is **spend
the most perishable dish that fits, first.** Eligibility alone puts a frozen
stir-fry on day one and strands the eggplant dish on day twelve with nothing
able to replace it.

Then:

- No dinner more than twice, and **not twice within a week** — "no more than
  twice a month" permits consecutive nights, which is not what it means.
- Put a batch-friendly soup or stew early and **freeze half** for a zero-cook
  night later. Costs nothing.
- Check `--gaps` before you commit to a menu. **A dish with no ingredients can
  be scheduled and contributes nothing to the shopping list** — you reach that
  night with a plan and no food.
- **Mid-week starts:** if the range does not start on a Sunday or Monday there
  is no prep session before week one. Bridge those lunches with a rotisserie
  chicken on Order 1 and say why.

## 5. Build pipeline

**Step 1. Read the library.** `--summary`, `--menu`, `--gaps`.

**Step 2. Compute the calendar in Python.** Never infer day-of-week by hand.
```bash
python3 -c "
import datetime
d=datetime.date(YYYY,M,D)
while d<=datetime.date(YYYY,M,D):
    print(d.strftime('%a %m/%d'), end='  |  '); d+=datetime.timedelta(days=1)"
```
Confirm the kid Wednesdays land on Wednesdays. Locate prep Sundays and order
dates.

**Step 3. Choose the menu** per Section 4, and check it against the rules.

**Step 4. Let the site cost it.** Create the plan at `/me/meals`, set the
delivery dates, place the dinners, build the list. It deduplicates items across
dishes, splits them across the two orders, prices them, and flags anything that
will not keep from its delivery to the night it is needed.

If the total is over budget, the levers in order:
1. **Consolidate proteins across orders** — one bulk frozen bag beats two fresh
   packs, and it fixes coverage at the same time. Biggest single lever.
2. **Check protein against the portion calculus** in Section 6. Over-buying
   protein is the commonest cause of a blown budget.
3. **Move snack variety to optional.**
4. **Right-size pantry quantities** to the month.
5. **Swap fresh for frozen on late-window meals** — saves money and fixes
   coverage together.
6. Only then trim protein. **Never** cut the jerky, a requested special meal, or
   anything the user asked for as core.

**Step 5. Sanity-check the number.** Quantities default to one pack and are
flagged as guesses, because most dishes do not record amounts yet. **The total
is a floor, not a forecast.** Say so. Where a dish is clearly under-bought — one
pack of chicken thighs across five dinners — fix the quantity on the site rather
than adjusting the total in prose.

**Step 6. Build the workbook** if the user wants the spreadsheet:
```bash
python3 scripts/build_workbook.py plan_data.py "<output>.xlsx"
python3 scripts/audit_workbook.py <file> plan_data.py
```
Read `/mnt/skills/public/xlsx/SKILL.md` first. A clean recalc proves formulas
evaluate, not that they are right — also load with `data_only=True` and
cross-check the totals.

The audit reports keyword hits for "orzo" and "olive" that are **the rule
statements themselves**. Expected. Confirm each in context rather than
dismissing them unread.

## 6. Portion calculus

- **Weeknight dinner: 4 servings.** **Kid night: 5.** **Guests: headcount + 1.**
- **Protein: 1.25-1.5 lb raw per 4-serving dinner.** Aaron ~6 oz, Savea ~4 oz.
- A month of 24 dinners plus 5 lunch preps is roughly **40-45 lb of protein.**
  Pushing 60 lb means over-bought — that was a real $150 error.
- Savea's bench runs ~4-5 units/day, so a 32-day month needs ~130-150 units.

Pack sizes are in the library with each item, so quantities match what ships.

## 7. Food safety — apply, don't re-derive

**Dried beans:**
- **Fridge-soak, never counter-soak.** A fridge soak stretches 2-3 days; room
  temperature is safe about 24 hours. Foamy, sour or slimy means toss it.
  **Always drain the soak water.**
- **Kidney-family beans (cannellini, white, red kidney) need a 10-minute hard
  rolling boil** before slow cooking. Phytohaemagglutinin is not destroyed by a
  slow cooker and is **worsened** at sub-boiling temperatures. **Chickpeas and
  black beans cook straight in.** A pressure cooker skips the pre-boil.
- **Yields:** 1 lb dried = 5-6 cups cooked = 3-4 cans. Freeze in 1.5-cup
  "one can" portions.

## 8. Keeping the library honest

The library is only as good as what is in it, and the two ways it rots are both
visible from here:

- **`--gaps` after every plan.** A dish used this month with no ingredients is
  the one to fix first — it is already being cooked.
- **Prices drift.** If several look wrong against a real order, say so; they are
  editable in the row on `/me/meals/prices`, and every change is kept as history.

When a plan reveals a quantity — a pack of thighs really did cover three dinners
— that belongs on the site, not in a note here. It is what turns the budget from
a floor into a forecast.
