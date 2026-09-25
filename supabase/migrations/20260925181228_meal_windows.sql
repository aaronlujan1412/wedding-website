-- Meals become a thing the stay either includes or doesn't, with a window
-- rather than a single instant.
--
-- `breakfast_time`/`dinner_time` could only say "served at 07:00", so a stay
-- that includes breakfast at a time nobody has looked up was indistinguishable
-- from one that serves none at all — and the half that actually bites is the
-- end ("breakfast until 09:30"), which there was nowhere to put. The boolean
-- carries "it's included"; the times are what you fill in once you know them.

alter table trip_stays
  add column has_breakfast boolean not null default false,
  add column breakfast_from time,
  add column breakfast_to time,
  -- What it is: a Japanese set in the dining room, a buffet, a tray in the room.
  add column breakfast_note text,
  add column has_dinner boolean not null default false,
  add column dinner_from time,
  add column dinner_to time,
  add column dinner_note text;

-- A time that was set meant the meal was included, and it was the time it
-- started.
update trip_stays
   set has_breakfast = true,
       breakfast_from = breakfast_time
 where breakfast_time is not null;

update trip_stays
   set has_dinner = true,
       dinner_from = dinner_time
 where dinner_time is not null;

-- The finder publishes whether a plan includes meals as two booleans, which is
-- now exactly the shape the stay stores — so it sets the fields instead of
-- writing the same fact into the notes as prose.
create or replace function send_trip_stay_proposal(
  p_stay uuid,
  p_lane trip_lane,
  p_planner trip_planner
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  src trip_stay_proposals;
  trip uuid;
  new_id uuid;
begin
  if p_lane = 'decided' then
    raise exception 'A proposal goes to a planner''s lane, not straight to Decided.';
  end if;

  select * into src from trip_stay_proposals where id = p_stay;
  if not found then
    raise exception 'That proposal no longer exists. The finder may have published a new set.';
  end if;

  select r.trip_id into trip
    from trip_route_proposals r
   where r.id = src.route_id;

  insert into trip_stays (
    trip_id, lane, added_by, name, name_ja, city,
    check_in_on, check_out_on, booking_status, url,
    cost_amount, cost_currency, has_breakfast, has_dinner, notes
  ) values (
    trip, p_lane, p_planner, src.name, src.name_ja, src.place_name,
    src.check_in_on, src.check_out_on, 'idea', src.url,
    src.cost_yen, 'JPY', src.breakfast, src.dinner,
    -- The estimate travels with the stay, so nobody later reads a summed-nights
    -- number as a quote somebody was given.
    'From the lodging finder. Price is each night''s cheapest plan added up, not a quote.'
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke execute on function send_trip_stay_proposal(uuid, trip_lane, trip_planner) from public, anon, authenticated;
grant execute on function send_trip_stay_proposal(uuid, trip_lane, trip_planner) to service_role;
