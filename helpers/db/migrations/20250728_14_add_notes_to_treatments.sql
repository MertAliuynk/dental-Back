-- Add notes column to treatments table
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add index for better performance on notes queries
CREATE INDEX IF NOT EXISTS idx_treatments_notes ON treatments USING gin(to_tsvector('turkish', notes))
WHERE notes IS NOT NULL;
