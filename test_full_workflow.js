const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:123mert123@localhost:5000/deneme'
});

async function testFullWorkflow() {
    try {
        console.log('Testing complete workflow: Create -> Approve -> Complete -> Check Feedback');
        
        // 1. Önce onaylanmış bir tedavi oluşturalım
        const newTreatment = await pool.query(`
            INSERT INTO treatments (
                patient_id, 
                treatment_type_id, 
                doctor_id, 
                status, 
                suggested_at, 
                approved_at,
                tooth_count
            ) VALUES (2, 1, 1, 'onaylanan', NOW() - INTERVAL '1 week', NOW() - INTERVAL '3 days', 1)
            RETURNING treatment_id
        `);
        
        const treatmentId = newTreatment.rows[0].treatment_id;
        console.log(`✓ 1. Created approved treatment: ${treatmentId}`);
        
        // 2. Bu tedaviyi tamamlayalım (hasta kartındaki gibi)
        await pool.query(`
            UPDATE treatments 
            SET status = 'tamamlanan', completed_at = CURRENT_TIMESTAMP
            WHERE treatment_id = $1
        `, [treatmentId]);
        
        console.log(`✓ 2. Completed treatment: ${treatmentId}`);
        
        // 3. Trigger'ın çalışıp feedback planning oluşturup oluşturmadığını kontrol edelim
        setTimeout(async () => {
            const feedbackPlanning = await pool.query(
                'SELECT * FROM feedback_planning WHERE treatment_id = $1 ORDER BY planned_date',
                [treatmentId]
            );
            
            console.log(`✓ 3. Found ${feedbackPlanning.rows.length} feedback planning entries:`);
            feedbackPlanning.rows.forEach(fp => {
                console.log(`   - ${fp.interval} (${fp.interval === '1_week' ? '1 Hafta' : fp.interval === '1_month' ? '1 Ay' : fp.interval === '3_months' ? '3 Ay' : '6 Ay'}): ${fp.planned_date.toLocaleDateString()}`);
            });
            
            // 4. API'den hasta listesini alalım
            const fetch = (await import('node-fetch')).default;
            const response = await fetch('http://localhost:8000/api/feedback/pending');
            const data = await response.json();
            
            // Bu hasta listede var mı kontrol edelim
            const patientInList = data.data.find(p => 
                p.feedback_items.some(item => item.treatment_id == treatmentId)
            );
            
            if (patientInList) {
                console.log(`✓ 4. Patient "${patientInList.patient_name}" found in pending feedbacks list!`);
                console.log(`   Total feedback items for this patient: ${patientInList.feedback_items.length}`);
                const relevantItems = patientInList.feedback_items.filter(item => item.treatment_id == treatmentId);
                console.log(`   Items for this treatment: ${relevantItems.length}`);
                relevantItems.forEach(item => {
                    console.log(`     - ${item.interval_display}: ${new Date(item.planned_date).toLocaleDateString()}`);
                });
            } else {
                console.log(`✗ 4. Patient NOT found in pending feedbacks list`);
            }
            
            await pool.end();
        }, 1000);
        
    } catch (error) {
        console.error('Test failed:', error.message);
        await pool.end();
    }
}

testFullWorkflow();
