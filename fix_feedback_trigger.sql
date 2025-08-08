-- Trigger'ı düzenle ve feedback planning oluştur

-- Önce mevcut trigger'ı kaldır
DROP TRIGGER IF EXISTS trigger_create_feedback_planning ON treatments;

-- Fonksiyonu yeniden oluştur
CREATE OR REPLACE FUNCTION create_feedback_planning()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert durumunda: eğer treatment 'tamamlanan' statusuyla oluşturuluyorsa
    -- Update durumunda: status 'tamamlanan' olarak değiştiğinde
    IF (TG_OP = 'INSERT' AND NEW.status = 'tamamlanan' AND NEW.completed_at IS NOT NULL) OR
       (TG_OP = 'UPDATE' AND NEW.status = 'tamamlanan' AND NEW.completed_at IS NOT NULL AND 
        (OLD.status IS NULL OR OLD.status != 'tamamlanan')) THEN
        
        -- Bu treatment için zaten planning var mı kontrol et
        IF NOT EXISTS (SELECT 1 FROM feedback_planning WHERE treatment_id = NEW.treatment_id) THEN
            -- Treatment type'ın feedback intervals'ını al ve her biri için planning oluştur
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

-- Insert ve Update için trigger oluştur
CREATE TRIGGER trigger_create_feedback_planning
    AFTER INSERT OR UPDATE ON treatments
    FOR EACH ROW
    EXECUTE FUNCTION create_feedback_planning();

-- Mevcut tüm tamamlanmış tedaviler için manuel olarak feedback planning oluştur
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
