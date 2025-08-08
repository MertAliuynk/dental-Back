-- Update appointments status constraint to include 'completed'
-- First drop the old constraint
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;

-- Add the new constraint with the correct status values
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('scheduled', 'attended', 'missed', 'completed'));
