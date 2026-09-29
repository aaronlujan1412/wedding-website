# meal-plan-monthly

Lives in this repo because it reads this repo's database. The two move together:
a column added to `meal_recipes` is a field the skill can use the same day, and
the API it calls is `app/api/meals/route.ts` a few directories over.

## Installing it

Skills are read from `~/.claude/skills`, so link rather than copy — a copy goes
stale the first time either side changes:

```bash
ln -s "$PWD/skills/meal-plan-monthly" ~/.claude/skills/meal-plan-monthly
```

There is an older copy under `~/.claude/skills/synced/`, which is where this one
came from. Remove it once this is linked, or Claude has two skills with the same
name and picks by luck.

## Configuring it

```bash
MEALS_API_URL=https://<site>/api/meals
MEALS_API_SECRET=<the value from MEALS_API_SECRET on the host>
```

The token is read-only and reaches nothing but the meal library. Writing prices,
dishes and plans happens on `/me/meals`, where a person can see what changed —
a skill that could rewrite the price book would eventually rewrite it wrongly.

## What replaced what

| was | is |
|---|---|
| `references/price_book.md` | `meal_items`, edited at `/me/meals/prices` |
| `references/recipe_library.md` | `meal_recipes`, edited at `/me/meals/recipes` |
| nothing — the gap | `meal_recipe_items`, which makes a shopping list computable |
| `assets/plan_data_example_sept2026.py` | `meal_plans` and the generator |

The old markdown files were the seed for all of this (`scripts/seed-meal-library.mjs`)
and are worth keeping as history, but they are no longer read by anything.
