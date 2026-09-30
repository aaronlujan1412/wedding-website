-- One search box, both sources.
--
-- This is the requirement the whole food database exists for: type 'chicken
-- thigh' and get USDA's generic entries AND the branded things typed in by
-- hand, ranked together. Two lists side by side would make the reader decide
-- which database to consult before they can ask a question.
--
-- WHY A POSTGRES FUNCTION rather than a PostgREST query. The ranking mixes
-- full-text rank, trigram similarity, a prefix bonus and a length penalty, and
-- PostgREST cannot express an ORDER BY over computed expressions like that. It
-- is also the difference between one round trip and four.
--
-- WHY word_similarity AND NOT similarity. `similarity()` normalises over the
-- WHOLE target string, so a short query against a long FDC description scores
-- far lower than it should: 'yoghurt' against 'Yogurt, Greek, plain, nonfat'
-- measures 0.172 and found nothing at any threshold loose enough to be useful.
-- `word_similarity()` scores the best matching extent instead, which is the
-- actual question -- does this word appear in that name. Measured on the same
-- pairs: real matches land 0.50-1.00 and noise at or under 0.20, so 0.35 sits
-- in open space rather than on a cliff.
--
-- WHY IT SCANS. ~8,000 rows of generic foods is small enough that the trigram
-- and ILIKE arms do not need an index to be instant, and requiring the `<%`
-- operator to hit the GIN would mean tuning thresholds against pg_trgm's own
-- limit setting. If this table ever carried Branded's two million rows the
-- calculation changes, and the migration that adds them should revisit this.

create or replace function search_meal_foods(p_query text, p_limit integer default 40)
returns table (
  id uuid,
  source text,
  dataset text,
  description text,
  category text,
  kcal numeric,
  protein_g numeric,
  fat_g numeric,
  saturated_fat_g numeric,
  carbs_g numeric,
  fiber_g numeric,
  sugar_g numeric,
  sodium_mg numeric,
  kcal_is_derived boolean,
  -- The most ordinary portion, so a result reads '1 cup = 135 g' without a
  -- second query per row. Per 100 g is correct and nobody eats it.
  portion_label text,
  portion_grams numeric,
  portion_count bigint
)
language sql
stable
set search_path = public, extensions
as $$
  with q as (
    select
      btrim(coalesce(p_query, '')) as text,
      -- websearch_to_tsquery, not plainto_: it never raises on punctuation, so
      -- a name with a stray quote or slash is a search rather than an error.
      -- That class of bug killed the first import nine items in.
      websearch_to_tsquery('english', btrim(coalesce(p_query, ''))) as tsq
  )
  select
    f.id, f.source, f.dataset, f.description, f.category,
    f.kcal, f.protein_g, f.fat_g, f.saturated_fat_g,
    f.carbs_g, f.fiber_g, f.sugar_g, f.sodium_mg, f.kcal_is_derived,
    p.label, p.grams,
    (select count(*) from meal_food_portions mp where mp.food_id = f.id)
  from meal_foods f
  cross join q
  left join lateral (
    select label, grams
    from meal_food_portions
    where food_id = f.id
    order by sort_order, grams
    limit 1
  ) p on true
  where
    q.text = ''
    or (q.tsq is not null and f.search @@ q.tsq)
    or f.description ilike '%' || q.text || '%'
    or word_similarity(q.text, f.description) > 0.35
  order by
    case when q.text = '' then 0 else
      -- Full text carries the most weight: it stems, so 'thighs' finds 'thigh'.
      coalesce(ts_rank(f.search, q.tsq), 0) * 4
      -- Trigram covers what full text is bad at: a misspelling, a remembered
      -- fragment, 'yoghurt' at an American database.
      + word_similarity(q.text, f.description) * 2
      -- FDC leads a description with the food's identity, so a description
      -- STARTING with what was typed is almost always the thing meant.
      + case when f.description ilike q.text || '%' then 1.5 else 0 end
      -- A food somebody bothered to type in by hand is a food they use.
      + case when f.source = 'custom' then 1.0 else 0 end
      -- FDC qualifies endlessly -- 'Chicken, broiler, thigh, meat and skin,
      -- cooked, stewed' -- and the plainest entry is nearly always the one
      -- wanted. A gentle penalty on length, capped so a long name cannot be
      -- buried outright.
      - least(length(f.description), 120) / 400.0
    end desc,
    -- Blank query, or a tie: hand-typed foods first, then alphabetically.
    case when f.source = 'custom' then 0 else 1 end,
    f.description
  limit greatest(1, least(coalesce(p_limit, 40), 200));
$$;

-- Supabase grants EXECUTE on new public functions to anon and authenticated by
-- default. Both tables are RLS-with-no-policies, so a leak here would be the
-- only way in.
revoke execute on function search_meal_foods(text, integer) from public, anon, authenticated;
grant execute on function search_meal_foods(text, integer) to service_role;
