-- Tedavi tamamlandığında geri dönüş planlaması için trigger oluştur

-- İlk olarak feedback planning tablosu oluştur
CREATE TABLE IF NOT EXISTS feedback_planning (
    id SERIAL PRIMARY KEY,
    treatment_id INT REFERENCES treatments(treatment_id) ON DELETE CASCADE,
    interval VARCHAR(20) NOT NULL CHECK (interval IN ('1_week', '1_month', '3_months', '6_months')),
    planned_date TIMESTAMP NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_planning_treatment_id ON feedback_planning (treatment_id);
CREATE INDEX IF NOT EXISTS idx_feedback_planning_planned_date ON feedback_planning (planned_date);
CREATE INDEX IF NOT EXISTS idx_feedback_planning_is_completed ON feedback_planning (is_completed);

-- Tedavi tamamlandığında feedback planning oluşturacak fonksiyon
CREATE OR REPLACE FUNCTION create_feedback_planning()
RETURNS TRIGGER AS $$
BEGIN
    -- Sadece status 'tamamlanan' olarak değiştiğinde çalıştır
    IF NEW.status = 'tamamlanan' AND (OLD.status IS NULL OR OLD.status != 'tamamlanan') AND NEW.completed_at IS NOT NULL THEN
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
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı oluştur
DROP TRIGGER IF EXISTS trigger_create_feedback_planning ON treatments;
CREATE TRIGGER trigger_create_feedback_planning
    AFTER UPDATE ON treatments
    FOR EACH ROW
    EXECUTE FUNCTION create_feedback_planning();
