const { executeQuery } = require('./helpers/db/utils/queryExecutor');

async function updateTrigger() {
  try {
    const query = `
CREATE OR REPLACE FUNCTION create_feedback_planning()
RETURNS TRIGGER AS $$
BEGIN
    -- Sadece status 'tamamlanan' olarak değiştiğinde çalıştır
    IF NEW.status = 'tamamlanan' AND (OLD.status IS NULL OR OLD.status != 'tamamlanan') AND NEW.completed_at IS NOT NULL THEN
        -- Bu hasta için daha önce feedback alınmış interval'ları bul
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
          AND array_length(tt.feedback_intervals, 1) > 0
          -- Bu hasta için bu interval'de daha önce feedback alınmamış olsun
          AND NOT EXISTS (
              SELECT 1 
              FROM feedbacks f
              JOIN treatments t ON f.treatment_id = t.treatment_id
              WHERE t.patient_id = NEW.patient_id 
                AND f.interval = interval_val
          );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
    `;
    
    await executeQuery(query);
    console.log('✅ Trigger başarıyla güncellendi');
    console.log('📝 Artık aynı hasta için aynı interval\'den tekrar planning oluşturmayacak');
    process.exit(0);
  } catch (err) {
    console.error('❌ Hata:', err);
    process.exit(1);
  }
}

updateTrigger();
