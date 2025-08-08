-- Update treatments table status constraint to support Turkish status values
ALTER TABLE treatments DROP CONSTRAINT IF EXISTS treatments_status_check;
ALTER TABLE treatments ADD CONSTRAINT treatments_status_check 
CHECK (status IN ('önerilen', 'onaylanan', 'tamamlanan', 'suggested', 'approved', 'completed'));

-- Update existing data to use Turkish status values
UPDATE treatments SET status = 'önerilen' WHERE status = 'suggested';
UPDATE treatments SET status = 'onaylanan' WHERE status = 'approved';  
UPDATE treatments SET status = 'tamamlanan' WHERE status = 'completed';
