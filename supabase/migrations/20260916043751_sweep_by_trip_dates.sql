-- A card belongs to the trip, not to a leg.
--
-- The sweep still enforced the rule from before trips existed: a card had to
-- sit on a day some leg covered, because the board's columns *were* the legs'
-- days and there was nowhere else for it to be. Now that the trip owns the
-- dates, a day inside it with no leg yet is an ordinary column -- and the
-- previous rule meant you could drop a card on one, watch it land, and have it
-- silently yanked back to the pile the next time anyone edited a leg.
--
-- Which is the worse failure of the two: not "you cannot plan that day" but
-- "you can, and it will quietly undo itself later".
--
-- The rule now is the honest one: a card goes back to the pile when it falls
-- outside the trip's own dates. Shortening the trip is the only thing that can
-- orphan anything, so that is where this now matters; the leg operations keep
-- calling it because a leg edit is exactly when someone is rearranging dates,
-- and it costs a single indexed scan to be sure.

create or replace function sweep_orphaned_trip_items(p_trip uuid)
returns integer
language sql
set search_path = public
as $$
  with swept as (
    update trip_items i
       set on_date = null, updated_at = now()
      from trips t
     where t.id = p_trip
       and i.trip_id = p_trip
       and i.on_date is not null
       and (i.on_date < t.starts_on or i.on_date > t.ends_on)
    returning 1
  )
  select count(*)::int from swept;
$$;

revoke execute on function sweep_orphaned_trip_items(uuid)
  from public, anon, authenticated;
grant execute on function sweep_orphaned_trip_items(uuid) to service_role;
