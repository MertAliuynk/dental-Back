const { executeQuery } = require('./helpers/db/utils/queryExecutor');

async function cleanPatientBasedDuplicates() {
  try {
    console.log('🔍 Hasta bazlı duplicate planning kayıtları kontrol ediliyor...');
    
    // Önce mevcut durumu gösterelim
    const currentQuery = `
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
      HAVING COUNT(*) > 1
      ORDER BY patient_name, fp.interval;
    `;
    
    const duplicates = await executeQuery(currentQuery);
    console.log('📊 Duplicate olan kayıtlar:');
    duplicates.forEach(d => {
      console.log(`${d.patient_name}: ${d.interval} -> ${d.planning_count} adet (${d.planning_count - 1} adet silinecek)`);
    });
    
    // Hasta bazında duplicate kayıtları temizle - en eski olanı bırak
    const cleanupQuery = `
      WITH duplicate_planning AS (
        SELECT 
          fp.id,
          t.patient_id,
          fp.interval,
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
    
    await executeQuery(cleanupQuery);
    console.log('✅ Hasta bazlı duplicate planning kayıtları temizlendi');
    
    // Temizlik sonrası durumu göster
    const afterQuery = `
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
    
    const afterCleanup = await executeQuery(afterQuery);
    console.log('\\n📊 Temizlik sonrası planning kayıtları:');
    afterCleanup.forEach(p => {
      console.log(`${p.patient_name}: ${p.interval} -> ${p.planning_count} adet ✅`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Hata:', err);
    process.exit(1);
  }
}

cleanPatientBasedDuplicates();
