const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:123mert123@localhost:5000/deneme'
});

async function runMigration() {
    try {
        console.log('Running appointments status constraint migration...');
        
        // Read the migration file
        const migrationPath = path.join(__dirname, 'helpers', 'db', 'migrations', '20250807_1_update_appointments_status_constraint.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute the migration
        await pool.query(migrationSQL);
        
        console.log('Migration completed successfully!');
        console.log('Appointments status constraint updated to include: scheduled, attended, missed, completed');
        
    } catch (error) {
        console.error('Migration failed:', error.message);
    } finally {
        await pool.end();
    }
}

runMigration();
