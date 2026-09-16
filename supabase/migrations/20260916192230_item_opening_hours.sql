-- When a place is open, beside the days it's shut. One window for every open
-- day: "the outer market closes at 2pm" is the case that bites, and hours per
-- weekday would be more form than a trip needs. Either end can be unknown.
-- A close at or before the open runs past midnight (a bar open 18:00-02:00).
alter table public.trip_items
  add column opens_at time,
  add column closes_at time;
