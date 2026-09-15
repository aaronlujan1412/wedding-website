-- Lodging moved to trip_stays in the previous migration, which copied every
-- leg's lodging across. Ship this one only after the code that stopped writing
-- these columns has deployed — before that, saving a leg would fail.

alter table trip_legs
  drop column lodging_name,
  drop column lodging_address,
  drop column lodging_url,
  drop column lodging_confirmation,
  drop column lodging_check_in,
  drop column lodging_check_out;
