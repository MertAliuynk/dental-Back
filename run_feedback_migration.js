const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:123mert123@localhost:5000/deneme'
});

async function runFeedbackMigration() {
    try {
        console.log('Running feedback planning migration...');
        
        // Read the migration file
        const migrationPath = path.join(__dirname, 'helpers', 'db', 'migrations', '20250807_3_create_feedback_planning.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute the migration
        await pool.query(migrationSQL);
        
        console.log('Feedback planning migration completed successfully!');
        console.log('- feedback_planning table created');
        console.log('- Trigger for auto-creating feedback plans on treatment completion created');
        
    } catch (error) {
        console.error('Migration failed:', error.message);
    } finally {
        await pool.end();
    }
}

runFeedbackMigration();
