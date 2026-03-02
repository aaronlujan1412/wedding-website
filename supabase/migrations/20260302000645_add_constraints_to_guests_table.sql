ALTER TABLE guests
ADD CONSTRAINT valid_plus_one
    CHECK (plus_one_name IS NULL OR plus_one_allowed = true),
ADD CONSTRAINT has_dietary
    CHECK (dietary_details IS NULL OR dietary_type IS NOT NULL);