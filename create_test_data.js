const { Pool } = require('pg');

// Database connection
const pool = new Pool({
    connectionString: 'postgresql://postgres:123mert123@localhost:5000/deneme'
});

async function createTestData() {
    try {
        console.log('Creating test data for feedback system...');
        
        // Get some existing patients, treatment types and users
        const patients = await pool.query('SELECT patient_id FROM patients LIMIT 3');
        const treatmentTypes = await pool.query('SELECT treatment_type_id FROM treatment_types WHERE feedback_intervals IS NOT NULL AND array_length(feedback_intervals, 1) > 0 LIMIT 3');
        const doctors = await pool.query('SELECT user_id FROM users WHERE role = \'doctor\' LIMIT 1');
        
        if (patients.rows.length === 0) {
            console.log('No patients found. Please add some patients first.');
            return;
        }
        
        if (treatmentTypes.rows.length === 0) {
            console.log('No treatment types with feedback intervals found.');
            return;
        }
        
        if (doctors.rows.length === 0) {
            console.log('No doctors found. Please add a doctor first.');
            return;
        }
        
        // Create some completed treatments
        for (let i = 0; i < patients.rows.length; i++) {
            const patient = patients.rows[i];
            const treatmentType = treatmentTypes.rows[i % treatmentTypes.rows.length];
            const doctor = doctors.rows[0];
            
            // Create treatment
            const treatment = await pool.query(`
                INSERT INTO treatments (
                    patient_id, 
                    treatment_type_id, 
                    doctor_id, 
                    status, 
                    suggested_at, 
                    approved_at, 
                    completed_at,
                    tooth_count
                ) VALUES ($1, $2, $3, 'tamamlanan', NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '1 week', NOW() - INTERVAL '3 days', 1)
                RETURNING treatment_id
            `, [patient.patient_id, treatmentType.treatment_type_id, doctor.user_id]);
            
            console.log(`Created completed treatment ${treatment.rows[0].treatment_id} for patient ${patient.patient_id}`);
        }
        
        // Also create a treatment that was just completed today
        const recentTreatment = await pool.query(`
            INSERT INTO treatments (
                patient_id, 
                treatment_type_id, 
                doctor_id, 
                status, 
                suggested_at, 
                approved_at, 
                completed_at,
                tooth_count
            ) VALUES ($1, $2, $3, 'tamamlanan', NOW() - INTERVAL '1 week', NOW() - INTERVAL '3 days', NOW(), 1)
            RETURNING treatment_id
        `, [patients.rows[0].patient_id, treatmentTypes.rows[0].treatment_type_id, doctors.rows[0].user_id]);
        
        console.log(`Created today's completed treatment ${recentTreatment.rows[0].treatment_id}`);
        
        console.log('Test data created successfully!');
        console.log('The trigger should have automatically created feedback planning entries.');
        
        // Check feedback planning entries
        const feedbackPlanning = await pool.query('SELECT * FROM feedback_planning ORDER BY planned_date');
        console.log(`Found ${feedbackPlanning.rows.length} feedback planning entries:`);
        
        feedbackPlanning.rows.forEach(fp => {
            console.log(`- Treatment ${fp.treatment_id}, Interval: ${fp.interval}, Planned: ${fp.planned_date.toLocaleDateString()}, Completed: ${fp.is_completed}`);
        });
        
    } catch (error) {
        console.error('Failed to create test data:', error.message);
    } finally {
        await pool.end();
    }
}

createTestData();
