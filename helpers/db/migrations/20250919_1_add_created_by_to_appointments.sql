-- Migration: Add created_by column to appointments table
-- Date: 2025-09-19

ALTER TABLE appointments
ADD COLUMN created_by INTEGER REFERENCES users(user_id);

-- Optionally, you can add an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointments_created_by ON appointments (created_by);