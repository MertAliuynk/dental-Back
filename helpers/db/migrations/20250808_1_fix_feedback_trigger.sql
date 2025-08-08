-- Fix feedback trigger and backfill planning for completed treatments

-- Drop existing trigger if present
DROP TRIGGER IF EXISTS trigger_create_feedback_planning ON treatments;

-- Recreate/replace the trigger function to handle INSERT and UPDATE cases
CREATE OR REPLACE FUNCTION create_feedback_planning()
RETURNS TRIGGER AS $$
BEGIN
    -- On INSERT: if treatment is created as 'tamamlanan' with completed_at set
    -- On UPDATE: when status becomes 'tamamlanan' with completed_at set
    IF (TG_OP = 'INSERT' AND NEW.status = 'tamamlanan' AND NEW.completed_at IS NOT NULL) OR
       (TG_OP = 'UPDATE' AND NEW.status = 'tamamlanan' AND NEW.completed_at IS NOT NULL AND 
        (OLD.status IS NULL OR OLD.status != 'tamamlanan')) THEN
        
        -- Ensure we don't duplicate planning for the same treatment
        IF NOT EXISTS (SELECT 1 FROM feedback_planning WHERE treatment_id = NEW.treatment_id) THEN
            -- Use treatment type's feedback_intervals to plan follow-ups
            INSERT INTO feedback_planning (treatment_id, interval, planned_date)
            SELECT 
                NEW.treatment_id,
                interval_val,
                CASE 
                    WHEN interval_val = '1_week' THEN NEW.completed_at + INTERVAL '1 week'
                    WHEN interval_val = '1_month' THEN NEW.completed_at + INTERVAL '1 month'
                    WHEN interval_val = '3_months' THEN NEW.completed_at + INTERVAL '3 months'
                    WHEN interval_val = '6_months' THEN NEW.completed_at + INTERVAL '6 months'
                END
            FROM treatment_types tt
            CROSS JOIN UNNEST(tt.feedback_intervals) as interval_val
            WHERE tt.treatment_type_id = NEW.treatment_type_id
              AND tt.feedback_intervals IS NOT NULL 
              AND array_length(tt.feedback_intervals, 1) > 0;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger for both INSERT and UPDATE events
CREATE TRIGGER trigger_create_feedback_planning
    AFTER INSERT OR UPDATE ON treatments
    FOR EACH ROW
    EXECUTE FUNCTION create_feedback_planning();

-- Backfill planning for existing completed treatments missing entries
INSERT INTO feedback_planning (treatment_id, interval, planned_date)
SELECT 
    t.treatment_id,
    interval_val,
    CASE 
        WHEN interval_val = '1_week' THEN t.completed_at + INTERVAL '1 week'
        WHEN interval_val = '1_month' THEN t.completed_at + INTERVAL '1 month'
        WHEN interval_val = '3_months' THEN t.completed_at + INTERVAL '3 months'
        WHEN interval_val = '6_months' THEN t.completed_at + INTERVAL '6 months'
    END as planned_date
FROM treatments t
JOIN treatment_types tt ON t.treatment_type_id = tt.treatment_type_id
CROSS JOIN UNNEST(tt.feedback_intervals) as interval_val
WHERE t.status = 'tamamlanan' 
  AND t.completed_at IS NOT NULL
  AND tt.feedback_intervals IS NOT NULL 
  AND array_length(tt.feedback_intervals, 1) > 0
  AND NOT EXISTS (
      SELECT 1 FROM feedback_planning fp 
      WHERE fp.treatment_id = t.treatment_id 
        AND fp.interval = interval_val
  );
