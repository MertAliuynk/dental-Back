-- Update patients tc_number field length from VARCHAR(11) to VARCHAR(15)
ALTER TABLE patients ALTER COLUMN tc_number TYPE VARCHAR(15);
