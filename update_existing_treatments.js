const { Pool } = require('pg');

// Database connection
const pool = new Pool({
    connectionString: 'postgresql://postgres:123mert123@localhost:5000/deneme'
});

async function updateExistingTreatments() {
    try {
        console.log('Updating existing completed treatments to trigger feedback planning...');
        
        // Tamamlanmış tedavileri al
        const treatments = await pool.query(`
            SELECT t.treatment_id, t.status, t.completed_at
            FROM treatments t
            JOIN treatment_types tt ON t.treatment_type_id = tt.treatment_type_id
            WHERE t.status = 'tamamlanan' 
              AND t.completed_at IS NOT NULL
              AND tt.feedback_intervals IS NOT NULL
              AND array_length(tt.feedback_intervals, 1) > 0
        `);
        
        console.log(`Found ${treatments.rows.length} completed treatments`);
        
        // Her birini güncelle ki trigger çalışsın
        for (const treatment of treatments.rows) {
            await pool.query(
                'UPDATE treatments SET updated_at = CURRENT_TIMESTAMP WHERE treatment_id = $1',
                [treatment.treatment_id]
            );
            console.log(`Updated treatment ${treatment.treatment_id}`);
        }
        
        // Feedback planning kayıtlarını kontrol et
        const feedbackPlanning = await pool.query('SELECT * FROM feedback_planning ORDER BY planned_date');
        console.log(`Now found ${feedbackPlanning.rows.length} feedback planning entries:`);
        
        feedbackPlanning.rows.forEach(fp => {
            console.log(`- Treatment ${fp.treatment_id}, Interval: ${fp.interval}, Planned: ${fp.planned_date.toLocaleDateString()}, Completed: ${fp.is_completed}`);
        });
        
    } catch (error) {
        console.error('Failed to update treatments:', error.message);
    } finally {
        await pool.end();
    }
}

updateExistingTreatments();
