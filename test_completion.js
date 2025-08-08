const { Pool } = require('pg');

// Database connection
const pool = new Pool({
    connectionString: 'postgresql://postgres:123mert123@localhost:5000/deneme'
});

async function testTreatmentCompletion() {
    try {
        console.log('Testing treatment completion and feedback planning...');
        
        // Önce onaylanmış bir tedavi oluşturalım
        const newTreatment = await pool.query(`
            INSERT INTO treatments (
                patient_id, 
                treatment_type_id, 
                doctor_id, 
                status, 
                suggested_at, 
                approved_at,
                tooth_count
            ) VALUES (1, 1, 1, 'onaylanan', NOW() - INTERVAL '1 week', NOW() - INTERVAL '3 days', 1)
            RETURNING treatment_id
        `);
        
        const treatmentId = newTreatment.rows[0].treatment_id;
        console.log(`Created new approved treatment: ${treatmentId}`);
        
        // Şimdi bu tedaviyi tamamlayalım
        await pool.query(`
            UPDATE treatments 
            SET status = 'tamamlanan', completed_at = CURRENT_TIMESTAMP
            WHERE treatment_id = $1
        `, [treatmentId]);
        
        console.log(`Completed treatment: ${treatmentId}`);
        
        // Trigger'ın çalışıp çalışmadığını kontrol edelim
        setTimeout(async () => {
            const feedbackPlanning = await pool.query(
                'SELECT * FROM feedback_planning WHERE treatment_id = $1 ORDER BY planned_date',
                [treatmentId]
            );
            
            console.log(`Found ${feedbackPlanning.rows.length} feedback planning entries for treatment ${treatmentId}:`);
            
            feedbackPlanning.rows.forEach(fp => {
                console.log(`- Interval: ${fp.interval}, Planned: ${fp.planned_date.toLocaleDateString()}, Completed: ${fp.is_completed}`);
            });
            
            await pool.end();
        }, 1000);
        
    } catch (error) {
        console.error('Test failed:', error.message);
        await pool.end();
    }
}

testTreatmentCompletion();
