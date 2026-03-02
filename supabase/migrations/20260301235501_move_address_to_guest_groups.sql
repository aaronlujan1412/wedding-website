ALTER TABLE guests
DROP COLUMN address;

ALTER TABLE guest_groups
ADD COLUMN address_street text,
ADD COLUMN address_city text,
ADD COLUMN address_state text,
ADD COLUMN address_zip text;