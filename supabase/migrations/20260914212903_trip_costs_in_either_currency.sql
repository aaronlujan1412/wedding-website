-- Costs in whichever currency they were quoted in.
--
-- Everything used to be stored as yen, converted at a hard-coded 155. That
-- quietly rewrites history: a tour quoted at $60 and saved as ¥9,300 stops
-- being $60 the moment the rate moves. So a cost is now the amount exactly as
-- entered plus its currency, and conversion only happens when adding things up.
--
-- `cost_amount` is in the currency's smallest unit — whole yen, or US cents —
-- so it stays an integer and no float ever touches money.

create type trip_currency as enum ('JPY', 'USD');

alter table trip_items rename column cost_yen to cost_amount;
alter table trip_items
  add column cost_currency trip_currency not null default 'JPY';

alter table trip_docs rename column cost_yen to cost_amount;
alter table trip_docs
  add column cost_currency trip_currency not null default 'JPY';

comment on column trip_items.cost_amount is
  'Smallest unit of cost_currency: whole yen, or US cents.';
comment on column trip_docs.cost_amount is
  'Smallest unit of cost_currency: whole yen, or US cents.';

-- The live rate, cached so the board reads one row instead of calling the feed
-- on every 12-second poll. Refreshed lazily from the ECB reference rate (via
-- Frankfurter) when it's more than half a day old. `as_of` is the date the ECB
-- published it, which lags a day or so and skips weekends.
create table fx_rates (
  pair text primary key,
  rate double precision not null,
  as_of date not null,
  fetched_at timestamptz not null default now(),
  constraint fx_rates_rate_positive check (rate > 0)
);

alter table fx_rates enable row level security;
