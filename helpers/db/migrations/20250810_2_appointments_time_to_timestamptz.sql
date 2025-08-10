ALTER TABLE appointments ALTER COLUMN appointment_time TYPE TIMESTAMPTZ USING appointment_time AT TIME ZONE 'UTC';
