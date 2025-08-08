const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:123mert123@localhost:5000/deneme'
});

async function checkNewTreatments() {
    try {
        // Yeni treatment'lar için feedback planning kontrol et
        const result = await pool.query(`
            SELECT 
                fp.*, 
                t.patient_id, 
                p.first_name || ' ' || p.last_name as patient_name,
                t.completed_at as treatment_completed_at
            FROM feedback_planning fp 
            JOIN treatments t ON fp.treatment_id = t.treatment_id 
            JOIN patients p ON t.patient_id = p.patient_id 
            WHERE fp.treatment_id IN (34, 35) 
            ORDER BY fp.planned_date
        `);
        
        console.log(`Found ${result.rows.length} feedback planning entries for treatments 34, 35:`);
        result.rows.forEach(row => {
            console.log(`- Treatment ${row.treatment_id}, Patient: ${row.patient_name}, Interval: ${row.interval}, Planned: ${row.planned_date.toLocaleDateString()}, Treatment completed: ${row.treatment_completed_at?.toLocaleDateString()}`);
        });
        
        // Ayrıca tüm bugün tamamlanan treatment'ları göster
        const todayTreatments = await pool.query(`
            SELECT 
                t.treatment_id,
                t.patient_id,
                p.first_name || ' ' || p.last_name as patient_name,
                t.status,
                t.completed_at
            FROM treatments t
            JOIN patients p ON t.patient_id = p.patient_id
            WHERE DATE(t.completed_at) = CURRENT_DATE
            ORDER BY t.completed_at DESC
        `);
        
        console.log(`\nTreatments completed today (${todayTreatments.rows.length}):`);
        todayTreatments.rows.forEach(row => {
            console.log(`- Treatment ${row.treatment_id}, Patient: ${row.patient_name}, Status: ${row.status}, Completed: ${row.completed_at?.toLocaleString()}`);
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkNewTreatments();
