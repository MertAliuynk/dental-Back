const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
    connectionString: 'postgresql://postgres:123mert123@localhost:5000/deneme'
});

async function fixFeedbackTrigger() {
    try {
        console.log('Fixing feedback trigger...');
        
        // Read the SQL file
        const sqlPath = path.join(__dirname, 'fix_feedback_trigger.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Execute the SQL
        await pool.query(sql);
        
        console.log('Feedback trigger fixed successfully!');
        
        // Check feedback planning entries
        const feedbackPlanning = await pool.query('SELECT * FROM feedback_planning ORDER BY planned_date');
        console.log(`Found ${feedbackPlanning.rows.length} feedback planning entries:`);
        
        feedbackPlanning.rows.forEach(fp => {
            console.log(`- Treatment ${fp.treatment_id}, Interval: ${fp.interval}, Planned: ${fp.planned_date.toLocaleDateString()}, Completed: ${fp.is_completed}`);
        });
        
    } catch (error) {
        console.error('Failed to fix trigger:', error.message);
    } finally {
        await pool.end();
    }
}

fixFeedbackTrigger();
