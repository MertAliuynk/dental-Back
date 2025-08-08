const { executeQuery } = require('./helpers/db/utils/queryExecutor');

async function cleanDuplicatePlanning() {
  try {
    // Mevcut duplicate planning kayıtlarını temizle
    const cleanupQuery = `
      WITH duplicate_planning AS (
        SELECT 
          fp.id,
          ROW_NUMBER() OVER (
            PARTITION BY t.patient_id, fp.interval 
            ORDER BY fp.created_at ASC
          ) as rn
        FROM feedback_planning fp
        JOIN treatments t ON fp.treatment_id = t.treatment_id
        WHERE fp.is_completed = FALSE
      )
      DELETE FROM feedback_planning 
      WHERE id IN (
        SELECT id FROM duplicate_planning WHERE rn > 1
      );
    `;
    
    const result = await executeQuery(cleanupQuery);
    console.log('✅ Duplicate planning kayıtları temizlendi');
    console.log('📝 Artık her hasta için her interval\'den sadece 1 planning kaldı');
    
    // Kaç tane kayıt temizlendiğini göster
    const countQuery = `
      SELECT 
        t.patient_id,
        p.first_name || ' ' || p.last_name as patient_name,
        fp.interval,
        COUNT(*) as planning_count
      FROM feedback_planning fp
      JOIN treatments t ON fp.treatment_id = t.treatment_id
      JOIN patients p ON t.patient_id = p.patient_id
      WHERE fp.is_completed = FALSE
      GROUP BY t.patient_id, p.first_name, p.last_name, fp.interval
      ORDER BY patient_name, fp.interval;
    `;
    
    const plannings = await executeQuery(countQuery);
    console.log('\\n📊 Mevcut planning kayıtları:');
    plannings.forEach(p => {
      console.log(`${p.patient_name}: ${p.interval} -> ${p.planning_count} adet`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Hata:', err);
    process.exit(1);
  }
}

cleanDuplicatePlanning();
